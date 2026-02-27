/**
 * MobileToolbar — Simplified toolbar for mobile (<768px)
 * cways-tracker mobile toolbar: undo, redo, options only (no download)
 * Hidden on desktop via parent's `flex md:hidden`
 */

"use client";

import React, { useState } from "react";
import { useTracerStore } from "@/lib/onchain/tracer-store";
import type { GraphDisplayOptions } from "@/lib/onchain/tracer-types";

export function MobileToolbar() {
  const undo = useTracerStore((s) => s.undo);
  const redo = useTracerStore((s) => s.redo);
  const undoStack = useTracerStore((s) => s.undoStack);
  const redoStack = useTracerStore((s) => s.redoStack);
  const displayOptions = useTracerStore((s) => s.displayOptions);
  const setDisplayOptions = useTracerStore((s) => s.setDisplayOptions);
  const isPopulating = useTracerStore((s) => s.isPopulating);
  const [showOptions, setShowOptions] = useState(false);

  const toggleOption = (key: keyof GraphDisplayOptions) => {
    setDisplayOptions({ [key]: !displayOptions[key] });
  };

  return (
    <div className="flex items-center gap-2">
      {/* Populate indicator */}
      {isPopulating && (
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      )}

      {/* Undo */}
      <MobileBtn onClick={undo} disabled={undoStack.length === 0} title="Undo">
        ↶
      </MobileBtn>

      {/* Redo */}
      <MobileBtn onClick={redo} disabled={redoStack.length === 0} title="Redo">
        ↷
      </MobileBtn>

      {/* Options */}
      <div className="relative">
        <MobileBtn
          onClick={() => setShowOptions(!showOptions)}
          active={showOptions}
          title="Options"
        >
          ⚙
        </MobileBtn>

        {showOptions && (
          <div className="absolute top-full mt-1 right-0 bg-[#1e293b] border border-slate-600 rounded shadow-xl z-50 min-w-[180px] py-1">
            <MobileOption
              label="Values"
              checked={displayOptions.showValues}
              onChange={() => toggleOption("showValues")}
            />
            <MobileOption
              label="Labels"
              checked={displayOptions.showLabels}
              onChange={() => toggleOption("showLabels")}
            />
            <MobileOption
              label="Arrows"
              checked={displayOptions.showArrows}
              onChange={() => toggleOption("showArrows")}
            />
            <MobileOption
              label="Auto-Populate"
              checked={displayOptions.autoPopulate}
              onChange={() => toggleOption("autoPopulate")}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function MobileBtn({
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
        flex items-center justify-center w-8 h-8 rounded text-base transition-all
        ${active
          ? "bg-blue-600/30 text-blue-400"
          : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
        }
        ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer active:scale-90"}
      `}
    >
      {children}
    </button>
  );
}

function MobileOption({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center gap-2 px-3 py-2 hover:bg-slate-700/50 cursor-pointer text-sm text-slate-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="rounded border-slate-500 bg-slate-700 text-blue-500 h-4 w-4"
      />
      {label}
    </label>
  );
}
