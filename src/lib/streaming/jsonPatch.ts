/**
 * ═══════════════════════════════════════════════════════════════
 * Wave 7.7 — JSON Patch Streaming
 * ═══════════════════════════════════════════════════════════════
 *
 * RFC 6902 JSON Patch encoder/decoder for efficient incremental
 * updates to canvas artifacts and structured content.
 *
 * Instead of sending the full document on every edit, the server
 * can emit a stream of JSON Patch operations that the client
 * applies incrementally.
 *
 * Operations: add, remove, replace, move, copy, test
 */

// ═══ Types ═══

export type PatchOp =
  | { op: 'add'; path: string; value: unknown }
  | { op: 'remove'; path: string }
  | { op: 'replace'; path: string; value: unknown }
  | { op: 'move'; from: string; path: string }
  | { op: 'copy'; from: string; path: string }
  | { op: 'test'; path: string; value: unknown };

export type JsonPatch = PatchOp[];

// ═══ Encoder — Diff two objects to produce patches ═══

/**
 * Generate a JSON Patch (RFC 6902) from `original` to `modified`.
 * Supports nested objects and arrays (shallow array diff).
 */
export function createPatch(original: any, modified: any, basePath: string = ''): JsonPatch {
  const patches: JsonPatch = [];

  if (original === modified) return patches;

  // Primitive or null
  if (typeof original !== 'object' || typeof modified !== 'object' || original === null || modified === null) {
    if (original !== modified) {
      patches.push({ op: 'replace', path: basePath || '/', value: modified });
    }
    return patches;
  }

  // Arrays
  if (Array.isArray(original) && Array.isArray(modified)) {
    return diffArrays(original, modified, basePath);
  }

  // Objects
  const allKeys = new Set([...Object.keys(original), ...Object.keys(modified)]);

  for (const key of allKeys) {
    const escapedKey = escapeJsonPointer(key);
    const path = `${basePath}/${escapedKey}`;

    if (!(key in original)) {
      // Key added
      patches.push({ op: 'add', path, value: modified[key] });
    } else if (!(key in modified)) {
      // Key removed
      patches.push({ op: 'remove', path });
    } else {
      // Recurse
      patches.push(...createPatch(original[key], modified[key], path));
    }
  }

  return patches;
}

function diffArrays(original: any[], modified: any[], basePath: string): JsonPatch {
  const patches: JsonPatch = [];
  const maxLen = Math.max(original.length, modified.length);

  for (let i = 0; i < maxLen; i++) {
    const path = `${basePath}/${i}`;
    if (i >= original.length) {
      patches.push({ op: 'add', path: `${basePath}/-`, value: modified[i] });
    } else if (i >= modified.length) {
      // Remove from end to avoid index shifting
      patches.push({ op: 'remove', path: `${basePath}/${original.length - 1 - (i - modified.length)}` });
    } else if (JSON.stringify(original[i]) !== JSON.stringify(modified[i])) {
      patches.push({ op: 'replace', path, value: modified[i] });
    }
  }

  return patches;
}

// ═══ Decoder — Apply patches to a document ═══

/**
 * Apply a JSON Patch to a document (immutable — returns new object).
 * Throws if a `test` operation fails.
 */
export function applyPatch<T = any>(document: T, patches: JsonPatch): T {
  let result = structuredClone(document);

  for (const op of patches) {
    result = applyOperation(result, op);
  }

  return result;
}

function applyOperation(doc: any, op: PatchOp): any {
  switch (op.op) {
    case 'add':
      return setValueAtPath(doc, op.path, op.value, true);
    case 'remove':
      return removeValueAtPath(doc, op.path);
    case 'replace':
      return setValueAtPath(doc, op.path, op.value, false);
    case 'move': {
      const value = getValueAtPath(doc, op.from);
      let result = removeValueAtPath(doc, op.from);
      result = setValueAtPath(result, op.path, value, true);
      return result;
    }
    case 'copy': {
      const value = getValueAtPath(doc, op.from);
      return setValueAtPath(doc, op.path, structuredClone(value), true);
    }
    case 'test': {
      const actual = getValueAtPath(doc, op.path);
      if (JSON.stringify(actual) !== JSON.stringify(op.value)) {
        throw new Error(`Test failed: ${op.path} — expected ${JSON.stringify(op.value)}, got ${JSON.stringify(actual)}`);
      }
      return doc;
    }
    default:
      throw new Error(`Unknown patch op: ${(op as any).op}`);
  }
}

