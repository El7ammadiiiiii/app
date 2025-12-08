// =============================================================================
// 📦 CCCWAYS Canvas - Persistence System
// نظام الحفظ والاستعادة للكانفاس
// =============================================================================

import type { CanvasElement, Layer, Viewport } from "@/types/canvas";
import type { CanvasRoom } from "@/types/collaboration";

// =============================================================================
// ⚙️ Types
// =============================================================================

export interface CanvasSnapshot {
  id: string;
  name: string;
  elements: CanvasElement[];
  layers: Layer[];
  viewport: Viewport;
  metadata: Record<string, any>;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface PersistenceConfig {
  storageKey: string;
  autoSave: boolean;
  autoSaveInterval: number;
  maxSnapshots: number;
  compression: boolean;
}

export const DEFAULT_PERSISTENCE_CONFIG: PersistenceConfig = {
  storageKey: "cccways-canvas",
  autoSave: true,
  autoSaveInterval: 30000, // 30 seconds
  maxSnapshots: 10,
  compression: true,
};

export interface StorageAdapter {
  save(key: string, data: string): Promise<void>;
  load(key: string): Promise<string | null>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
  clear(prefix: string): Promise<void>;
}

// =============================================================================
// 💾 LocalStorage Adapter
// =============================================================================

export class LocalStorageAdapter implements StorageAdapter {
  async save(key: string, data: string): Promise<void> {
    try {
      localStorage.setItem(key, data);
    } catch (error) {
      console.error("LocalStorage save error:", error);
      throw new Error("فشل في حفظ البيانات");
    }
  }

  async load(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error("LocalStorage load error:", error);
      throw new Error("فشل في تحميل البيانات");
    }
  }

  async delete(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error("LocalStorage delete error:", error);
      throw new Error("فشل في حذف البيانات");
    }
  }

  async list(prefix: string): Promise<string[]> {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keys.push(key);
      }
    }
    return keys;
  }

  async clear(prefix: string): Promise<void> {
    const keys = await this.list(prefix);
    for (const key of keys) {
      localStorage.removeItem(key);
    }
  }
}

// =============================================================================
// 💾 IndexedDB Adapter
// =============================================================================

export class IndexedDBAdapter implements StorageAdapter {
  private dbName: string;
  private storeName: string;
  private db: IDBDatabase | null = null;

  constructor(dbName: string = "cccways-canvas", storeName: string = "snapshots") {
    this.dbName = dbName;
    this.storeName = storeName;
  }

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: "key" });
        }
      };
    });
  }

  async save(key: string, data: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.put({ key, data, timestamp: Date.now() });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async load(key: string): Promise<string | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        resolve(request.result?.data || null);
      };
    });
  }

  async delete(key: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async list(prefix: string): Promise<string[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.getAllKeys();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const keys = (request.result as string[]).filter((key) =>
          key.startsWith(prefix)
        );
        resolve(keys);
      };
    });
  }

  async clear(prefix: string): Promise<void> {
    const keys = await this.list(prefix);
    for (const key of keys) {
      await this.delete(key);
    }
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// =============================================================================
// 🗜️ Compression
// =============================================================================

/**
 * ضغط البيانات
 */
export async function compressData(data: string): Promise<string> {
  if (typeof CompressionStream === "undefined") {
    return data;
  }

  try {
    const encoder = new TextEncoder();
    const stream = new Blob([encoder.encode(data)]).stream();
    const compressedStream = stream.pipeThrough(new CompressionStream("gzip"));
    const compressedBlob = await new Response(compressedStream).blob();
    const arrayBuffer = await compressedBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
  } catch (error) {
    console.warn("Compression failed, returning original data:", error);
    return data;
  }
}

/**
 * فك ضغط البيانات
 */
export async function decompressData(compressedData: string): Promise<string> {
  if (typeof DecompressionStream === "undefined") {
    return compressedData;
  }

  try {
    const binary = atob(compressedData);
    const uint8Array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      uint8Array[i] = binary.charCodeAt(i);
    }
    const stream = new Blob([uint8Array]).stream();
    const decompressedStream = stream.pipeThrough(
      new DecompressionStream("gzip")
    );
    const decompressedBlob = await new Response(decompressedStream).blob();
    return await decompressedBlob.text();
  } catch (error) {
    // If decompression fails, assume it's not compressed
    return compressedData;
  }
}

