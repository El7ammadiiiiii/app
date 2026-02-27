"use client";

/**
 * ═══════════════════════════════════════════════════════════════
 * Wave 5.2 — EmailEditor Renderer
 * ═══════════════════════════════════════════════════════════════
 * EMAIL canvas type with To/CC/BCC fields + rich body editor.
 */

import { useState, useCallback } from "react";
import { Mail, Send, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/store/canvasStore";
import { TextEditor } from "../TextEditor";

interface EmailFields {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
}

export function EmailEditor() {
  const { versions, currentVersionIndex, isStreaming } = useCanvasStore();
  const content = versions[currentVersionIndex]?.content || "";

  // Parse email fields from content header (YAML-like front-matter)
  const parseFields = useCallback((): { fields: EmailFields; body: string } => {
    const defaults: EmailFields = { to: "", cc: "", bcc: "", subject: "" };
    if (!content) return { fields: defaults, body: "" };
    // Look for header fields like "To: ...\nCC: ...\n---\nbody"
    const headerMatch = content.match(
      /^(?:To:\s*(.*?)\n)?(?:CC:\s*(.*?)\n)?(?:BCC:\s*(.*?)\n)?(?:Subject:\s*(.*?)\n)?---\n([\s\S]*)$/i
    );
    if (headerMatch) {
      return {
        fields: {
          to: headerMatch[1]?.trim() || "",
          cc: headerMatch[2]?.trim() || "",
          bcc: headerMatch[3]?.trim() || "",
          subject: headerMatch[4]?.trim() || "",
        },
        body: headerMatch[5] || "",
      };
    }
    return { fields: defaults, body: content };
  }, [content]);

  const { fields } = parseFields();
  const [localFields, setLocalFields] = useState<EmailFields>(fields);
  const [copied, setCopied] = useState(false);
  const [showBcc, setShowBcc] = useState(!!fields.bcc);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateField = (key: keyof EmailFields, value: string) => {
    setLocalFields((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex flex-col h-full" role="form" aria-label="محرر البريد الإلكتروني">
      {/* Email header fields */}
      <div className="border-b border-white/[0.06] bg-white/[0.02] px-4 py-3 space-y-2">
        {/* To */}
        <div className="flex items-center gap-3">
          <label className="text-xs text-white/50 w-12 text-left shrink-0" htmlFor="email-to">
            إلى:
          </label>
          <input
            id="email-to"
            type="text"
            value={localFields.to}
            onChange={(e) => updateField("to", e.target.value)}
            placeholder="recipient@example.com"
            className="flex-1 bg-transparent text-sm text-white/90 placeholder:text-white/20 outline-none"
            dir="ltr"
          />
          {!showBcc && (
            <button
              onClick={() => setShowBcc(true)}
              className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
            >
              BCC
            </button>
          )}
        </div>

        {/* CC */}
        <div className="flex items-center gap-3">
          <label className="text-xs text-white/50 w-12 text-left shrink-0" htmlFor="email-cc">
            CC:
          </label>
          <input
            id="email-cc"
            type="text"
            value={localFields.cc}
            onChange={(e) => updateField("cc", e.target.value)}
            placeholder="cc@example.com"
            className="flex-1 bg-transparent text-sm text-white/90 placeholder:text-white/20 outline-none"
            dir="ltr"
          />
        </div>

        {/* BCC (collapsible) */}
        {showBcc && (
          <div className="flex items-center gap-3">
            <label className="text-xs text-white/50 w-12 text-left shrink-0" htmlFor="email-bcc">
              BCC:
            </label>
            <input
              id="email-bcc"
              type="text"
              value={localFields.bcc}
              onChange={(e) => updateField("bcc", e.target.value)}
              placeholder="bcc@example.com"
              className="flex-1 bg-transparent text-sm text-white/90 placeholder:text-white/20 outline-none"
              dir="ltr"
            />
          </div>
        )}

        {/* Subject */}
        <div className="flex items-center gap-3">
          <label className="text-xs text-white/50 w-12 text-left shrink-0" htmlFor="email-subject">
            الموضوع:
          </label>
          <input
            id="email-subject"
            type="text"
            value={localFields.subject}
            onChange={(e) => updateField("subject", e.target.value)}
            placeholder="موضوع البريد"
            className="flex-1 bg-transparent text-sm font-medium text-white/90 placeholder:text-white/20 outline-none"
          />
        </div>
      </div>

      {/* Email body — uses the existing TextEditor */}
      <div className="flex-1 min-h-0">
        <TextEditor />
      </div>

      {/* Bottom action bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-red-400/60" />
          <span className="text-[11px] text-white/40">
            {isStreaming ? "جاري الإنشاء..." : "بريد إلكتروني"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-white/90 hover:bg-white/[0.06] transition-colors"
            aria-label="نسخ البريد"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>نسخ</span>
          </button>
          <button
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
            aria-label="إرسال البريد"
          >
            <Send className="w-3.5 h-3.5" />
            <span>إرسال</span>
          </button>
        </div>
      </div>
    </div>
  );
}
