/**
 * ═══════════════════════════════════════════════════════════════
 * Wave 7.8 — Client-side Encryption Bridge
 * ═══════════════════════════════════════════════════════════════
 *
 * Provides a clean async API for encrypting/decrypting data
 * via the Service Worker's AES-256-GCM implementation.
 *
 * Usage:
 *   import { swEncrypt, swDecrypt } from '@/lib/crypto/swCrypto';
 *   const encrypted = await swEncrypt("sensitive data");
 *   const decrypted = await swDecrypt(encrypted);
 */

interface SWCryptoResponse {
  success: boolean;
  data?: string;
  error?: string;
}

/**
 * Send a message to the service worker and await the response via MessageChannel.
 */
async function sendToSW(message: Record<string, unknown>): Promise<SWCryptoResponse> {
  const registration = await navigator.serviceWorker?.ready;
  if (!registration?.active) {
    throw new Error('Service Worker not available');
  }

  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timeout = setTimeout(() => {
      reject(new Error('SW encryption timeout (5s)'));
    }, 5000);

    channel.port1.onmessage = (event) => {
      clearTimeout(timeout);
      resolve(event.data as SWCryptoResponse);
    };

    registration.active!.postMessage(message, [channel.port2]);
  });
}

/**
 * Encrypt a string using AES-256-GCM via the Service Worker.
 * Returns a base64-encoded string (iv + ciphertext).
 */
export async function swEncrypt(plaintext: string, keyId: string = 'default'): Promise<string> {
  const response = await sendToSW({ action: 'encrypt', payload: plaintext, keyId });
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Encryption failed');
  }
  return response.data;
}

/**
 * Decrypt a base64-encoded ciphertext using AES-256-GCM via the Service Worker.
 * Returns the original plaintext string.
 */
export async function swDecrypt(encrypted: string, keyId: string = 'default'): Promise<string> {
  const response = await sendToSW({ action: 'decrypt', payload: encrypted, keyId });
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Decryption failed');
  }
  return response.data;
}

/**
 * Generate (or ensure existence of) an encryption key in the SW.
 */
export async function swGenerateKey(keyId: string = 'default'): Promise<void> {
  const response = await sendToSW({ action: 'generateKey', keyId });
  if (!response.success) {
    throw new Error(response.error || 'Key generation failed');
  }
}

/**
 * Delete an encryption key from the SW key store.
 */
export async function swDeleteKey(keyId: string = 'default'): Promise<void> {
  const response = await sendToSW({ action: 'deleteKey', keyId });
  if (!response.success) {
    throw new Error(response.error || 'Key deletion failed');
  }
}

/**
 * Check whether the SW encryption bridge is available.
 */
export async function isSWCryptoAvailable(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator)) return false;
    const reg = await navigator.serviceWorker.ready;
    return !!reg?.active;
  } catch {
    return false;
  }
}
