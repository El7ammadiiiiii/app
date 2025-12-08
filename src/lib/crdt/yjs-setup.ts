// =============================================================================
// 📦 CCCWAYS Canvas - Yjs CRDT Setup
// إعداد Yjs للتعاون في الوقت الفعلي
// =============================================================================

import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
// import { IndexeddbPersistence } from "y-indexeddb"; // Optional: install y-indexeddb if needed
import type { CanvasElement, Point } from "@/types/canvas";
import type { CollaboratorInfo, AwarenessState } from "@/types/collaboration";

// =============================================================================
// ⚙️ Configuration
// =============================================================================

export interface YjsConfig {
  websocketUrl: string;
  roomId: string;
  userId: string;
  userName: string;
  userColor: string;
  enablePersistence?: boolean;
  reconnectTimeout?: number;
}

export const DEFAULT_YJS_CONFIG: Partial<YjsConfig> = {
  websocketUrl: "wss://cccways-collab.example.com",
  enablePersistence: true,
  reconnectTimeout: 3000,
};

// =============================================================================
// 🔄 Yjs Document Structure
// =============================================================================

export interface CanvasYDoc {
  doc: Y.Doc;
  elements: Y.Map<Y.Map<any>>;
  layers: Y.Array<Y.Map<any>>;
  metadata: Y.Map<any>;
  undoManager: Y.UndoManager;
  provider: WebsocketProvider | null;
  persistence: any; // IndexeddbPersistence when y-indexeddb is installed
}

// =============================================================================
// 🚀 Document Creation
// =============================================================================

/**
 * إنشاء مستند Yjs جديد للكانفاس
 */
export function createCanvasDocument(roomId: string): Y.Doc {
  const doc = new Y.Doc({
    guid: `canvas-${roomId}`,
  });
  return doc;
}

/**
 * الحصول على خريطة العناصر
 */
export function getElementsMap(doc: Y.Doc): Y.Map<Y.Map<any>> {
  return doc.getMap("elements");
}

/**
 * الحصول على مصفوفة الطبقات
 */
export function getLayersArray(doc: Y.Doc): Y.Array<Y.Map<any>> {
  return doc.getArray("layers");
}

/**
 * الحصول على البيانات الوصفية
 */
export function getMetadata(doc: Y.Doc): Y.Map<any> {
  return doc.getMap("metadata");
}

// =============================================================================
// 🔌 Connection Management
// =============================================================================

export interface ConnectionCallbacks {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onSynced?: () => void;
  onError?: (error: Error) => void;
  onStatusChange?: (status: "connecting" | "connected" | "disconnected") => void;
}

/**
 * إنشاء مزود WebSocket
 */
export function createWebsocketProvider(
  doc: Y.Doc,
  config: YjsConfig,
  callbacks?: ConnectionCallbacks
): WebsocketProvider {
  const provider = new WebsocketProvider(
    config.websocketUrl,
    config.roomId,
    doc,
    {
      connect: true,
      resyncInterval: config.reconnectTimeout || 3000,
    }
  );

  // Event listeners
  provider.on("status", ({ status }: { status: string }) => {
    callbacks?.onStatusChange?.(status as "connecting" | "connected" | "disconnected");
    
    if (status === "connected") {
      callbacks?.onConnect?.();
    } else if (status === "disconnected") {
      callbacks?.onDisconnect?.();
    }
  });

  provider.on("sync", (synced: boolean) => {
    if (synced) {
      callbacks?.onSynced?.();
    }
  });

  provider.on("connection-error", (event: Event, _provider: WebsocketProvider) => {
    callbacks?.onError?.(new Error("Connection error"));
  });

  return provider;
}

/**
 * إنشاء مزود التخزين المحلي
 * Note: Requires y-indexeddb package to be installed
 */
