// ========================================
// WebGL2 GLSL ES 3.0 Shaders for Order Book Heatmap
// Ported from TapeSurf/Okotoki reference (740-*.js)
// ========================================

// ---- HEATMAP VERTEX SHADER ----
// Renders each column of the heatmap as a quad
// Performs binary search in price texture to find amount at each row
export const HEATMAP_VERTEX_SHADER = `#version 300 es
precision highp float;
precision highp int;

// Quad vertex position (0,0 to 1,1)
in vec2 a_position;

// Per-instance: column X position and width
in float a_columnX;
in float a_columnWidth;

// Uniforms
uniform vec2 u_resolution;
uniform float u_priceMin;
uniform float u_priceMax;
uniform float u_grouping;

// Data texture containing [price, amount] pairs for this column
uniform sampler2D u_dataTexture;
uniform int u_dataLength;
uniform int u_columnIndex;
uniform int u_textureWidth;

out vec2 v_uv;
out float v_price;
flat out int v_columnIdx;

void main() {
  // Map quad position to screen coordinates
  float x = a_columnX + a_position.x * a_columnWidth;
  float y = a_position.y;
  
  // Convert to clip space (-1 to 1)
  vec2 clipPos = vec2(
    (x / u_resolution.x) * 2.0 - 1.0,
    y * 2.0 - 1.0
  );
  
  gl_Position = vec4(clipPos, 0.0, 1.0);
  v_uv = a_position;
  v_price = mix(u_priceMin, u_priceMax, a_position.y);
  v_columnIdx = u_columnIndex;
}
`;

// ---- HEATMAP FRAGMENT SHADER (Square Mode) ----
// Colors each pixel based on the order book amount at that price level
// Uses binary search in data texture to find the correct level
export const HEATMAP_FRAGMENT_SHADER = `#version 300 es
precision highp float;
precision highp int;

in vec2 v_uv;
in float v_price;
flat in int v_columnIdx;

// Data texture: R=price, G=amount (negative=bid, positive=ask)
uniform sampler2D u_dataTexture;
uniform int u_dataLength;
uniform int u_columnIndex;
uniform int u_textureWidth;

// Sensitivity range
uniform float u_sensMin;
uniform float u_sensMax;

// Colors (RGBA normalized)
uniform vec4 u_bidColor;     // green base
uniform vec4 u_bidColor2;    // green intense
uniform vec4 u_askColor;     // red base  
uniform vec4 u_askColor2;    // red intense

// Grouping for cell boundary detection
uniform float u_grouping;
uniform float u_priceMin;
uniform float u_priceMax;
uniform float u_alpha;

out vec4 fragColor;

/**
 * Binary search in the data texture to find the amount at a given price
 * Data is sorted by price ascending
 * Returns the amount (negative=bid, positive=ask) or 0 if not found
 */
float findAmount(float targetPrice) {
  if (u_dataLength <= 0) return 0.0;
  
  int lo = 0;
  int hi = u_dataLength - 1;
  float halfGrouping = u_grouping * 0.5;
  
  // Binary search
  while (lo <= hi) {
    int mid = (lo + hi) / 2;
    // For single-column mode, just use mid directly
    vec4 texel = texelFetch(u_dataTexture, ivec2(mid * 2, 0), 0);
    float price = texel.r;
    
    if (abs(targetPrice - price) < halfGrouping) {
      // Found the level — read amount from next texel
      vec4 amountTexel = texelFetch(u_dataTexture, ivec2(mid * 2 + 1, 0), 0);
      return amountTexel.r;
    } else if (targetPrice < price) {
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }
  
  return 0.0;
}

void main() {
  float amount = findAmount(v_price);
  
  if (abs(amount) < 0.0001) {
    fragColor = vec4(0.0, 0.0, 0.0, 0.0);
    return;
  }
  
  float absAmount = abs(amount);
  float sensRange = u_sensMax - u_sensMin;
  
  // Cell alpha based on sensitivity range
  // TapeSurf: clamp((abs(amount) - sens_min) / sens_range, 0.0, 1.0)
  float cellAlpha = clamp((absAmount - u_sensMin) / sensRange, 0.0, 1.0);
  
  // Choose bid or ask colors
  vec4 color1 = amount < 0.0 ? u_bidColor : u_askColor;    // base
  vec4 color2 = amount < 0.0 ? u_bidColor2 : u_askColor2;  // intense
  
  // Two-color gradient: base → intense based on amount
  // TapeSurf: t = clamp((abs(amount) - sensMin - sensRange/2) / sensRange, 0, 1)
  float t = clamp((absAmount - u_sensMin - sensRange * 0.5) / sensRange, 0.0, 1.0);
  vec4 color = mix(color1, color2, t);
  
  // Cell edge darkening (subtle grid lines)
  float priceInCell = mod(v_price, u_grouping) / u_grouping;
  float edgeFade = smoothstep(0.0, 0.05, priceInCell) * smoothstep(1.0, 0.95, priceInCell);
  
  fragColor = vec4(color.rgb, color.a * cellAlpha * u_alpha * edgeFade);
}
`;

