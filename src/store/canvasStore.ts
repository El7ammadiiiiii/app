import { create } from 'zustand';

export type CanvasType = 'CODE' | 'TEXT';

export interface CanvasVersion {
  version: number;
  content: string;
  timestamp: number;
  messageId?: string; // Link to chat message
}

interface CanvasState {
  isOpen: boolean;
  isModeActive: boolean; // Gemini-style mode (badge in input)
  activeModeType: CanvasType;
  activeCanvasId: string | null;
  type: CanvasType;
  title: string;
  language: string; // for code
  versions: CanvasVersion[];
  currentVersionIndex: number;
  isStreaming: boolean;
}

interface CanvasActions {
  openCanvas: (data: { id: string; title: string; type: CanvasType; language?: string; initialContent?: string; messageId?: string }) => void;
  closeCanvas: () => void;
  enableMode: (type: CanvasType) => void;
  disableMode: () => void;
  updateContent: (content: string, createNewVersion?: boolean, messageId?: string) => void;
  setVersion: (index: number) => void;
  setIsStreaming: (isStreaming: boolean) => void;
  reset: () => void;
}

export const useCanvasStore = create<CanvasState & CanvasActions>((set, get) => ({
  isOpen: false,
  isModeActive: false,
  activeModeType: 'CODE',
  activeCanvasId: null,
  type: 'CODE',
  title: 'Untitled',
  language: 'typescript',
  versions: [],
  currentVersionIndex: -1,
  isStreaming: false,

  openCanvas: ({ id, title, type, language = 'typescript', initialContent = '', messageId }) => {
    const initialVersion: CanvasVersion = {
      version: 1,
      content: initialContent,
      timestamp: Date.now(),
      messageId
    };

    set({
      isOpen: true,
      isModeActive: false, // Disable mode when canvas actually opens
      activeCanvasId: id,
      title,
      type,
      language,
      versions: [initialVersion],
      currentVersionIndex: 0,
      isStreaming: false
    });
  },

  closeCanvas: () => set({ isOpen: false }),

  enableMode: (type) => set({ isModeActive: true, activeModeType: type }),
  disableMode: () => set({ isModeActive: false }),

  updateContent: (content, createNewVersion = false, messageId) => {
    const { versions, currentVersionIndex } = get();
    
    if (createNewVersion) {
      const newVersion: CanvasVersion = {
        version: versions.length + 1,
        content,
        timestamp: Date.now(),
        messageId
      };
      
      set({
        versions: [...versions, newVersion],
        currentVersionIndex: versions.length // Point to new version
      });
    } else {
      // Update current version in place (e.g. during streaming)
      const updatedVersions = [...versions];
      if (updatedVersions[currentVersionIndex]) {
        updatedVersions[currentVersionIndex] = {
          ...updatedVersions[currentVersionIndex],
          content
        };
        set({ versions: updatedVersions });
      }
    }
  },

  setVersion: (index) => {
    const { versions } = get();
    if (index >= 0 && index < versions.length) {
      set({ currentVersionIndex: index });
    }
  },

  setIsStreaming: (isStreaming) => set({ isStreaming }),

  reset: () => set({
    isOpen: false,
    isModeActive: false,
    activeModeType: 'CODE',
    activeCanvasId: null,
    type: 'CODE',
    title: 'Untitled',
    language: 'typescript',
    versions: [],
    currentVersionIndex: -1,
    isStreaming: false
  })
}));
