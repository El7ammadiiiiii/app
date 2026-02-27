/**
 * Tracer API Client — Extended functions matching cways-tracker API surface
 * Adds: populate, save, list traces, intelligence, search
 */

import type {
  PopulateRequest,
  PopulateResponse,
  TraceObject,
  AddressIntelligence,
  IntelligenceSearchResult,
} from './tracer-types';

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => 'Unknown error');
    throw new Error(`API ${response.status}: ${text}`);
  }

  return response.json() as Promise<T>;
}

/* ── Trace CRUD ── */

/** Populate trace with new transfers (auto-poll endpoint) */
export async function populateTrace(payload: PopulateRequest): Promise<PopulateResponse> {
  return requestJson<PopulateResponse>('/api/onchain/trace/populate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Save trace state to Firebase */
export async function saveTrace(trace: TraceObject): Promise<{ success: boolean; uuid: string }> {
  return requestJson('/api/onchain/trace/save', {
    method: 'POST',
    body: JSON.stringify(trace),
  });
}

/** Get all saved traces for current user */
export async function getAllTraces(): Promise<{
  success: boolean;
  data?: Array<{
    uuid: string;
    title: string;
    rootAddress: string;
    rootChain: string;
    createdAt: number;
    updatedAt: number;
    nodeCount: number;
    edgeCount: number;
  }>;
}> {
  return requestJson('/api/onchain/trace/all');
}

/** Get a specific saved trace by UUID */
export async function getTrace(uuid: string): Promise<{
  success: boolean;
  data?: TraceObject;
}> {
  return requestJson(`/api/onchain/trace/get/${uuid}`);
}

/** Get recent traces */
export async function getRecentTraces(): Promise<{
  success: boolean;
  data?: Array<{
    uuid: string;
    title: string;
    rootAddress: string;
    updatedAt: number;
  }>;
}> {
  return requestJson('/api/onchain/trace/recent');
}

/** Set trace shareable status */
export async function setTraceShareable(
  uuid: string,
  shareable: boolean
): Promise<{ success: boolean }> {
  return requestJson('/api/onchain/trace/setShareable', {
    method: 'POST',
    body: JSON.stringify({ uuid, shareable }),
  });
}

/* ── Intelligence ── */

/** Get intelligence for an address (entity info, labels, balance) */
export async function getAddressIntelligence(
  address: string,
  chain: string = 'ethereum'
): Promise<{
  success: boolean;
  data?: AddressIntelligence;
}> {
  return requestJson(`/api/onchain/intelligence/address/${address}?chain=${chain}`);
}

/** Search for entities by name */
export async function searchIntelligence(
  query: string
): Promise<{
  success: boolean;
  data?: IntelligenceSearchResult[];
}> {
  return requestJson(`/api/onchain/intelligence/search?q=${encodeURIComponent(query)}`);
}

/** Get entity details by ID */
export async function getEntityById(
  entityId: string
): Promise<{
  success: boolean;
  data?: {
    id: string;
    name: string;
    type: string;
    iconUrl: string;
    addresses: Array<{ address: string; chain: string }>;
  };
}> {
  return requestJson(`/api/onchain/intelligence/entity/${entityId}`);
}

/* ── Re-export existing client functions ── */
export {
  fetchChainRegistry,
  buildTraceGraph,
  expandTraceNode,
  fetchEdgeDrilldown,
  fetchNodeDetails,
} from './client';