// =============================================================================
// 📦 Persistence Manager
// =============================================================================

export class PersistenceManager {
  private adapter: StorageAdapter;
  private config: PersistenceConfig;
  private autoSaveTimer: ReturnType<typeof setInterval> | null = null;
  private isDirty: boolean = false;
  private lastSavedData: string | null = null;

  constructor(
    adapter?: StorageAdapter,
    config?: Partial<PersistenceConfig>
  ) {
    this.adapter = adapter || new IndexedDBAdapter();
    this.config = { ...DEFAULT_PERSISTENCE_CONFIG, ...config };
  }

  /**
   * بدء الحفظ التلقائي
   */
  startAutoSave(getData: () => CanvasSnapshot): void {
    if (!this.config.autoSave || this.autoSaveTimer) return;

    this.autoSaveTimer = setInterval(async () => {
      if (this.isDirty) {
        await this.saveSnapshot(getData());
        this.isDirty = false;
      }
    }, this.config.autoSaveInterval);
  }

  /**
   * إيقاف الحفظ التلقائي
   */
  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /**
   * تعليم البيانات على أنها تغيرت
   */
  markDirty(): void {
    this.isDirty = true;
  }

  /**
   * حفظ لقطة
   */
  async saveSnapshot(snapshot: CanvasSnapshot): Promise<void> {
    const key = `${this.config.storageKey}-${snapshot.id}`;
    let data = JSON.stringify(snapshot);

    // Check if data changed
    if (data === this.lastSavedData) {
      return;
    }

    if (this.config.compression) {
      data = await compressData(data);
    }

    await this.adapter.save(key, data);
    this.lastSavedData = JSON.stringify(snapshot);

    // Manage snapshot limit
    await this.pruneOldSnapshots();
  }

  /**
   * تحميل لقطة
   */
  async loadSnapshot(snapshotId: string): Promise<CanvasSnapshot | null> {
    const key = `${this.config.storageKey}-${snapshotId}`;
    let data = await this.adapter.load(key);

    if (!data) return null;

    if (this.config.compression) {
      data = await decompressData(data);
    }

    try {
      return JSON.parse(data) as CanvasSnapshot;
    } catch (error) {
      console.error("Failed to parse snapshot:", error);
      return null;
    }
  }

  /**
   * حذف لقطة
   */
  async deleteSnapshot(snapshotId: string): Promise<void> {
    const key = `${this.config.storageKey}-${snapshotId}`;
    await this.adapter.delete(key);
  }

  /**
   * الحصول على قائمة اللقطات
   */
  async listSnapshots(): Promise<string[]> {
    const keys = await this.adapter.list(this.config.storageKey);
    return keys.map((key) => key.replace(`${this.config.storageKey}-`, ""));
  }

  /**
   * تحميل آخر لقطة
   */
  async loadLatestSnapshot(): Promise<CanvasSnapshot | null> {
    const snapshots = await this.listSnapshots();
    if (snapshots.length === 0) return null;

    // Load all and find latest
    let latest: CanvasSnapshot | null = null;
    for (const id of snapshots) {
      const snapshot = await this.loadSnapshot(id);
      if (snapshot && (!latest || snapshot.updatedAt > latest.updatedAt)) {
        latest = snapshot;
      }
    }

    return latest;
  }

