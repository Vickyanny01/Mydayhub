/**
 * Secure offline PIN hashing using SHA-256 with salt via Web Crypto API.
 */

export async function hashPin(pin: string, salt?: string): Promise<{ hash: string; salt: string }> {
  const currentSalt = salt || generateSalt();
  const encoder = new TextEncoder();
  const data = encoder.encode(currentSalt + '::myday-hub::' + pin);
  
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return {
    hash: hashHex,
    salt: currentSalt,
  };
}

export async function verifyPin(enteredPin: string, storedHash: string, storedSalt: string): Promise<boolean> {
  if (!enteredPin || !storedHash || !storedSalt) return false;
  const result = await hashPin(enteredPin, storedSalt);
  return result.hash === storedHash;
}

function generateSalt(): string {
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    const array = new Uint8Array(16);
    globalThis.crypto.getRandomValues(array);
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
