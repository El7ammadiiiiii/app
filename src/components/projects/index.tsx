"use client";

import { useProjectStore } from "@/store/projectStore";

/**
 * ProjectHeader – shows the active project bar above messages in ChatArea.
 */
export function ProjectHeader() {
  const { getActiveProject } = useProjectStore();
  const project = getActiveProject();

  if (!project) return null;

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 border-b border-white/10"
      style={{ backgroundColor: `${project.color}22` }}
    >
      <span className="text-lg">{project.emoji}</span>
      <span className="text-sm font-semibold text-white/90">{project.name}</span>
      <span className="text-[10px] text-white/50 mr-auto">
        {project.chats?.length ?? 0} محادثة
      </span>
    </div>
  );
}