  /**
   * حذف اللقطات القديمة
   */
  private async pruneOldSnapshots(): Promise<void> {
    const snapshots = await this.listSnapshots();
    if (snapshots.length <= this.config.maxSnapshots) return;

    // Load all snapshots to sort by date
    const withDates: Array<{ id: string; updatedAt: number }> = [];
    for (const id of snapshots) {
      const snapshot = await this.loadSnapshot(id);
      if (snapshot) {
        withDates.push({ id, updatedAt: snapshot.updatedAt });
      }
    }

    // Sort by date (oldest first)
    withDates.sort((a, b) => a.updatedAt - b.updatedAt);

    // Delete oldest
    const toDelete = withDates.slice(
      0,
      withDates.length - this.config.maxSnapshots
    );
    for (const { id } of toDelete) {
      await this.deleteSnapshot(id);
    }
  }

  /**
   * مسح جميع البيانات
   */
  async clearAll(): Promise<void> {
    await this.adapter.clear(this.config.storageKey);
  }

  /**
   * تنظيف
   */
  destroy(): void {
    this.stopAutoSave();
  }
}

// =============================================================================
// 📤 Export Functions
// =============================================================================

/**
 * تصدير الكانفاس كـ JSON
 */
export function exportCanvasAsJSON(snapshot: CanvasSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}

/**
 * استيراد الكانفاس من JSON
 */
export function importCanvasFromJSON(json: string): CanvasSnapshot {
  const snapshot = JSON.parse(json) as CanvasSnapshot;
  
  // Validate required fields
  if (!snapshot.id || !snapshot.elements || !Array.isArray(snapshot.elements)) {
    throw new Error("Invalid canvas snapshot format");
  }

  return snapshot;
}

/**
 * إنشاء لقطة من حالة الكانفاس الحالية
 */
export function createSnapshot(
  id: string,
  name: string,
  elements: CanvasElement[],
  layers: Layer[],
  viewport: Viewport,
  metadata?: Record<string, any>
): CanvasSnapshot {
  return {
    id,
    name,
    elements,
    layers,
    viewport,
    metadata: metadata || {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
  };
}

/**
 * تحديث لقطة موجودة
 */
export function updateSnapshot(
  snapshot: CanvasSnapshot,
  updates: Partial<Omit<CanvasSnapshot, "id" | "createdAt">>
): CanvasSnapshot {
  return {
    ...snapshot,
    ...updates,
    updatedAt: Date.now(),
    version: snapshot.version + 1,
  };
}

// =============================================================================
// 🔄 Room Persistence
// =============================================================================

/**
 * حفظ معلومات الغرفة
 */
export async function saveRoom(
  adapter: StorageAdapter,
  room: CanvasRoom
): Promise<void> {
  const key = `room-${room.id}`;
  const data = JSON.stringify(room);
  await adapter.save(key, data);
}

/**
 * تحميل معلومات الغرفة
 */
export async function loadRoom(
  adapter: StorageAdapter,
  roomId: string
): Promise<CanvasRoom | null> {
  const key = `room-${roomId}`;
  const data = await adapter.load(key);
  if (!data) return null;

  try {
    return JSON.parse(data) as CanvasRoom;
  } catch {
    return null;
  }
}

/**
 * الحصول على قائمة الغرف
 */
export async function listRooms(
  adapter: StorageAdapter
): Promise<CanvasRoom[]> {
  const keys = await adapter.list("room-");
  const rooms: CanvasRoom[] = [];

  for (const key of keys) {
    const data = await adapter.load(key);
    if (data) {
      try {
        rooms.push(JSON.parse(data));
      } catch {
        // Skip invalid entries
      }
    }
  }

  return rooms;
}

// =============================================================================
// 📤 Export
// =============================================================================

export const Persistence = {
  LocalStorageAdapter,
  IndexedDBAdapter,
  PersistenceManager,
  compressData,
  decompressData,
  exportCanvasAsJSON,
  importCanvasFromJSON,
  createSnapshot,
  updateSnapshot,
  saveRoom,
  loadRoom,
  listRooms,
};
