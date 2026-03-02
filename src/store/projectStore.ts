"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import type {
  Project,
  ProjectChat,
  ProjectFile,
  ChatMessage,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectStoreState,
  ProjectViewMode,
  ProjectSortBy,
  ProjectFilterBy,
} from "@/types/project";

// ═══════════════════════════════════════════════════════════════
// Project Store Actions Interface
// ═══════════════════════════════════════════════════════════════
interface ProjectStoreActions {
  // ─── المشاريع ───
  createProject: (input: CreateProjectInput) => Project;
  updateProject: (id: string, input: UpdateProjectInput) => void;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => Project | null;
  pinProject: (id: string) => void;
  archiveProject: (id: string) => void;
  favoriteProject: (id: string) => void;
  setActiveProject: (id: string | null) => void;

  // ─── المحادثات ───
  createChat: (projectId: string, title?: string) => ProjectChat;
  updateChat: (id: string, updates: Partial<ProjectChat>) => void;
  deleteChat: (id: string) => void;
  moveChat: (chatId: string, toProjectId: string) => void;
  branchChat: (chatId: string, fromMessageId: string, title?: string) => ProjectChat | null;
  pinChat: (id: string) => void;
  addMessage: (chatId: string, message: Omit<ChatMessage, "id" | "timestamp">) => ChatMessage;
  updateMessage: (chatId: string, messageId: string, updates: Partial<ChatMessage>) => void;
  setActiveChat: (id: string | null) => void;

  // ─── الملفات ───
  addFile: (projectId: string, file: Omit<ProjectFile, "id" | "projectId" | "uploadedAt">) => ProjectFile;
  deleteFile: (id: string) => void;

  // ─── البحث والفلترة ───
  setSearchQuery: (query: string) => void;
  setViewMode: (mode: ProjectViewMode) => void;
  setSortBy: (sort: ProjectSortBy) => void;
  setFilterBy: (filter: ProjectFilterBy) => void;

  // ─── النوافذ ───
  openCreateModal: () => void;
  closeCreateModal: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  openQuickSwitcher: () => void;
  closeQuickSwitcher: () => void;

  // ─── الإعدادات ───
  toggleSound: () => void;

  // ─── Getters ───
  getActiveProject: () => Project | null;
  getActiveChat: () => ProjectChat | null;
  getProjectChats: (projectId: string) => ProjectChat[];
  getProjectFiles: (projectId: string) => ProjectFile[];
  getPinnedProjects: () => Project[];
  getRecentProjects: (limit?: number) => Project[];
  getFilteredProjects: () => Project[];
  searchProjects: (query: string) => Project[];
}

type ProjectStore = ProjectStoreState & ProjectStoreActions;

// ═══════════════════════════════════════════════════════════════
// Initial State
// ═══════════════════════════════════════════════════════════════
const initialState: ProjectStoreState = {
  projects: [],
  chats: [],
  files: [],
  activeProjectId: null,
  activeChatId: null,
  searchQuery: "",
  viewMode: "list",
  sortBy: "lastAccessed",
  filterBy: "all",
  isCreateModalOpen: false,
  isSettingsOpen: false,
  isQuickSwitcherOpen: false,
  soundEnabled: true,
};