export function createPersistence(
  doc: Y.Doc,
  roomId: string,
  callbacks?: {
    onSynced?: () => void;
  }
): any {
  // IndexeddbPersistence requires y-indexeddb package
  // For now, return a mock persistence object
  console.warn("IndexedDB persistence disabled. Install y-indexeddb for local storage support.");
  return {
    on: (_event: string, _callback: () => void) => {},
    destroy: () => {},
  };
}

// =============================================================================
// 📦 Full Canvas CRDT Setup
// =============================================================================

/**
 * إنشاء نظام CRDT كامل للكانفاس
 */
export function setupCanvasCRDT(
  config: YjsConfig,
  callbacks?: ConnectionCallbacks
): CanvasYDoc {
  const doc = createCanvasDocument(config.roomId);
  const elements = getElementsMap(doc);
  const layers = getLayersArray(doc);
  const metadata = getMetadata(doc);

  // Create undo manager for elements
  const undoManager = new Y.UndoManager(elements, {
    trackedOrigins: new Set([config.userId]),
  });

  // Setup websocket provider
  const provider = createWebsocketProvider(doc, config, callbacks);

  // Set user info in awareness
  provider.awareness.setLocalStateField("user", {
    id: config.userId,
    name: config.userName,
    color: config.userColor,
    cursor: null,
  } as Partial<AwarenessState>);

  // Setup persistence if enabled
  let persistence: any = null;
  if (config.enablePersistence) {
    persistence = createPersistence(doc, config.roomId);
  }

  return {
    doc,
    elements,
    layers,
    metadata,
    undoManager,
    provider,
    persistence,
  };
}

/**
 * تنظيف نظام CRDT
 */
export function destroyCanvasCRDT(crdt: CanvasYDoc): void {
  crdt.undoManager.destroy();
  crdt.provider?.disconnect();
  crdt.provider?.destroy();
  crdt.persistence?.destroy();
  crdt.doc.destroy();
}

// =============================================================================
// 🔄 Element Synchronization
// =============================================================================

/**
 * تحويل عنصر كانفاس إلى خريطة Yjs
 */