// ═══ JSON Pointer Helpers (RFC 6901) ═══

function parseJsonPointer(pointer: string): string[] {
  if (pointer === '' || pointer === '/') return [];
  return pointer
    .split('/')
    .slice(1)
    .map(unescapeJsonPointer);
}

function escapeJsonPointer(key: string): string {
  return key.replace(/~/g, '~0').replace(/\//g, '~1');
}

function unescapeJsonPointer(token: string): string {
  return token.replace(/~1/g, '/').replace(/~0/g, '~');
}

function getValueAtPath(doc: any, path: string): any {
  const tokens = parseJsonPointer(path);
  let current = doc;
  for (const token of tokens) {
    if (current === null || current === undefined) {
      throw new Error(`Path not found: ${path}`);
    }
    if (Array.isArray(current)) {
      current = current[parseInt(token)];
    } else {
      current = current[token];
    }
  }
  return current;
}

function setValueAtPath(doc: any, path: string, value: any, isAdd: boolean): any {
  const tokens = parseJsonPointer(path);

  if (tokens.length === 0) {
    return value; // Replace root
  }

  const result = structuredClone(doc);
  let current = result;

  for (let i = 0; i < tokens.length - 1; i++) {
    const token = tokens[i];
    if (Array.isArray(current)) {
      current = current[parseInt(token)];
    } else {
      current = current[token];
    }
  }

  const lastToken = tokens[tokens.length - 1];

  if (Array.isArray(current)) {
    if (lastToken === '-') {
      current.push(value);
    } else {
      const idx = parseInt(lastToken);
      if (isAdd) {
        current.splice(idx, 0, value);
      } else {
        current[idx] = value;
      }
    }
  } else {
    current[lastToken] = value;
  }

  return result;
}

function removeValueAtPath(doc: any, path: string): any {
  const tokens = parseJsonPointer(path);
  const result = structuredClone(doc);
  let current = result;

  for (let i = 0; i < tokens.length - 1; i++) {
    const token = tokens[i];
    if (Array.isArray(current)) {
      current = current[parseInt(token)];
    } else {
      current = current[token];
    }
  }

  const lastToken = tokens[tokens.length - 1];

  if (Array.isArray(current)) {
    current.splice(parseInt(lastToken), 1);
  } else {
    delete current[lastToken];
  }

  return result;
}

// ═══ SSE Patch Streaming Helpers ═══

/**
 * Encode a JSON Patch as an SSE event.
 * Format: `data: {"type":"json_patch","data":{"patches":[...]}}\n\n`
 */
export function encodePatchAsSSE(patches: JsonPatch): string {
  const event = {
    type: 'json_patch',
    data: { patches },
  };
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * Create a streaming patch encoder that compares successive document versions
 * and yields SSE-encoded patches.
 */
export function createPatchStream(): {
  push: (newDoc: any) => string | null;
  reset: () => void;
} {
  let previousDoc: any = null;

  return {
    push(newDoc: any): string | null {
      if (previousDoc === null) {
        previousDoc = structuredClone(newDoc);
        // First push — emit full replace as patch
        const patch: JsonPatch = [{ op: 'replace', path: '/', value: newDoc }];
        return encodePatchAsSSE(patch);
      }

      const patches = createPatch(previousDoc, newDoc);
      previousDoc = structuredClone(newDoc);

      if (patches.length === 0) return null;
      return encodePatchAsSSE(patches);
    },

    reset() {
      previousDoc = null;
    },
  };
}
