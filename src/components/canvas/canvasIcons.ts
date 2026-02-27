/**
 * Shared canvas icon mapping — single source of truth.
 * Used by CanvasEntryChip, CanvasArtifactsMenu, and any future canvas UI.
 */

import {
  Code2, FileText, Search, BarChart3, GraduationCap,
  BookOpen, Image, Bot, Presentation, Mail,
  Workflow, MapPin,
} from "lucide-react";
import { type CanvasType, CANVAS_TYPE_META } from "@/store/canvasStore";

/** Map icon name string → React component */
export const CANVAS_ICON_MAP: Record<string, React.ComponentType<any>> = {
  Code2, FileText, Search, BarChart3, GraduationCap,
  BookOpen, Image, Bot, Presentation, Mail,
  Workflow, MapPin,
};

/** Get the Lucide icon component for a given canvas type */
export function getCanvasIcon(type: CanvasType): React.ComponentType<any> {
  const meta = CANVAS_TYPE_META[type];
  return CANVAS_ICON_MAP[meta?.icon] || Code2;
}