export function elementToYMap(element: CanvasElement): Y.Map<any> {
  const yElement = new Y.Map<any>();

  // Base properties
  yElement.set("id", element.id);
  yElement.set("type", element.type);
  yElement.set("x", element.x);
  yElement.set("y", element.y);
  yElement.set("width", element.width);
  yElement.set("height", element.height);
  yElement.set("rotation", element.rotation);
  yElement.set("visible", element.visible);
  yElement.set("locked", element.locked);
  yElement.set("layerId", element.layerId);
  // zIndex removed - not part of CanvasElement type

  // Stroke options
  if (element.stroke) {
    const yStroke = new Y.Map<any>();
    yStroke.set("color", element.stroke.color);
    yStroke.set("width", element.stroke.width);
    yStroke.set("style", element.stroke.style);
    yStroke.set("opacity", element.stroke.opacity);
    yElement.set("stroke", yStroke);
  }

  // Fill options
  if (element.fill) {
    const yFill = new Y.Map<any>();
    yFill.set("color", element.fill.color);
    yFill.set("opacity", element.fill.opacity);
    // pattern removed - not part of FillOptions type
    yElement.set("fill", yFill);
  }

  // Type-specific properties
  switch (element.type) {
    case "shape":
      yElement.set("shapeType", (element as any).shapeType);
      yElement.set("cornerRadius", (element as any).cornerRadius);
      yElement.set("sides", (element as any).sides);
      yElement.set("innerRadius", (element as any).innerRadius);
      break;

    case "freehand":
      const yPoints = new Y.Array<any>();
      ((element as any).points || []).forEach((point: Point) => {
        const yPoint = new Y.Map<any>();
        yPoint.set("x", point.x);
        yPoint.set("y", point.y);
        yPoints.push([yPoint]);
      });
      yElement.set("points", yPoints);
      yElement.set("smoothing", (element as any).smoothing);
      yElement.set("pressure", (element as any).pressure);
      break;

    case "text":
      yElement.set("content", (element as any).content);
      const yTextOptions = new Y.Map<any>();
      const textOpts = (element as any).textOptions || {};
      yTextOptions.set("fontFamily", textOpts.fontFamily);
      yTextOptions.set("fontSize", textOpts.fontSize);
      yTextOptions.set("fontWeight", textOpts.fontWeight);
      yTextOptions.set("fontStyle", textOpts.fontStyle);
      yTextOptions.set("textAlign", textOpts.textAlign);
      yTextOptions.set("lineHeight", textOpts.lineHeight);
      yTextOptions.set("letterSpacing", textOpts.letterSpacing);
      yElement.set("textOptions", yTextOptions);
      break;

    case "image":
      yElement.set("src", (element as any).src);
      yElement.set("originalWidth", (element as any).originalWidth);
      yElement.set("originalHeight", (element as any).originalHeight);
      yElement.set("filter", (element as any).filter);
      yElement.set("cropArea", (element as any).cropArea);
      break;

    case "sticky":
      yElement.set("content", (element as any).content);
      yElement.set("color", (element as any).color);
      yElement.set("author", (element as any).author);
      break;

    case "connector":
      yElement.set("startElementId", (element as any).startElementId);
      yElement.set("endElementId", (element as any).endElementId);
      const yStartPoint = new Y.Map<any>();
      yStartPoint.set("x", (element as any).startPoint?.x);
      yStartPoint.set("y", (element as any).startPoint?.y);
      yElement.set("startPoint", yStartPoint);
      const yEndPoint = new Y.Map<any>();
      yEndPoint.set("x", (element as any).endPoint?.x);
      yEndPoint.set("y", (element as any).endPoint?.y);
      yElement.set("endPoint", yEndPoint);
      yElement.set("connectorType", (element as any).connectorType);
      yElement.set("startArrow", (element as any).startArrow);
      yElement.set("endArrow", (element as any).endArrow);
      break;

    case "frame":
      yElement.set("name", (element as any).name);
      yElement.set("backgroundColor", (element as any).backgroundColor);
      yElement.set("showName", (element as any).showName);
      yElement.set("clipContent", (element as any).clipContent);
      const yChildren = new Y.Array<string>();
      ((element as any).children || []).forEach((id: string) => {
        yChildren.push([id]);
      });
      yElement.set("children", yChildren);
      break;

    case "embed":
      yElement.set("url", (element as any).url);
      yElement.set("embedType", (element as any).embedType);
      yElement.set("thumbnail", (element as any).thumbnail);
      yElement.set("title", (element as any).title);
      break;
  }

  yElement.set("metadata", element.metadata);
  yElement.set("createdAt", element.createdAt);
  yElement.set("updatedAt", element.updatedAt);
  yElement.set("createdBy", element.createdBy);

  return yElement;
}

/**
 * تحويل خريطة Yjs إلى عنصر كانفاس
 */