// ═══════════════════════════════════════════════════════════════
// Project Store
// ═══════════════════════════════════════════════════════════════
export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ═══════════════════════════════════════════════════════════
      // المشاريع
      // ═══════════════════════════════════════════════════════════
      createProject: (input: CreateProjectInput) => {
        const newProject: Project = {
          id: uuidv4(),
          name: input.name,
          emoji: input.emoji || "📁",
          color: input.color || "turquoise",
          instructions: input.instructions || "",
          description: input.description || "",
          memoryType: input.memoryType || "default",
          chatsCount: 0,
          filesCount: 0,
          isPinned: false,
          isArchived: false,
          isFavorite: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastAccessedAt: new Date(),
          template: input.template,
          tags: [],
        };

        set((state) => ({
          projects: [...state.projects, newProject],
          activeProjectId: newProject.id,
        }));

        return newProject;
      },

      updateProject: (id: string, input: UpdateProjectInput) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id
              ? { ...p, ...input, updatedAt: new Date() }
              : p
          ),
        }));
      },

      deleteProject: (id: string) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          chats: state.chats.filter((c) => c.projectId !== id),
          files: state.files.filter((f) => f.projectId !== id),
          activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
          activeChatId: state.chats.find((c) => c.id === state.activeChatId)?.projectId === id 
            ? null 
            : state.activeChatId,
        }));
      },

      duplicateProject: (id: string) => {
        const project = get().projects.find((p) => p.id === id);
        if (!project) return null;

        const newProject: Project = {
          ...project,
          id: uuidv4(),
          name: `${project.name} (نسخة)`,
          isPinned: false,
          isArchived: false,
          chatsCount: 0,
          filesCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastAccessedAt: new Date(),
        };

        set((state) => ({
          projects: [...state.projects, newProject],
        }));

        return newProject;
      },

      pinProject: (id: string) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, isPinned: !p.isPinned, updatedAt: new Date() } : p
          ),
        }));
      },

      archiveProject: (id: string) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, isArchived: !p.isArchived, updatedAt: new Date() } : p
          ),
        }));
      },

      favoriteProject: (id: string) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, isFavorite: !p.isFavorite, updatedAt: new Date() } : p
          ),
        }));
      },

      setActiveProject: (id: string | null) => {
        if (id) {
          set((state) => ({
            activeProjectId: id,
            projects: state.projects.map((p) =>
              p.id === id ? { ...p, lastAccessedAt: new Date() } : p
            ),
          }));
        } else {
          set({ activeProjectId: null });
        }
      },

      // ═══════════════════════════════════════════════════════════
      // المحادثات
      // ═══════════════════════════════════════════════════════════
      createChat: (projectId: string, title?: string) => {
        const chatCount = get().chats.filter((c) => c.projectId === projectId).length;
        
        const newChat: ProjectChat = {
          id: uuidv4(),
          projectId,
          title: title || `محادثة ${chatCount + 1}`,
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          isPinned: false,
          isBranch: false,
        };

        set((state) => ({
          chats: [...state.chats, newChat],
          activeChatId: newChat.id,
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, chatsCount: p.chatsCount + 1, updatedAt: new Date() }
              : p
          ),
        }));

        return newChat;
      },

      updateChat: (id: string, updates: Partial<ProjectChat>) => {
        set((state) => ({
          chats: state.chats.map((c) =>
            c.id === id ? { ...c, ...updates, updatedAt: new Date() } : c
          ),
        }));
      },

      deleteChat: (id: string) => {
        const chat = get().chats.find((c) => c.id === id);
        if (!chat) return;

        set((state) => ({
          chats: state.chats.filter((c) => c.id !== id),
          activeChatId: state.activeChatId === id ? null : state.activeChatId,
          projects: state.projects.map((p) =>
            p.id === chat.projectId
              ? { ...p, chatsCount: Math.max(0, p.chatsCount - 1), updatedAt: new Date() }
              : p
          ),
        }));
      },

      moveChat: (chatId: string, toProjectId: string) => {
        const chat = get().chats.find((c) => c.id === chatId);
        if (!chat || chat.projectId === toProjectId) return;

        const fromProjectId = chat.projectId;

        set((state) => ({
          chats: state.chats.map((c) =>
            c.id === chatId
              ? { ...c, projectId: toProjectId, updatedAt: new Date() }
              : c
          ),
          projects: state.projects.map((p) => {
            if (p.id === fromProjectId) {
              return { ...p, chatsCount: Math.max(0, p.chatsCount - 1), updatedAt: new Date() };
            }
            if (p.id === toProjectId) {
              return { ...p, chatsCount: p.chatsCount + 1, updatedAt: new Date() };
            }
            return p;
          }),
        }));
      },

      branchChat: (chatId: string, fromMessageId: string, title?: string) => {
        const chat = get().chats.find((c) => c.id === chatId);
        if (!chat) return null;

        const messageIndex = chat.messages.findIndex((m) => m.id === fromMessageId);
        if (messageIndex === -1) return null;

        const branchedMessages = chat.messages.slice(0, messageIndex + 1);

        const newChat: ProjectChat = {
          id: uuidv4(),
          projectId: chat.projectId,
          title: title || `فرع من: ${chat.title}`,
          messages: branchedMessages.map((m) => ({ ...m, id: uuidv4() })),
          createdAt: new Date(),
          updatedAt: new Date(),
          isPinned: false,
          isBranch: true,
          branchFromId: chatId,
          branchFromMessageId: fromMessageId,
        };

        set((state) => ({
          chats: [...state.chats, newChat],
          activeChatId: newChat.id,
          projects: state.projects.map((p) =>
            p.id === chat.projectId
              ? { ...p, chatsCount: p.chatsCount + 1, updatedAt: new Date() }
              : p
          ),
        }));

        return newChat;
      },

      pinChat: (id: string) => {
        set((state) => ({
          chats: state.chats.map((c) =>
            c.id === id ? { ...c, isPinned: !c.isPinned, updatedAt: new Date() } : c
          ),
        }));
      },

      addMessage: (chatId: string, message: Omit<ChatMessage, "id" | "timestamp">) => {
        const newMessage: ChatMessage = {
          ...message,
          id: uuidv4(),
          timestamp: new Date(),
        };

        set((state) => ({
          chats: state.chats.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  messages: [...c.messages, newMessage],
                  updatedAt: new Date(),
                  title: c.messages.length === 0 && message.role === "user" 
                    ? message.content.slice(0, 50) + (message.content.length > 50 ? "..." : "")
                    : c.title,
                }
              : c
          ),
        }));

        return newMessage;
      },

      updateMessage: (chatId: string, messageId: string, updates: Partial<ChatMessage>) => {
        set((state) => ({
          chats: state.chats.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === messageId ? { ...m, ...updates } : m
                  ),
                  updatedAt: new Date(),
                }
              : c
          ),
        }));
      },

      setActiveChat: (id: string | null) => {
        set({ activeChatId: id });
      },

      // ═══════════════════════════════════════════════════════════
      // الملفات
      // ═══════════════════════════════════════════════════════════
      addFile: (projectId: string, file: Omit<ProjectFile, "id" | "projectId" | "uploadedAt">) => {
        const newFile: ProjectFile = {
          ...file,
          id: uuidv4(),
          projectId,
          uploadedAt: new Date(),
        };

        set((state) => ({
          files: [...state.files, newFile],
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, filesCount: p.filesCount + 1, updatedAt: new Date() }
              : p
          ),
        }));

        return newFile;
      },

      deleteFile: (id: string) => {
        const file = get().files.find((f) => f.id === id);
        if (!file) return;

        set((state) => ({
          files: state.files.filter((f) => f.id !== id),
          projects: state.projects.map((p) =>
            p.id === file.projectId
              ? { ...p, filesCount: Math.max(0, p.filesCount - 1), updatedAt: new Date() }
              : p
          ),
        }));
      },

      // ═══════════════════════════════════════════════════════════
      // البحث والفلترة
      // ═══════════════════════════════════════════════════════════
      setSearchQuery: (query: string) => set({ searchQuery: query }),
      setViewMode: (mode: ProjectViewMode) => set({ viewMode: mode }),
      setSortBy: (sort: ProjectSortBy) => set({ sortBy: sort }),
      setFilterBy: (filter: ProjectFilterBy) => set({ filterBy: filter }),

      // ═══════════════════════════════════════════════════════════
      // النوافذ
      // ═══════════════════════════════════════════════════════════
      openCreateModal: () => set({ isCreateModalOpen: true }),
      closeCreateModal: () => set({ isCreateModalOpen: false }),
      openSettings: () => set({ isSettingsOpen: true }),
      closeSettings: () => set({ isSettingsOpen: false }),
      openQuickSwitcher: () => set({ isQuickSwitcherOpen: true }),
      closeQuickSwitcher: () => set({ isQuickSwitcherOpen: false }),

      // ═══════════════════════════════════════════════════════════
      // الإعدادات
      // ═══════════════════════════════════════════════════════════
      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),

      // ═══════════════════════════════════════════════════════════
      // Getters
      // ═══════════════════════════════════════════════════════════
      getActiveProject: () => {
        const { projects, activeProjectId } = get();
        return projects.find((p) => p.id === activeProjectId) || null;
      },

      getActiveChat: () => {
        const { chats, activeChatId } = get();
        return chats.find((c) => c.id === activeChatId) || null;
      },

      getProjectChats: (projectId: string) => {
        return get().chats
          .filter((c) => c.projectId === projectId)
          .sort((a, b) => {
            // المثبتة أولاً
            if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
            // ثم الأحدث
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          });
      },

      getProjectFiles: (projectId: string) => {
        return get().files
          .filter((f) => f.projectId === projectId)
          .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      },

      getPinnedProjects: () => {
        return get().projects.filter((p) => p.isPinned && !p.isArchived);
      },

      getRecentProjects: (limit = 5) => {
        return get().projects
          .filter((p) => !p.isArchived)
          .sort((a, b) => new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime())
          .slice(0, limit);
      },

      getFilteredProjects: () => {
        const { projects, filterBy, sortBy, searchQuery } = get();

        const filtered = projects.filter((p) => {
          // فلتر البحث
          if (searchQuery) {
            const query = searchQuery.toLowerCase();
            if (!p.name.toLowerCase().includes(query) && 
                !p.description?.toLowerCase().includes(query)) {
              return false;
            }
          }

          // فلتر الحالة
          switch (filterBy) {
            case "pinned":
              return p.isPinned && !p.isArchived;
            case "archived":
              return p.isArchived;
            case "favorites":
              return p.isFavorite && !p.isArchived;
            default:
              return !p.isArchived;
          }
        });

        // الترتيب
        filtered.sort((a, b) => {
          // المثبتة دائماً أولاً
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;

          switch (sortBy) {
            case "name":
              return a.name.localeCompare(b.name, "ar");
            case "createdAt":
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            case "updatedAt":
              return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            case "lastAccessed":
            default:
              return new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime();
          }
        });

        return filtered;
      },

      searchProjects: (query: string) => {
        const lowerQuery = query.toLowerCase();
        return get().projects.filter(
          (p) =>
            p.name.toLowerCase().includes(lowerQuery) ||
            p.description?.toLowerCase().includes(lowerQuery) ||
            p.tags?.some((t) => t.toLowerCase().includes(lowerQuery))
        );
      },
    }),
    {
      name: "cccways-projects",
      partialize: (state) => ({
        projects: state.projects,
        chats: state.chats,
        files: state.files,
        soundEnabled: state.soundEnabled,
        viewMode: state.viewMode,
        sortBy: state.sortBy,
      }),
      version: 1,
      migrate: (persistedState: unknown, version: number) => {
        // Migration function to handle state schema changes
        return persistedState as ProjectStore;
      },
    }
  )
);

// ═══════════════════════════════════════════════════════════════
// Selectors (للأداء الأفضل)
// ═══════════════════════════════════════════════════════════════
export const selectProjects = (state: ProjectStore) => state.projects;
export const selectActiveProject = (state: ProjectStore) => 
  state.projects.find((p) => p.id === state.activeProjectId);
export const selectActiveChat = (state: ProjectStore) => 
  state.chats.find((c) => c.id === state.activeChatId);
export const selectIsCreateModalOpen = (state: ProjectStore) => state.isCreateModalOpen;
export const selectIsQuickSwitcherOpen = (state: ProjectStore) => state.isQuickSwitcherOpen;
