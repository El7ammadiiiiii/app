// =============================================================================
// 📦 CCCWAYS Canvas - Hooks Index
// ملف التصدير الرئيسي لجميع Hooks
// =============================================================================

export { useCanvas } from "./useCanvas";
export { useViewport } from "./useViewport";
export { useHistory, getHistoryEntryDescription, getHistoryEntryIcon, formatHistoryTime } from "./useHistory";
export { useGestures, usePanZoom, type GestureState, type GestureCallbacks, type GestureOptions } from "./useGestures";
export { useSelection, type SelectionBox, type SelectionInfo } from "./useSelection";
export { useKeyboard, formatShortcut, getShortcutsByCategory, getCategoryLabel, type KeyboardShortcut, type KeyboardOptions } from "./useKeyboard";
export { useCollaboration, type CollaborationConfig, type CollaborationState } from "./useCollaboration";
export { useAI, type AIState, type AIConfig } from "./useAI";