export function yMapToElement(yElement: Y.Map<any>): CanvasElement {
  const type = yElement.get("type");

  const base = {
    id: yElement.get("id"),
    type,
    x: yElement.get("x"),
    y: yElement.get("y"),
    width: yElement.get("width"),
    height: yElement.get("height"),
    rotation: yElement.get("rotation") || 0,
    visible: yElement.get("visible") ?? true,
    locked: yElement.get("locked") ?? false,
    layerId: yElement.get("layerId"),
    zIndex: yElement.get("zIndex"),
    stroke: yElement.get("stroke")
      ? {
          color: yElement.get("stroke").get("color"),
          width: yElement.get("stroke").get("width"),
          style: yElement.get("stroke").get("style"),
          opacity: yElement.get("stroke").get("opacity"),
        }
      : undefined,
    fill: yElement.get("fill")
      ? {
          color: yElement.get("fill").get("color"),
          opacity: yElement.get("fill").get("opacity"),
          pattern: yElement.get("fill").get("pattern"),
        }
      : undefined,
    metadata: yElement.get("metadata") || {},
    createdAt: yElement.get("createdAt"),
    updatedAt: yElement.get("updatedAt"),
    createdBy: yElement.get("createdBy"),
  };

  switch (type) {
    case "shape":
      return {
        ...base,
        shapeType: yElement.get("shapeType"),
        cornerRadius: yElement.get("cornerRadius"),
        sides: yElement.get("sides"),
        innerRadius: yElement.get("innerRadius"),
      } as any;

    case "freehand":
      const yPoints = yElement.get("points") as Y.Array<Y.Map<any>>;
      const points: Point[] = [];
      if (yPoints) {
        yPoints.forEach((yPoint: Y.Map<any>) => {
          points.push({
            x: yPoint.get("x"),
            y: yPoint.get("y"),
          });
        });
      }
      return {
        ...base,
        points,
        smoothing: yElement.get("smoothing"),
        pressure: yElement.get("pressure"),
      } as any;

    case "text":
      const yTextOpts = yElement.get("textOptions") as Y.Map<any>;
      return {
        ...base,
        content: yElement.get("content"),
        textOptions: yTextOpts
          ? {
              fontFamily: yTextOpts.get("fontFamily"),
              fontSize: yTextOpts.get("fontSize"),
              fontWeight: yTextOpts.get("fontWeight"),
              fontStyle: yTextOpts.get("fontStyle"),
              textAlign: yTextOpts.get("textAlign"),
              lineHeight: yTextOpts.get("lineHeight"),
              letterSpacing: yTextOpts.get("letterSpacing"),
            }
          : undefined,
      } as any;

    case "image":
      return {
        ...base,
        src: yElement.get("src"),
        originalWidth: yElement.get("originalWidth"),
        originalHeight: yElement.get("originalHeight"),
        filter: yElement.get("filter"),
        cropArea: yElement.get("cropArea"),
      } as any;

    case "sticky":
      return {
        ...base,
        content: yElement.get("content"),
        color: yElement.get("color"),
        author: yElement.get("author"),
      } as any;

    case "connector":
      const yStart = yElement.get("startPoint") as Y.Map<any>;
      const yEnd = yElement.get("endPoint") as Y.Map<any>;
      return {
        ...base,
        startElementId: yElement.get("startElementId"),
        endElementId: yElement.get("endElementId"),
        startPoint: yStart ? { x: yStart.get("x"), y: yStart.get("y") } : undefined,
        endPoint: yEnd ? { x: yEnd.get("x"), y: yEnd.get("y") } : undefined,
        connectorType: yElement.get("connectorType"),
        startArrow: yElement.get("startArrow"),
        endArrow: yElement.get("endArrow"),
      } as any;

    case "frame":
      const yChildren = yElement.get("children") as Y.Array<string>;
      const children: string[] = [];
      if (yChildren) {
        yChildren.forEach((id: string) => {
          children.push(id);
        });
      }
      return {
        ...base,
        name: yElement.get("name"),
        backgroundColor: yElement.get("backgroundColor"),
        showName: yElement.get("showName"),
        clipContent: yElement.get("clipContent"),
        children,
      } as any;

    case "embed":
      return {
        ...base,
        url: yElement.get("url"),
        embedType: yElement.get("embedType"),
        thumbnail: yElement.get("thumbnail"),
        title: yElement.get("title"),
      } as any;

    default:
      return base as any;
  }
}

// =============================================================================
// 📝 Element Operations
// =============================================================================

/**
 * إضافة عنصر جديد
 */
export function addElement(
  crdt: CanvasYDoc,
  element: CanvasElement,
  origin?: string
): void {
  crdt.doc.transact(() => {
    const yElement = elementToYMap(element);
    crdt.elements.set(element.id, yElement);
  }, origin);
}

/**
 * تحديث عنصر
 */
