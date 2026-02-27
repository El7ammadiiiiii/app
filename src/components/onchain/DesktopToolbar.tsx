/**
 * DesktopToolbar — Full toolbar for desktop (≥768px)
 * cways-tracker toolbar: undo, redo, display options, download, filters
 * Hidden on mobile via parent's `hidden md:flex`
 */

"use client";

import React, { useState } from "react";
import { useTracerStore } from "@/lib/onchain/tracer-store";
import type { GraphDisplayOptions } from "@/lib/onchain/tracer-types";

export function DesktopToolbar() {
  const undo = useTracerStore((s) => s.undo);
  const redo = useTracerStore((s) => s.redo);
  const undoStack = useTracerStore((s) => s.undoStack);
  const redoStack = useTracerStore((s) => s.redoStack);
  const displayOptions = useTracerStore((s) => s.displayOptions);
  const setDisplayOptions = useTracerStore((s) => s.setDisplayOptions);
  const isPopulating = useTracerStore((s) => s.isPopulating);
  const title = useTracerStore((s) => s.title);
  const setTitle = useTracerStore((s) => s.setTitle);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  const handleDownload = () => {
    // Will be implemented with html2canvas
    const svgEl = document.querySelector<SVGSVGElement>("#tracer-graph-svg");
    if (!svgEl) return;

    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svgEl);
    const blob = new Blob([svgStr], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trace-${title || "export"}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleOption = (key: keyof GraphDisplayOptions) => {
    setDisplayOptions({ [key]: !displayOptions[key] });
  };

  return (
    <>
      {/* Left section: Title */}
      <div className="flex items-center gap-3 min-w-0">
        <img
          src="/icons/tracer/trace_address_icon_1.svg"
          alt=""
          className="h-5 w-5 opacity-70 flex-shrink-0"
        />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-transparent text-slate-200 text-sm font-light border-none outline-none truncate max-w-[200px] placeholder:text-slate-500"
          placeholder="Untitled Trace"
        />
        {isPopulating && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </div>
        )}
      </div>

      {/* Center section: Undo / Redo */}
      <div className="flex items-center gap-1">
        <ToolbarButton
          onClick={undo}
          disabled={undoStack.length === 0}
          title="Undo (Ctrl+Z)"
        >
          ↶
        </ToolbarButton>
        <ToolbarButton
          onClick={redo}
          disabled={redoStack.length === 0}
          title="Redo (Ctrl+Y)"
        >
          ↷
        </ToolbarButton>

        <div className="w-px h-5 bg-slate-600 mx-2" />

        {/* Display options toggle */}
        <div className="relative">
          <ToolbarButton
            onClick={() => setShowOptionsMenu(!showOptionsMenu)}
            active={showOptionsMenu}
            title="Display Options"
          >
            ⚙
          </ToolbarButton>

          {showOptionsMenu && (
            <div className="absolute top-full mt-1 right-0 bg-[#1e293b] border border-slate-600 rounded shadow-xl z-50 min-w-[200px] py-1">
              <OptionToggle
                label="Show Values"
                checked={displayOptions.showValues}
                onChange={() => toggleOption("showValues")}
              />
              <OptionToggle
                label="Show Tokens"
                checked={displayOptions.showTokens}
                onChange={() => toggleOption("showTokens")}
              />
              <OptionToggle
                label="Show Labels"
                checked={displayOptions.showLabels}
                onChange={() => toggleOption("showLabels")}
              />
              <OptionToggle
                label="Show Chain Icons"
                checked={displayOptions.showChainIcons}
                onChange={() => toggleOption("showChainIcons")}
              />
              <OptionToggle
                label="Show Balances"
                checked={displayOptions.showBalances}
                onChange={() => toggleOption("showBalances")}
              />
              <OptionToggle
                label="Show Arrows"
                checked={displayOptions.showArrows}
                onChange={() => toggleOption("showArrows")}
              />
              <OptionToggle
                label="Auto-Populate"
                checked={displayOptions.autoPopulate}
                onChange={() => toggleOption("autoPopulate")}
              />
              <div className="border-t border-slate-600 my-1" />
              <OptionToggle
                label="Proportional Edges"
                checked={displayOptions.edgeThickness === "proportional"}
                onChange={() =>
                  setDisplayOptions({
                    edgeThickness:
                      displayOptions.edgeThickness === "proportional"
                        ? "uniform"
                        : "proportional",
                  })
                }
              />
            </div>
          )}
        </div>
      </div>

      {/* Right section: Download */}
      <div className="flex items-center gap-1">
        <ToolbarButton onClick={handleDownload} title="Download SVG">
          ⬇
        </ToolbarButton>
      </div>
    </>
  );
}

/* ── Shared sub-components ── */

function ToolbarButton({
  children,
  onClick,
  disabled,
  active,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        flex items-center justify-center w-7 h-7 rounded text-sm transition-all
        ${active
          ? "bg-blue-600/30 text-blue-400"
          : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
        }
        ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      {children}
    </button>
  );
}

function OptionToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-700/50 cursor-pointer text-xs text-slate-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="rounded border-slate-500 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 h-3.5 w-3.5"
      />
      {label}
    </label>
  );
}
