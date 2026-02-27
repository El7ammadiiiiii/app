// ========================================
// WebGL2 Renderer for Order Book Heatmap
// Manages context, programs, textures, draw calls
// Ported from TapeSurf renderer class C/D (740-*.js)
// ========================================

import {
  HEATMAP_VERTEX_SHADER,
  HEATMAP_FRAGMENT_SHADER,
  DENSITY_FRAGMENT_SHADER,
  OVERLAY_VERTEX_SHADER,
  OVERLAY_FRAGMENT_SHADER,
} from './shaders';
import {
  TextureData,
  HeatmapTheme,
  HeatmapSensitivity,
  HeatmapColumn,
  HeatmapTrade,
  VPVRLevel,
  DEFAULT_THEME,
  MAX_FPS,
} from './types';

interface ShaderProgram {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null>;
  attributes: Record<string, number>;
}

/**
 * WebGL2 Renderer — handles all GPU rendering for the heatmap
 */
export class HeatmapWebGLRenderer {
  private gl: WebGL2RenderingContext | null = null;
  private canvas: HTMLCanvasElement | null = null;

  // Shader programs
  private heatmapProgram: ShaderProgram | null = null;
  private densityProgram: ShaderProgram | null = null;
  private overlayProgram: ShaderProgram | null = null;

  // Geometry
  private quadVAO: WebGLVertexArrayObject | null = null;
  private quadVBO: WebGLBuffer | null = null;

  // Data textures (one per column)
  private columnTextures: Map<number, WebGLTexture> = new Map();
  private columnData: Map<number, HeatmapColumn> = new Map();

  // Overlay buffers
  private overlayVAO: WebGLVertexArrayObject | null = null;
  private overlayVBO: WebGLBuffer | null = null;

  // State
  private _theme: HeatmapTheme = DEFAULT_THEME;
  private _sensitivity: HeatmapSensitivity = { min: 0, max: 100 };
  private _viewport = { priceMin: 0, priceMax: 100000, timeMin: 0, timeMax: 1 };
  private _dpr: number = 1;
  private _width: number = 0;
  private _height: number = 0;
  private _grouping: number = 10;
  private _currentPrice: number = 0;
  private _animationId: number = 0;
  private _lastFrameTime: number = 0;
  private _frameInterval: number = 1000 / MAX_FPS;
  private _needsRedraw: boolean = true;
  private _isDestroyed: boolean = false;

  // Callbacks
  private _onFrame: (() => void) | null = null;

  // ============ INITIALIZATION ============

