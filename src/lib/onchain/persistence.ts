/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  Persistence — localStorage save/restore of CWTRACKER state ║
 * ║  Auto-save on changes, restore on page mount                 ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import type { MSSnapshot } from "./cwtracker-types";

const STORAGE_KEY = "nexus-cwtracker-state";
const MAX_SNAPSHOTS = 5;

/* ────────────────── Single Active Trace ────────────────── */

export function saveSnapshot(snapshot: MSSnapshot): void {
  try {
    const index = loadIndex();
    // upsert
    const existing = index.findIndex((s) => s.uuid === snapshot.uuid);
    const meta: SnapshotMeta = {
      uuid: snapshot.uuid,
      title: snapshot.title,
      rootAddress: snapshot.rootAddress,
      rootChain: snapshot.rootChain,
      nodeCount: snapshot.nodes.length,
      edgeCount: snapshot.edges.length,
      updatedAt: Date.now(),
    };

    if (existing >= 0) {
      index[existing] = meta;
    } else {
      index.unshift(meta);
      // trim oldest beyond limit
      if (index.length > MAX_SNAPSHOTS) index.length = MAX_SNAPSHOTS;
    }

    localStorage.setItem(STORAGE_KEY + ":index", JSON.stringify(index));
    localStorage.setItem(
      STORAGE_KEY + ":" + snapshot.uuid,
      JSON.stringify(snapshot)
    );
  } catch (err) {
    console.warn("[Persistence] Save failed:", err);
  }
}

export function loadSnapshot(uuid?: string): MSSnapshot | null {
  try {
    if (uuid) {
      const raw = localStorage.getItem(STORAGE_KEY + ":" + uuid);
      return raw ? (JSON.parse(raw) as MSSnapshot) : null;
    }
    // load most recent
    const index = loadIndex();
    if (index.length === 0) return null;
    const latestUuid = index[0].uuid;
    const raw = localStorage.getItem(STORAGE_KEY + ":" + latestUuid);
    return raw ? (JSON.parse(raw) as MSSnapshot) : null;
  } catch (err) {
    console.warn("[Persistence] Load failed:", err);
    return null;
  }
}

export function deleteSnapshot(uuid: string): void {
  try {
    const index = loadIndex().filter((s) => s.uuid !== uuid);
    localStorage.setItem(STORAGE_KEY + ":index", JSON.stringify(index));
    localStorage.removeItem(STORAGE_KEY + ":" + uuid);
  } catch {
    // ignore
  }
}

export function clearAll(): void {
  try {
    const index = loadIndex();
    for (const s of index) {
      localStorage.removeItem(STORAGE_KEY + ":" + s.uuid);
    }
    localStorage.removeItem(STORAGE_KEY + ":index");
  } catch {
    // ignore
  }
}

/* ────────────────── Index Management ────────────────── */

export interface SnapshotMeta {
  uuid: string;
  title: string;
  rootAddress: string;
  rootChain: string;
  nodeCount: number;
  edgeCount: number;
  updatedAt: number;
}

export function loadIndex(): SnapshotMeta[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY + ":index");
    return raw ? (JSON.parse(raw) as SnapshotMeta[]) : [];
  } catch {
    return [];
  }
}

/* ────────────────── Auto-Save Hook ────────────────── */

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Debounced auto-save — call from store subscribe.
 * Saves after 2 seconds of inactivity.
 */
export function autoSave(snapshot: MSSnapshot): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    saveSnapshot(snapshot);
  }, 2000);
}

/**
 * Get storage usage estimate
 */
export function getStorageUsage(): { used: number; available: number } {
  let used = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_KEY)) {
        used += (localStorage.getItem(key) || "").length * 2; // UTF-16
      }
    }
  } catch {
    // ignore
  }
  return { used, available: 5 * 1024 * 1024 }; // 5 MB typical limit
}
