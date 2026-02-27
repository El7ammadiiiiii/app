/**
 * ═══════════════════════════════════════════════════════════════
 * Wave 7.5 — Virtual File System Store
 * ═══════════════════════════════════════════════════════════════
 *
 * In-memory virtual file system for code generation artifacts.
 * Allows the AI to "create" files that users can browse, preview,
 * and download — similar to ChatGPT/Claude Artifacts file trees.
 *
 * Powered by Zustand with persist to retain files across refreshes.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ═══ Types ═══

export interface VFSFile {
  /** Unique path, e.g. "src/index.ts" */
  path: string;
  content: string;
  language: string;
  /** Size in bytes (computed from content) */
  size: number;
  createdAt: number;
  updatedAt: number;
  /** Optional: which message generated this file */
  sourceMessageId?: string;
}

export interface VFSDirectory {
  name: string;
  path: string;
  children: string[]; // paths of direct children
}

export interface VFSState {
  /** Map of path → file */
  files: Record<string, VFSFile>;
  /** Currently selected file path */
  activeFilePath: string | null;
  /** Whether the file drawer is open */
  isDrawerOpen: boolean;
  /** Project name / root label */
  projectName: string;

  // Actions
  writeFile: (path: string, content: string, language?: string, sourceMessageId?: string) => void;
  readFile: (path: string) => VFSFile | undefined;
  deleteFile: (path: string) => void;
  renameFile: (oldPath: string, newPath: string) => void;
  setActiveFile: (path: string | null) => void;
  toggleDrawer: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  setProjectName: (name: string) => void;
  clearAll: () => void;

  // Computed helpers
  listFiles: () => VFSFile[];
  getDirectoryTree: () => VFSTreeNode[];
  getFileCount: () => number;
  getTotalSize: () => number;
}

export interface VFSTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  language?: string;
  children?: VFSTreeNode[];
}

// ═══ Language Detection ═══

const EXT_TO_LANG: Record<string, string> = {
  ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx',
  py: 'python', rb: 'ruby', rs: 'rust', go: 'go',
  java: 'java', kt: 'kotlin', swift: 'swift', cs: 'csharp',
  cpp: 'cpp', c: 'c', h: 'c', hpp: 'cpp',
  html: 'html', css: 'css', scss: 'scss', less: 'less',
  json: 'json', yaml: 'yaml', yml: 'yaml', toml: 'toml',
  md: 'markdown', txt: 'text', sql: 'sql', sh: 'bash',
  dockerfile: 'dockerfile', xml: 'xml', svg: 'svg',
};

function detectLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const basename = path.split('/').pop()?.toLowerCase() || '';
  if (basename === 'dockerfile') return 'dockerfile';
  if (basename === 'makefile') return 'makefile';
  return EXT_TO_LANG[ext] || 'text';
}

// ═══ Tree Builder ═══

function buildTree(files: VFSFile[]): VFSTreeNode[] {
  const root: VFSTreeNode = { name: '', path: '', type: 'directory', children: [] };

  for (const file of files) {
    const parts = file.path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const childPath = parts.slice(0, i + 1).join('/');

      if (isFile) {
        current.children!.push({
          name: part,
          path: file.path,
          type: 'file',
          language: file.language,
        });
      } else {
        let dir = current.children!.find((c) => c.type === 'directory' && c.name === part);
        if (!dir) {
          dir = { name: part, path: childPath, type: 'directory', children: [] };
          current.children!.push(dir);
        }
        current = dir;
      }
    }
  }

  // Sort: directories first, then alphabetically
  const sortNodes = (nodes: VFSTreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((n) => {
      if (n.children) sortNodes(n.children);
    });
  };

  sortNodes(root.children!);
  return root.children!;
}

// ═══ Store ═══

export const useVFSStore = create<VFSState>()(
  persist(
    (set, get) => ({
      files: {},
      activeFilePath: null,
      isDrawerOpen: false,
      projectName: 'project',

      writeFile: (path, content, language, sourceMessageId) => {
        const now = Date.now();
        const existing = get().files[path];
        set((state) => ({
          files: {
            ...state.files,
            [path]: {
              path,
              content,
              language: language || detectLanguage(path),
              size: new Blob([content]).size,
              createdAt: existing?.createdAt || now,
              updatedAt: now,
              sourceMessageId,
            },
          },
        }));
      },

      readFile: (path) => get().files[path],

      deleteFile: (path) => {
        set((state) => {
          const { [path]: _, ...rest } = state.files;
          return {
            files: rest,
            activeFilePath: state.activeFilePath === path ? null : state.activeFilePath,
          };
        });
      },

      renameFile: (oldPath, newPath) => {
        const file = get().files[oldPath];
        if (!file) return;
        set((state) => {
          const { [oldPath]: _, ...rest } = state.files;
          return {
            files: {
              ...rest,
              [newPath]: {
                ...file,
                path: newPath,
                language: detectLanguage(newPath),
                updatedAt: Date.now(),
              },
            },
            activeFilePath: state.activeFilePath === oldPath ? newPath : state.activeFilePath,
          };
        });
      },

      setActiveFile: (path) => set({ activeFilePath: path }),
      toggleDrawer: () => set((s) => ({ isDrawerOpen: !s.isDrawerOpen })),
      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),
      setProjectName: (name) => set({ projectName: name }),
      clearAll: () => set({ files: {}, activeFilePath: null }),

      listFiles: () => Object.values(get().files).sort((a, b) => a.path.localeCompare(b.path)),
      getDirectoryTree: () => buildTree(get().listFiles()),
      getFileCount: () => Object.keys(get().files).length,
      getTotalSize: () => Object.values(get().files).reduce((sum, f) => sum + f.size, 0),
    }),
    {
      name: 'ccways-vfs',
      partialize: (state) => ({
        files: state.files,
        projectName: state.projectName,
      }),
    }
  )
);
