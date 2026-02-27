import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";

export interface FavoriteItem {
  id: string;
  content: string;
  timestamp: number;
  source?: string;
}

export interface FavoritePage {
  id: string;
  name: string;
  items: FavoriteItem[];
  createdAt: number;
}

interface FavoritesStore {
  pages: FavoritePage[];
  addPage: (name: string) => void;
  removePage: (id: string) => void;
  renamePage: (id: string, name: string) => void;
  addItemToPage: (pageId: string, content: string, source?: string) => void;
  removeItemFromPage: (pageId: string, itemId: string) => void;
}

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set) => ({
      pages: [],
      addPage: (name) =>
        set((state) => ({
          pages: [
            ...state.pages,
            {
              id: uuidv4(),
              name,
              items: [],
              createdAt: Date.now(),
            },
          ],
        })),
      removePage: (id) =>
        set((state) => ({
          pages: state.pages.filter((p) => p.id !== id),
        })),
      renamePage: (id, name) =>
        set((state) => ({
          pages: state.pages.map((p) => (p.id === id ? { ...p, name } : p)),
        })),
      addItemToPage: (pageId, content, source) =>
        set((state) => ({
          pages: state.pages.map((p) =>
            p.id === pageId
              ? {
                  ...p,
                  items: [
                    ...p.items,
                    {
                      id: uuidv4(),
                      content,
                      timestamp: Date.now(),
                      source,
                    },
                  ],
                }
              : p
          ),
        })),
      removeItemFromPage: (pageId, itemId) =>
        set((state) => ({
          pages: state.pages.map((p) =>
            p.id === pageId
              ? {
                  ...p,
                  items: p.items.filter((i) => i.id !== itemId),
                }
              : p
          ),
        })),
    }),
    {
      name: "favorites-storage",
    }
  )
);
