/**
 * ═══════════════════════════════════════════════════════════════
 * Wave 6.1 — General-Purpose Service Worker
 * + Wave 7.8 — AES-GCM Encryption Layer
 * ═══════════════════════════════════════════════════════════════
 * Workbox-style caching strategies implemented natively:
 *   - Cache-first for static assets (JS/CSS/fonts/images)
 *   - Network-first for API routes
 *   - Stale-while-revalidate for HTML pages
 *   - Offline fallback page
 *   - Push notifications support
 *   - AES-256-GCM encryption for sensitive cached data
 */

const CACHE_VERSION = "ccways-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Static assets to precache on install
const PRECACHE_URLS = [
  "/",
  "/chat",
  "/offline.html",
];

// ═══ Install: precache critical assets ═══
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {
        // Silently fail for individual items
        console.warn("[SW] Some precache items failed");
      });
    })
  );
  self.skipWaiting();
});

// ═══ Activate: clean old caches ═══
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("ccways-") && key !== STATIC_CACHE && key !== DYNAMIC_CACHE && key !== API_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ═══ Fetch strategies ═══
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and chrome-extension requests
  if (request.method !== "GET" || url.protocol === "chrome-extension:") return;

  // API routes → Network-first with cache fallback (30s TTL)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, API_CACHE, 30000));
    return;
  }

  // Static assets → Cache-first
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // HTML pages → Stale-while-revalidate
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
    return;
  }

  // Everything else → Network with cache fallback
  event.respondWith(networkFirst(request, DYNAMIC_CACHE, 10000));
});

// ═══ Push notification support ═══
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || "CCWAYS";
  const options = {
    body: data.body || "تحديث جديد",
    icon: "/icon-192.png",
    badge: "/icon-badge.png",
    tag: data.tag || "default",
    data: { url: data.url || "/chat" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/chat";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});

// ═══ Strategy implementations ═══
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}

async function networkFirst(request, cacheName, timeout = 5000) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timer);

    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    // Offline fallback for HTML
    if (request.headers.get("accept")?.includes("text/html")) {
      const fallback = await caches.match("/offline.html");
      if (fallback) return fallback;
    }
    return new Response("Offline", { status: 503 });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached || (await fetchPromise) || new Response("Offline", { status: 503 });
}

function isStaticAsset(pathname) {
  return /\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|webp|ico|json)$/i.test(pathname) ||
    pathname.startsWith("/_next/static/");
}

// ═══════════════════════════════════════════════════════════════
// Wave 7.8 — AES-256-GCM Encryption Layer
// ═══════════════════════════════════════════════════════════════
//
// Provides encrypt/decrypt for sensitive data stored in caches
// or IndexedDB. Uses Web Crypto API (available in SW context).
//
// Message API from main thread:
//   { action: "encrypt", payload: string, keyId?: string }
//   { action: "decrypt", payload: string, keyId?: string }
//   { action: "generateKey", keyId: string }
//   { action: "deleteKey", keyId: string }

const ENCRYPTION_DB_NAME = "ccways-keys";
const ENCRYPTION_DB_VERSION = 1;
const KEY_STORE_NAME = "crypto-keys";

// ── IndexedDB helpers for key persistence ──

function openKeyDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(ENCRYPTION_DB_NAME, ENCRYPTION_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(KEY_STORE_NAME)) {
        db.createObjectStore(KEY_STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function storeKey(keyId, cryptoKey) {
  const db = await openKeyDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEY_STORE_NAME, "readwrite");
    tx.objectStore(KEY_STORE_NAME).put(cryptoKey, keyId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadKey(keyId) {
  const db = await openKeyDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEY_STORE_NAME, "readonly");
    const req = tx.objectStore(KEY_STORE_NAME).get(keyId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function removeKey(keyId) {
  const db = await openKeyDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEY_STORE_NAME, "readwrite");
    tx.objectStore(KEY_STORE_NAME).delete(keyId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Key management ──

async function getOrCreateKey(keyId = "default") {
  let key = await loadKey(keyId);
  if (key) return key;

  key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false, // non-extractable for security
    ["encrypt", "decrypt"]
  );
  await storeKey(keyId, key);
  return key;
}

// ── Encrypt / Decrypt ──

async function encryptData(plaintext, keyId = "default") {
  const key = await getOrCreateKey(keyId);
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );

  // Encode as base64: iv + ciphertext
  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.byteLength);

  return arrayBufferToBase64(combined.buffer);
}

async function decryptData(encryptedBase64, keyId = "default") {
  const key = await getOrCreateKey(keyId);
  const combined = base64ToArrayBuffer(encryptedBase64);
  const combinedArr = new Uint8Array(combined);

  const iv = combinedArr.slice(0, 12);
  const ciphertext = combinedArr.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

// ── Base64 helpers ──

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// ── Message handler for encryption requests from main thread ──

self.addEventListener("message", (event) => {
  const { action, payload, keyId } = event.data || {};

  if (!action) return;

  const respond = (data) => {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage(data);
    }
  };

  switch (action) {
    case "encrypt":
      encryptData(payload, keyId)
        .then((encrypted) => respond({ success: true, data: encrypted }))
        .catch((err) => respond({ success: false, error: err.message }));
      break;

    case "decrypt":
      decryptData(payload, keyId)
        .then((decrypted) => respond({ success: true, data: decrypted }))
        .catch((err) => respond({ success: false, error: err.message }));
      break;

    case "generateKey":
      getOrCreateKey(keyId || "default")
        .then(() => respond({ success: true }))
        .catch((err) => respond({ success: false, error: err.message }));
      break;

    case "deleteKey":
      removeKey(keyId || "default")
        .then(() => respond({ success: true }))
        .catch((err) => respond({ success: false, error: err.message }));
      break;
  }
});