  init(canvas: HTMLCanvasElement): boolean {
    this.canvas = canvas;
    this._dpr = window.devicePixelRatio || 1;

    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
    });

    if (!gl) {
      console.error('[HeatmapRenderer] WebGL2 not supported');
      return false;
    }

    this.gl = gl;

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Compile shaders
    this.heatmapProgram = this.compileProgram(
      HEATMAP_VERTEX_SHADER,
      HEATMAP_FRAGMENT_SHADER,
      ['a_position'],
      [
        'u_resolution', 'u_priceMin', 'u_priceMax', 'u_grouping',
        'u_dataTexture', 'u_dataLength', 'u_columnIndex', 'u_textureWidth',
        'u_sensMin', 'u_sensMax',
        'u_bidColor', 'u_bidColor2', 'u_askColor', 'u_askColor2',
        'u_alpha',
      ]
    );

    this.densityProgram = this.compileProgram(
      HEATMAP_VERTEX_SHADER,
      DENSITY_FRAGMENT_SHADER,
      ['a_position'],
      [
        'u_resolution', 'u_priceMin', 'u_priceMax', 'u_grouping',
        'u_dataTexture', 'u_dataLength',
        'u_sensMin', 'u_sensMax',
        'u_bidColor', 'u_bidColor2', 'u_askColor', 'u_askColor2',
      ]
    );

    this.overlayProgram = this.compileProgram(
      OVERLAY_VERTEX_SHADER,
      OVERLAY_FRAGMENT_SHADER,
      ['a_position', 'a_color'],
      ['u_resolution']
    );

    if (!this.heatmapProgram || !this.overlayProgram) {
      console.error('[HeatmapRenderer] Shader compilation failed');
      return false;
    }

    // Create quad geometry (unit quad for each column)
    this.createQuadGeometry();

    // Create overlay buffers
    this.createOverlayBuffers();

    this.resize(canvas.clientWidth, canvas.clientHeight);

    return true;
  }

  // ============ SHADER COMPILATION ============

  private compileProgram(
    vertSrc: string,
    fragSrc: string,
    attribNames: string[],
    uniformNames: string[]
  ): ShaderProgram | null {
    const gl = this.gl!;

    const vert = this.compileShader(gl.VERTEX_SHADER, vertSrc);
    const frag = this.compileShader(gl.FRAGMENT_SHADER, fragSrc);
    if (!vert || !frag) return null;

    const program = gl.createProgram()!;
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('[HeatmapRenderer] Program link error:', gl.getProgramInfoLog(program));
      return null;
    }

    const uniforms: Record<string, WebGLUniformLocation | null> = {};
    for (const name of uniformNames) {
      uniforms[name] = gl.getUniformLocation(program, name);
    }

    const attributes: Record<string, number> = {};
    for (const name of attribNames) {
      attributes[name] = gl.getAttribLocation(program, name);
    }

    // Clean up shaders
    gl.deleteShader(vert);
    gl.deleteShader(frag);

    return { program, uniforms, attributes };
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    const gl = this.gl!;
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(
        `[HeatmapRenderer] Shader compile error (${type === gl.VERTEX_SHADER ? 'vert' : 'frag'}):`,
        gl.getShaderInfoLog(shader)
      );
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  // ============ GEOMETRY ============

  private createQuadGeometry(): void {
    const gl = this.gl!;

    // Unit quad (2 triangles)
    const vertices = new Float32Array([
      0, 0,  1, 0,  0, 1,
      0, 1,  1, 0,  1, 1,
    ]);

    this.quadVAO = gl.createVertexArray()!;
    gl.bindVertexArray(this.quadVAO);

    this.quadVBO = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // a_position
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
  }

  private createOverlayBuffers(): void {
    const gl = this.gl!;

    this.overlayVAO = gl.createVertexArray()!;
    gl.bindVertexArray(this.overlayVAO);

    this.overlayVBO = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.overlayVBO);

    // a_position (2 floats) + a_color (4 floats) = 6 floats per vertex
    const stride = 6 * 4;
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, stride, 2 * 4);

    gl.bindVertexArray(null);
  }

  // ============ DATA TEXTURE MANAGEMENT ============

  /**
   * Upload a column's texture data to GPU
   * Each column = one snapshot in time = one order book state
   */
  uploadColumn(columnIndex: number, column: HeatmapColumn): void {
    const gl = this.gl;
    if (!gl) return;

    // Delete old texture if exists
    const oldTex = this.columnTextures.get(columnIndex);
    if (oldTex) gl.deleteTexture(oldTex);

    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);

    // Upload as 1D texture (width = dataLength * 2, height = 1)
    // Format: RG32F — but we use R32F with interleaved price/amount
    const width = column.textureData.length;
    
    if (width === 0) {
      gl.deleteTexture(tex);
      return;
    }

    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R32F,
      width,
      1,
      0,
      gl.RED,
      gl.FLOAT,
      column.textureData
    );

    // NEAREST filtering (no interpolation between price levels)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.columnTextures.set(columnIndex, tex);
    this.columnData.set(columnIndex, column);
    this._needsRedraw = true;
  }

  /**
   * Remove old columns beyond the visible range
   */
  pruneColumns(keepFrom: number, keepTo: number): void {
    const gl = this.gl;
    if (!gl) return;

    for (const [idx, tex] of this.columnTextures) {
      if (idx < keepFrom || idx > keepTo) {
        gl.deleteTexture(tex);
        this.columnTextures.delete(idx);
        this.columnData.delete(idx);
      }
    }
  }

  // ============ DRAWING ============

  /**
   * Main draw frame
   */
  draw(
    columns: HeatmapColumn[],
    trades: HeatmapTrade[],
    vpvrLevels: VPVRLevel[],
    showVPVR: boolean,
    showTrades: boolean
  ): void {
    const gl = this.gl;
    if (!gl || !this.canvas) return;

    // Clear
    const bg = this._theme.bgColor;
    gl.clearColor(bg[0], bg[1], bg[2], bg[3]);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Draw heatmap columns
    this.drawHeatmapColumns(columns);

    // Draw density bar for latest column (rightmost)
    if (columns.length > 0) {
      const latest = columns[columns.length - 1];
      this.drawDensityBar(latest);
    }

    // Draw overlays using Canvas 2D overlay
    // (VPVR, trades, axes are handled in the React component's canvas overlay)
  }

  /**
   * Draw all visible heatmap columns
   */
  private drawHeatmapColumns(columns: HeatmapColumn[]): void {
    const gl = this.gl!;
    const prog = this.heatmapProgram;
    if (!prog || columns.length === 0) return;

    gl.useProgram(prog.program);
    gl.bindVertexArray(this.quadVAO);

    // Set common uniforms
    gl.uniform2f(prog.uniforms.u_resolution!, this._width, this._height);
    gl.uniform1f(prog.uniforms.u_priceMin!, this._viewport.priceMin);
    gl.uniform1f(prog.uniforms.u_priceMax!, this._viewport.priceMax);
    gl.uniform1f(prog.uniforms.u_grouping!, this._grouping);
    gl.uniform1f(prog.uniforms.u_sensMin!, this._sensitivity.min);
    gl.uniform1f(prog.uniforms.u_sensMax!, this._sensitivity.max);
    gl.uniform1f(prog.uniforms.u_alpha!, 1.0);

    // Set theme colors
    gl.uniform4fv(prog.uniforms.u_bidColor!, this._theme.bidColor);
    gl.uniform4fv(prog.uniforms.u_bidColor2!, this._theme.bidColor2);
    gl.uniform4fv(prog.uniforms.u_askColor!, this._theme.askColor);
    gl.uniform4fv(prog.uniforms.u_askColor2!, this._theme.askColor2);

    // Calculate column width in pixels
    const heatmapWidth = this._width * 0.85; // 85% for heatmap, 15% for density
    const columnWidth = heatmapWidth / Math.max(columns.length, 1);

    // Draw each column
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      const tex = this.columnTextures.get(col.textureOffset);
      if (!tex) continue;

      // Bind data texture
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(prog.uniforms.u_dataTexture!, 0);
      gl.uniform1i(prog.uniforms.u_dataLength!, col.metadata.bidLevels + col.metadata.askLevels);
      gl.uniform1i(prog.uniforms.u_columnIndex!, 0);
      gl.uniform1i(prog.uniforms.u_textureWidth!, col.textureData.length);

      // Set column position via viewport transform
      // We modify the quad's transform through the shader
      const x = (i / columns.length) * heatmapWidth;
      gl.viewport(
        Math.round(x * this._dpr),
        0,
        Math.round(columnWidth * this._dpr) + 1,
        Math.round(this._height * this._dpr)
      );

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    // Restore full viewport
    gl.viewport(0, 0, Math.round(this._width * this._dpr), Math.round(this._height * this._dpr));
    gl.bindVertexArray(null);
  }

  /**
   * Draw density bar on the right side for the current order book
   */
  private drawDensityBar(column: HeatmapColumn): void {
    const gl = this.gl!;
    const prog = this.densityProgram;
    if (!prog) return;

    const tex = this.columnTextures.get(column.textureOffset);
    if (!tex) return;

    gl.useProgram(prog.program);
    gl.bindVertexArray(this.quadVAO);

    // Set uniforms
    gl.uniform2f(prog.uniforms.u_resolution!, this._width, this._height);
    gl.uniform1f(prog.uniforms.u_priceMin!, this._viewport.priceMin);
    gl.uniform1f(prog.uniforms.u_priceMax!, this._viewport.priceMax);
    gl.uniform1f(prog.uniforms.u_grouping!, this._grouping);
    gl.uniform1f(prog.uniforms.u_sensMin!, this._sensitivity.min);
    gl.uniform1f(prog.uniforms.u_sensMax!, this._sensitivity.max);

    gl.uniform4fv(prog.uniforms.u_bidColor!, this._theme.bidColor);
    gl.uniform4fv(prog.uniforms.u_bidColor2!, this._theme.bidColor2);
    gl.uniform4fv(prog.uniforms.u_askColor!, this._theme.askColor);
    gl.uniform4fv(prog.uniforms.u_askColor2!, this._theme.askColor2);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(prog.uniforms.u_dataTexture!, 0);
    gl.uniform1i(prog.uniforms.u_dataLength!, column.metadata.bidLevels + column.metadata.askLevels);

    // Density bar occupies the rightmost 15%
    const densityX = Math.round(this._width * 0.85 * this._dpr);
    const densityW = Math.round(this._width * 0.15 * this._dpr);
    gl.viewport(densityX, 0, densityW, Math.round(this._height * this._dpr));

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Restore
    gl.viewport(0, 0, Math.round(this._width * this._dpr), Math.round(this._height * this._dpr));
    gl.bindVertexArray(null);
  }

  // ============ OVERLAY DRAWING (2D Canvas) ============

  /**
   * Draw overlays on a 2D canvas (layered on top of WebGL canvas)
   * Handles: price axis, time axis, current price line, VPVR, trades, crosshair
   */
  drawOverlays(
    ctx: CanvasRenderingContext2D,
    columns: HeatmapColumn[],
    trades: HeatmapTrade[],
    vpvrLevels: VPVRLevel[],
    showVPVR: boolean,
    showTrades: boolean,
    mouseX: number,
    mouseY: number,
    isHovering: boolean
  ): void {
    const w = this._width;
    const h = this._height;
    const heatmapW = w * 0.85;

    ctx.clearRect(0, 0, w, h);

    // === Price Axis (left side) ===
    this.drawPriceAxis(ctx, w, h);

    // === Time Axis (bottom) ===
    this.drawTimeAxis(ctx, columns, heatmapW, h);

    // === Current Price Line ===
    this.drawPriceLine(ctx, heatmapW, h);

    // === Volume Bars (amounts) on each row ===
    if (columns.length > 0) {
      this.drawAmountLabels(ctx, columns[columns.length - 1], heatmapW, h);
    }

    // === VPVR ===
    if (showVPVR && vpvrLevels.length > 0) {
      this.drawVPVR(ctx, vpvrLevels, heatmapW, h);
    }

    // === Trades ===
    if (showTrades && trades.length > 0) {
      this.drawTrades(ctx, trades, columns, heatmapW, h);
    }

    // === Crosshair ===
    if (isHovering && mouseX >= 0 && mouseY >= 0) {
      this.drawCrosshair(ctx, mouseX, mouseY, w, h, heatmapW);
    }

    // === Aggregation Label ===
    if (columns.length > 0) {
      const latest = columns[columns.length - 1];
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = 'bold 11px "IBM Plex Mono", monospace';
      ctx.fillText(
        `Aggregated ${latest.metadata.exchangeCount} markets`,
        8,
        16
      );
    }
  }

  private drawPriceAxis(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const { priceMin, priceMax } = this._viewport;
    const range = priceMax - priceMin;
    if (range <= 0) return;

    // Determine step size for labels
    const targetLabels = Math.floor(h / 30);
    const rawStep = range / targetLabels;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const step = Math.ceil(rawStep / magnitude) * magnitude;

    ctx.fillStyle = 'rgba(200, 200, 200, 0.8)';
    ctx.font = '10px "IBM Plex Mono", monospace';
    ctx.textAlign = 'left';

    const firstPrice = Math.ceil(priceMin / step) * step;

    for (let price = firstPrice; price <= priceMax; price += step) {
      const y = h - ((price - priceMin) / range) * h;
      if (y < 10 || y > h - 10) continue;

      // Grid line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w * 0.85, y);
      ctx.stroke();

      // Price label
      ctx.fillText(this.formatPrice(price), 4, y - 2);
    }
  }

  private drawTimeAxis(
    ctx: CanvasRenderingContext2D,
    columns: HeatmapColumn[],
    heatmapW: number,
    h: number
  ): void {
    if (columns.length === 0) return;

    const colWidth = heatmapW / columns.length;
    ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
    ctx.font = '9px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';

    // Show time labels every ~100px
    const labelEvery = Math.max(1, Math.floor(100 / colWidth));
    
    for (let i = 0; i < columns.length; i += labelEvery) {
      const x = i * colWidth + colWidth / 2;
      const time = new Date(columns[i].timestamp);
      const label = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}`;
      ctx.fillText(label, x, h - 4);
    }
  }

  private drawPriceLine(ctx: CanvasRenderingContext2D, heatmapW: number, h: number): void {
    if (this._currentPrice <= 0) return;

    const { priceMin, priceMax } = this._viewport;
    const range = priceMax - priceMin;
    if (range <= 0) return;

    const y = h - ((this._currentPrice - priceMin) / range) * h;

    if (y < 0 || y > h) return;

    // Yellow price line
    ctx.strokeStyle = 'rgba(255, 217, 0, 0.8)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 2]);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(heatmapW, y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Price label badge
    ctx.fillStyle = 'rgba(255, 217, 0, 0.9)';
    const label = this.formatPrice(this._currentPrice);
    const textWidth = ctx.measureText(label).width;
    ctx.fillRect(heatmapW + 2, y - 8, textWidth + 8, 16);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 10px "IBM Plex Mono", monospace';
    ctx.fillText(label, heatmapW + 6, y + 4);
  }

  private drawAmountLabels(
    ctx: CanvasRenderingContext2D,
    column: HeatmapColumn,
    heatmapW: number,
    h: number
  ): void {
    const { priceMin, priceMax } = this._viewport;
    const range = priceMax - priceMin;
    if (range <= 0) return;

    const data = column.textureData;
    if (!data || data.length === 0) return;

    ctx.font = '9px "IBM Plex Mono", monospace';
    ctx.textAlign = 'right';

    // Draw amount labels in the density bar area
    for (let i = 0; i < data.length; i += 2) {
      const price = data[i];
      const amount = data[i + 1];
      if (Math.abs(amount) < 0.01) continue;

      const y = h - ((price - priceMin) / range) * h;
      if (y < 5 || y > h - 5) continue;

      const isBid = amount < 0;
      ctx.fillStyle = isBid
        ? 'rgba(100, 255, 180, 0.7)'
        : 'rgba(255, 130, 100, 0.7)';

      const label = Math.abs(amount).toFixed(1);
      ctx.fillText(label, heatmapW - 4, y + 3);
    }
  }

  private drawVPVR(
    ctx: CanvasRenderingContext2D,
    levels: VPVRLevel[],
    heatmapW: number,
    h: number
  ): void {
    const { priceMin, priceMax } = this._viewport;
    const range = priceMax - priceMin;
    if (range <= 0 || levels.length === 0) return;

    // Find POC (Point of Control)
    let maxVolume = 0;
    for (const level of levels) {
      if (level.totalVolume > maxVolume) maxVolume = level.totalVolume;
    }
    if (maxVolume <= 0) return;

    const maxBarWidth = heatmapW * 0.15;
    const barHeight = Math.max(1, (this._grouping / range) * h);

    for (const level of levels) {
      const y = h - ((level.price - priceMin) / range) * h;
      if (y < 0 || y > h) continue;

      const centerX = heatmapW * 0.5;
      
      // Bid bar (left, green)
      const bidWidth = (level.bidVolume / maxVolume) * maxBarWidth;
      ctx.fillStyle = 'rgba(0, 200, 120, 0.25)';
      ctx.fillRect(centerX - bidWidth, y - barHeight / 2, bidWidth, barHeight);

      // Ask bar (right, red)
      const askWidth = (level.askVolume / maxVolume) * maxBarWidth;
      ctx.fillStyle = 'rgba(200, 60, 40, 0.25)';
      ctx.fillRect(centerX, y - barHeight / 2, askWidth, barHeight);
    }
  }

  private drawTrades(
    ctx: CanvasRenderingContext2D,
    trades: HeatmapTrade[],
    columns: HeatmapColumn[],
    heatmapW: number,
    h: number
  ): void {
    const { priceMin, priceMax } = this._viewport;
    const range = priceMax - priceMin;
    if (range <= 0 || columns.length === 0) return;

    const timeMin = columns[0].timestamp;
    const timeMax = columns[columns.length - 1].timestamp;
    const timeRange = timeMax - timeMin;
    if (timeRange <= 0) return;

    for (const trade of trades) {
      const x = ((trade.timestamp - timeMin) / timeRange) * heatmapW;
      const y = h - ((trade.price - priceMin) / range) * h;

      if (x < 0 || x > heatmapW || y < 0 || y > h) continue;

      // Circle size proportional to trade amount (clamped)
      const radius = Math.min(8, Math.max(2, Math.sqrt(trade.amount) * 2));

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = trade.side === 'buy'
        ? 'rgba(0, 255, 150, 0.6)'
        : 'rgba(255, 80, 60, 0.6)';
      ctx.fill();
    }
  }

  private drawCrosshair(
    ctx: CanvasRenderingContext2D,
    mouseX: number,
    mouseY: number,
    w: number,
    h: number,
    heatmapW: number
  ): void {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 2]);

    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(0, mouseY);
    ctx.lineTo(w, mouseY);
    ctx.stroke();

    // Vertical line (only in heatmap area)
    if (mouseX < heatmapW) {
      ctx.beginPath();
      ctx.moveTo(mouseX, 0);
      ctx.lineTo(mouseX, h);
      ctx.stroke();
    }

    ctx.setLineDash([]);

    // Price at cursor
    const { priceMin, priceMax } = this._viewport;
    const range = priceMax - priceMin;
    if (range > 0) {
      const price = priceMax - (mouseY / h) * range;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '10px "IBM Plex Mono", monospace';
      ctx.fillText(this.formatPrice(price), mouseX + 8, mouseY - 4);
    }
  }

  // ============ SETTERS ============

  set theme(t: HeatmapTheme) {
    this._theme = t;
    this._needsRedraw = true;
  }

  set sensitivity(s: HeatmapSensitivity) {
    this._sensitivity = s;
    this._needsRedraw = true;
  }

  set viewport(v: { priceMin: number; priceMax: number; timeMin: number; timeMax: number }) {
    this._viewport = v;
    this._needsRedraw = true;
  }

  set grouping(g: number) {
    this._grouping = g;
    this._needsRedraw = true;
  }

  set currentPrice(p: number) {
    this._currentPrice = p;
    this._needsRedraw = true;
  }

  get needsRedraw(): boolean {
    return this._needsRedraw;
  }

  markRedrawn(): void {
    this._needsRedraw = false;
  }

  requestRedraw(): void {
    this._needsRedraw = true;
  }

  // ============ RESIZE ============

  resize(width: number, height: number): void {
    if (!this.canvas || !this.gl) return;

    this._dpr = window.devicePixelRatio || 1;
    this._width = width;
    this._height = height;

    this.canvas.width = Math.round(width * this._dpr);
    this.canvas.height = Math.round(height * this._dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this._needsRedraw = true;
  }

  get width(): number { return this._width; }
  get height(): number { return this._height; }

  // ============ UTILITIES ============

  private formatPrice(price: number): string {
    if (price >= 10000) return price.toFixed(0);
    if (price >= 1000) return price.toFixed(1);
    if (price >= 100) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(6);
  }

  // ============ CLEANUP ============

  destroy(): void {
    this._isDestroyed = true;

    if (this._animationId) {
      cancelAnimationFrame(this._animationId);
    }

    const gl = this.gl;
    if (!gl) return;

    // Delete textures
    for (const tex of this.columnTextures.values()) {
      gl.deleteTexture(tex);
    }
    this.columnTextures.clear();
    this.columnData.clear();

    // Delete buffers
    if (this.quadVBO) gl.deleteBuffer(this.quadVBO);
    if (this.overlayVBO) gl.deleteBuffer(this.overlayVBO);

    // Delete VAOs
    if (this.quadVAO) gl.deleteVertexArray(this.quadVAO);
    if (this.overlayVAO) gl.deleteVertexArray(this.overlayVAO);

    // Delete programs
    if (this.heatmapProgram) gl.deleteProgram(this.heatmapProgram.program);
    if (this.densityProgram) gl.deleteProgram(this.densityProgram.program);
    if (this.overlayProgram) gl.deleteProgram(this.overlayProgram.program);

    this.gl = null;
    this.canvas = null;
  }
}
