"use client";

/**
 * ═══════════════════════════════════════════════════════════════
 * Wave 5.2 — MapViewer Renderer
 * ═══════════════════════════════════════════════════════════════
 * MAP canvas type — renders a Leaflet map inside an iframe.
 * Parses lat/lng/zoom/markers from content (JSON or simple format).
 */

import { useMemo } from "react";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/store/canvasStore";

interface MapConfig {
  lat: number;
  lng: number;
  zoom: number;
  markers: Array<{ lat: number; lng: number; label?: string }>;
}

function parseMapContent(content: string): MapConfig {
  const defaults: MapConfig = { lat: 24.7136, lng: 46.6753, zoom: 6, markers: [] };
  if (!content.trim()) return defaults;

  try {
    // Try JSON first
    const parsed = JSON.parse(content);
    return {
      lat: parsed.lat ?? parsed.latitude ?? defaults.lat,
      lng: parsed.lng ?? parsed.longitude ?? defaults.lng,
      zoom: parsed.zoom ?? defaults.zoom,
      markers: Array.isArray(parsed.markers) ? parsed.markers : [],
    };
  } catch {
    // Fallback: parse lines like "lat: 24.7, lng: 46.6"
    const latMatch = content.match(/lat(?:itude)?:\s*([-\d.]+)/i);
    const lngMatch = content.match(/lng|longitude:\s*([-\d.]+)/i);
    const zoomMatch = content.match(/zoom:\s*(\d+)/i);
    return {
      lat: latMatch ? parseFloat(latMatch[1]) : defaults.lat,
      lng: lngMatch ? parseFloat(lngMatch[1]) : defaults.lng,
      zoom: zoomMatch ? parseInt(zoomMatch[1]) : defaults.zoom,
      markers: [],
    };
  }
}

export function MapViewer() {
  const { versions, currentVersionIndex, isStreaming } = useCanvasStore();
  const content = versions[currentVersionIndex]?.content || "";

  const config = useMemo(() => parseMapContent(content), [content]);

  const leafletHtml = useMemo(() => {
    const markersJS = config.markers
      .map(
        (m) =>
          `L.marker([${m.lat}, ${m.lng}]).addTo(map)${m.label ? `.bindPopup("${m.label.replace(/"/g, '\\"')}")` : ""};`
      )
      .join("\n      ");

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body { margin: 0; padding: 0; }
    #map { width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map').setView([${config.lat}, ${config.lng}], ${config.zoom});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    ${markersJS}
  </script>
</body>
</html>`;
  }, [config]);

  return (
    <div className="flex flex-col h-full" role="region" aria-label="عرض الخريطة">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-fuchsia-400/60" />
          <span className="text-xs text-white/50">
            {isStreaming ? "جاري التحميل..." : "خريطة تفاعلية"}
          </span>
        </div>
        <span className="text-[10px] text-white/30 font-mono">
          {config.lat.toFixed(4)}, {config.lng.toFixed(4)} z{config.zoom}
        </span>
      </div>

      {/* Map iframe */}
      <div className="flex-1 min-h-0 bg-zinc-900">
        {content.trim() ? (
          <iframe
            srcDoc={leafletHtml}
            title="Leaflet Map"
            sandbox="allow-scripts"
            className="w-full h-full border-0"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-white/30">
            <div className="text-center space-y-2">
              <MapPin className="w-10 h-10 mx-auto opacity-30" />
              <p className="text-sm">أضف إحداثيات لعرض الخريطة</p>
              <p className="text-[11px] text-white/20">
                {"{ \"lat\": 24.7, \"lng\": 46.6, \"zoom\": 10 }"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
