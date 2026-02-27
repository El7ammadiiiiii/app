/**
 * ToggleMenu — cways-tracker mode toolbar
 * Modes: default (Esc), expand (E), add (A), remove (R), fix (F)
 */

"use client";

import React from "react";
import { useTracerStore } from "@/lib/onchain/tracer-store";

interface ToggleMenuProps {
  showFlowToggle?: boolean;
}

export function ToggleMenu({
  showFlowToggle = true,
}: ToggleMenuProps) {
  const controlMode = useTracerStore((s) => s.controlMode);
  const setControlMode = useTracerStore((s) => s.setControlMode);
  const toggleFlowPanel = useTracerStore((s) => s.toggleFlowPanel);
  const flowPanelOpen = useTracerStore((s) => s.flowPanelOpen);
  const selectedNodeId = useTracerStore((s) => s.selectedNodeId);
  const nodes = useTracerStore((s) => s.nodes);
  const fixedNodeIds = useTracerStore((s) => s.fixedNodeIds);

  const selectedNode = React.useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  );
  const selectedIsExpanded = Boolean(selectedNode?.isExpanded);
  const selectedIsFixed = selectedNodeId ? fixedNodeIds.includes(selectedNodeId) : false;

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === "escape") {
        setControlMode("default");
      } else if (key === "e") {
        setControlMode("expand");
      } else if (key === "a") {
        setControlMode("add");
      } else if (key === "r") {
        setControlMode("remove");
      } else if (key === "f") {
        setControlMode("fix");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setControlMode]);

  const modeButtons = [
    {
      mode: "default" as const,
      icon: "/icons/tracer/visualizeIcon.svg",
      label: "Default",
      keyHint: "Esc",
    },
    {
      mode: "expand" as const,
      icon: "/icons/tracer/expandIcon.svg",
      label: selectedIsExpanded ? "Collapse selected" : "Expand selected",
      keyHint: "E",
    },
    {
      mode: "add" as const,
      icon: "/icons/tracer/addIcon.svg",
      label: "Add / Remove in Filter",
      keyHint: "A",
    },
    {
      mode: "remove" as const,
      icon: "/icons/tracer/removeIcon.svg",
      label: "Hide Node",
      keyHint: "R",
    },
    {
      mode: "fix" as const,
      icon: "/icons/tracer/lockIconWhite.svg",
      label: selectedIsFixed ? "Unfix selected" : "Fix selected",
      keyHint: "F",
    },
  ];

  return (
    <>
      {modeButtons.map((btn) => {
        const active = controlMode === btn.mode;
        return (
          <button
            key={btn.mode}
            onClick={() => setControlMode(btn.mode)}
            title={`${btn.label} (${btn.keyHint})`}
            className="group relative flex items-center justify-center w-10 h-10 md:w-9 md:h-9 rounded-lg transition-all"
            style={active ? {
              background: 'linear-gradient(135deg, rgba(20,184,166,0.2) 0%, rgba(13,148,136,0.12) 100%)',
              border: '1px solid rgba(20,184,166,0.45)',
            } : {
              background: 'rgba(29,62,59,0.68)',
              border: '1px solid rgba(20,184,166,0.22)',
            }}
          >
            <img
              src={btn.icon}
              alt={btn.label}
              className="w-4 h-4 md:w-3.5 md:h-3.5 opacity-80"
              style={btn.mode === 'expand' && selectedIsExpanded ? { transform: 'rotate(180deg)' } : undefined}
            />
            <span
              className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-1 text-[10px] text-slate-100 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                background: 'rgba(15,23,42,0.95)',
                border: '1px solid rgba(20,184,166,0.25)',
                boxShadow: '0 4px 18px rgba(0,0,0,0.35)',
              }}
            >
              {btn.label} ({btn.keyHint})
            </span>
          </button>
        );
      })}

      {showFlowToggle && (
        <button
          onClick={toggleFlowPanel}
          title="Flow Summary"
          className="group relative flex items-center justify-center w-10 h-10 md:w-9 md:h-9 rounded-lg transition-all"
          style={flowPanelOpen ? {
            background: 'linear-gradient(135deg, rgba(20,184,166,0.2) 0%, rgba(13,148,136,0.12) 100%)',
            border: '1px solid rgba(20,184,166,0.45)',
          } : {
            background: 'rgba(29,62,59,0.68)',
            border: '1px solid rgba(20,184,166,0.22)',
          }}
        >
          <img
            src="/icons/tracer/visualizeIcon.svg"
            alt="Flow Summary"
            className="w-4 h-4 md:w-3.5 md:h-3.5 opacity-80"
          />
          <span
            className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-1 text-[10px] text-slate-100 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              background: 'rgba(15,23,42,0.95)',
              border: '1px solid rgba(20,184,166,0.25)',
              boxShadow: '0 4px 18px rgba(0,0,0,0.35)',
            }}
          >
            Flow Summary
          </span>
        </button>
      )}
    </>
  );
}
