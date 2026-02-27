/**
 * ═══════════════════════════════════════════════════════════════
 * Wave 5.4 — Public Artifact Page (readonly)
 * ═══════════════════════════════════════════════════════════════
 * /artifacts/[uuid] — renders a published canvas artifact in read-only mode.
 */

import { notFound } from "next/navigation";

async function fetchArtifact(uuid: string) {
  try {
    // Fetch from internal API
    const origin = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3099";
    const res = await fetch(`${origin}/api/canvas/publish?id=${uuid}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function ArtifactPage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { uuid } = await params;
  const artifact = await fetchArtifact(uuid);

  if (!artifact) {
    notFound();
  }

  const isCode = artifact.type === "CODE" || artifact.type === "DATA_VIZ";
  const publishDate = new Date(artifact.publishedAt).toLocaleDateString("ar", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      {/* Header */}
      <header className="border-b border-white/[0.06] bg-white/[0.02] backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">{artifact.title}</h1>
            <p className="text-xs text-white/40 mt-0.5">
              {publishDate} · {artifact.type} · {artifact.language}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-white/20 px-2 py-1 bg-white/[0.04] rounded-lg">
              {uuid}
            </span>
            <a
              href="/chat"
              className="px-4 py-2 text-xs font-medium bg-teal-600 hover:bg-teal-500 rounded-xl transition-colors"
            >
              فتح CCWAYS
            </a>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {isCode ? (
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06]">
              <span className="text-xs text-white/50 font-mono">{artifact.language}</span>
            </div>
            <pre className="p-6 overflow-x-auto">
              <code className="text-sm font-mono text-white/80 leading-relaxed">
                {artifact.content}
              </code>
            </pre>
          </div>
        ) : (
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 prose prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-white/80 leading-relaxed">
              {artifact.content}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] mt-16">
        <div className="max-w-5xl mx-auto px-6 py-6 text-center">
          <p className="text-xs text-white/20">
            تمت المشاركة عبر CCWAYS Canvas
          </p>
        </div>
      </footer>
    </div>
  );
}