export function updateElement(
  crdt: CanvasYDoc,
  elementId: string,
  updates: Partial<CanvasElement>,
  origin?: string
): void {
  crdt.doc.transact(() => {
    const yElement = crdt.elements.get(elementId);
    if (yElement) {
      Object.entries(updates).forEach(([key, value]) => {
        if (key === "stroke" && value) {
          const yStroke = yElement.get("stroke") || new Y.Map();
          Object.entries(value as object).forEach(([k, v]) => {
            yStroke.set(k, v);
          });
          yElement.set("stroke", yStroke);
        } else if (key === "fill" && value) {
          const yFill = yElement.get("fill") || new Y.Map();
          Object.entries(value as object).forEach(([k, v]) => {
            yFill.set(k, v);
          });
          yElement.set("fill", yFill);
        } else {
          yElement.set(key, value);
        }
      });
      yElement.set("updatedAt", Date.now());
    }
  }, origin);
}

/**
 * حذف عنصر
 */
export function deleteElement(
  crdt: CanvasYDoc,
  elementId: string,
  origin?: string
): void {
  crdt.doc.transact(() => {
    crdt.elements.delete(elementId);
  }, origin);
}

/**
 * الحصول على جميع العناصر
 */
export function getAllElements(crdt: CanvasYDoc): CanvasElement[] {
  const elements: CanvasElement[] = [];
  crdt.elements.forEach((yElement) => {
    elements.push(yMapToElement(yElement));
  });
  return elements;
}

// =============================================================================
// ⏪ Undo/Redo
// =============================================================================

/**
 * تراجع
 */
export function undo(crdt: CanvasYDoc): void {
  crdt.undoManager.undo();
}

/**
 * إعادة
 */
export function redo(crdt: CanvasYDoc): void {
  crdt.undoManager.redo();
}

/**
 * التحقق من إمكانية التراجع
 */
export function canUndo(crdt: CanvasYDoc): boolean {
  return crdt.undoManager.canUndo();
}

/**
 * التحقق من إمكانية الإعادة
 */
export function canRedo(crdt: CanvasYDoc): boolean {
  return crdt.undoManager.canRedo();
}

// =============================================================================
// 📡 Event Listeners
// =============================================================================

export type ElementChangeCallback = (
  added: CanvasElement[],
  updated: CanvasElement[],
  deleted: string[]
) => void;

/**
 * الاستماع لتغييرات العناصر
 */
export function observeElements(
  crdt: CanvasYDoc,
  callback: ElementChangeCallback
): () => void {
  const handler = (event: Y.YMapEvent<Y.Map<any>>) => {
    const added: CanvasElement[] = [];
    const updated: CanvasElement[] = [];
    const deleted: string[] = [];

    event.changes.keys.forEach((change, key) => {
      if (change.action === "add") {
        const yElement = crdt.elements.get(key);
        if (yElement) {
          added.push(yMapToElement(yElement));
        }
      } else if (change.action === "update") {
        const yElement = crdt.elements.get(key);
        if (yElement) {
          updated.push(yMapToElement(yElement));
        }
      } else if (change.action === "delete") {
        deleted.push(key);
      }
    });

    if (added.length > 0 || updated.length > 0 || deleted.length > 0) {
      callback(added, updated, deleted);
    }
  };

  crdt.elements.observe(handler);

  return () => {
    crdt.elements.unobserve(handler);
  };
}

// =============================================================================
// 📤 Export
// =============================================================================

export const YjsSetup = {
  createCanvasDocument,
  getElementsMap,
  getLayersArray,
  getMetadata,
  createWebsocketProvider,
  createPersistence,
  setupCanvasCRDT,
  destroyCanvasCRDT,
  elementToYMap,
  yMapToElement,
  addElement,
  updateElement,
  deleteElement,
  getAllElements,
  undo,
  redo,
  canUndo,
  canRedo,
  observeElements,
};