// ---- DENSITY FRAGMENT SHADER ----
// Gaussian kernel density estimation for the current order book depth
// Shows smooth color density on the right side of the heatmap
export const DENSITY_FRAGMENT_SHADER = `#version 300 es
precision highp float;
precision highp int;

in vec2 v_uv;
in float v_price;

uniform sampler2D u_dataTexture;
uniform int u_dataLength;

uniform float u_sensMin;
uniform float u_sensMax;
uniform float u_grouping;
uniform float u_priceMin;
uniform float u_priceMax;

uniform vec4 u_bidColor;
uniform vec4 u_bidColor2;
uniform vec4 u_askColor;
uniform vec4 u_askColor2;

out vec4 fragColor;

const float BANDWIDTH = 0.25;
const int MAX_STEPS = 32;
const float POW_SCALE = 0.5;

/**
 * Gaussian weight function
 */
float gaussianWeight(float distance, float bandwidth) {
  float d = distance / bandwidth;
  return exp(-0.5 * d * d);
}

void main() {
  if (u_dataLength <= 0) {
    fragColor = vec4(0.0);
    return;
  }
  
  float totalWeight = 0.0;
  float weightedAmount = 0.0;
  float maxLocalAmount = 0.0;
  float dominantSign = 0.0;
  float dominantWeight = 0.0;
  
  // Sample nearby price levels with Gaussian weighting
  for (int i = 0; i < u_dataLength && i < MAX_STEPS * 2; i++) {
    vec4 texel = texelFetch(u_dataTexture, ivec2(i * 2, 0), 0);
    float levelPrice = texel.r;
    vec4 amountTexel = texelFetch(u_dataTexture, ivec2(i * 2 + 1, 0), 0);
    float levelAmount = amountTexel.r;
    
    // Normalized distance in grouping units
    float dist = abs(v_price - levelPrice) / u_grouping;
    
    if (dist > float(MAX_STEPS)) continue;
    
    float w = gaussianWeight(dist, BANDWIDTH * float(MAX_STEPS));
    totalWeight += w;
    weightedAmount += w * abs(levelAmount);
    maxLocalAmount = max(maxLocalAmount, abs(levelAmount));
    
    // Track dominant side (bid vs ask)
    if (w > dominantWeight) {
      dominantWeight = w;
      dominantSign = sign(levelAmount);
    }
  }
  
  if (totalWeight < 0.001) {
    fragColor = vec4(0.0);
    return;
  }
  
  float density = weightedAmount / totalWeight;
  
  // Normalize with power scaling
  float sensRange = u_sensMax - u_sensMin;
  float normalizedDensity = clamp((density - u_sensMin) / sensRange, 0.0, 1.0);
  normalizedDensity = pow(normalizedDensity, POW_SCALE);
  
  // Color based on dominant side
  vec4 color1 = dominantSign < 0.0 ? u_bidColor : u_askColor;
  vec4 color2 = dominantSign < 0.0 ? u_bidColor2 : u_askColor2;
  
  float t = clamp(normalizedDensity * 2.0 - 0.5, 0.0, 1.0);
  vec4 color = mix(color1, color2, t);
  
  fragColor = vec4(color.rgb, normalizedDensity * 0.9);
}
`;

// ---- OVERLAY VERTEX SHADER ----
// Simple pass-through for 2D overlays (VPVR bars, trades, axes)
export const OVERLAY_VERTEX_SHADER = `#version 300 es
precision highp float;
precision highp int;

in vec2 a_position;
in vec4 a_color;

uniform vec2 u_resolution;

out vec4 v_color;

void main() {
  vec2 clipPos = (a_position / u_resolution) * 2.0 - 1.0;
  gl_Position = vec4(clipPos, 0.0, 1.0);
  v_color = a_color;
  gl_PointSize = 4.0;
}
`;

// ---- OVERLAY FRAGMENT SHADER ----
export const OVERLAY_FRAGMENT_SHADER = `#version 300 es
precision highp float;
precision highp int;

in vec4 v_color;
out vec4 fragColor;

void main() {
  fragColor = v_color;
}
`;
