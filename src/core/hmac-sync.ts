/**
 * HMAC implementation using native Web Crypto API
 * Available in all modern browsers (Chrome, Firefox, Safari)
 */

/**
 * Convert string to Uint8Array for Web Crypto API
 */
function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Convert ArrayBuffer to hex string
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate HMAC-SHA256 using Web Crypto API (async)
 */
async function generateHMAC(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  // Import the secret key
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // Generate HMAC
  const signature = await crypto.subtle.sign('HMAC', key, messageData);

  // Convert to hex
  return bufferToHex(signature);
}

/**
 * Generates a deterministic subdomain using HMAC-SHA256 (async)
 */
async function generateDeterministicSubdomain(
  userId: string,
  secret: string,
  domain: string
): Promise<string> {
  // Calculate day timestamp (changes at UTC midnight)
  const dayTimestamp = Math.floor(Date.now() / 1000 / 86400);
  const message = `${userId}${domain}${dayTimestamp}`;

  // HMAC calculation using Web Crypto API
  const hashHex = await generateHMAC(message, secret);

  // Return first 32 characters (DNS-safe subdomain)
  return hashHex.substring(0, 32);
}

/**
 * Generates the full OpenPIMS URL with subdomain (async)
 */
export async function generateOpenPIMSUrl(
  userId: string,
  secret: string,
  targetDomain: string,
  appDomain: string
): Promise<string> {
  const subdomain = await generateDeterministicSubdomain(userId, secret, targetDomain);
  return `https://${subdomain}.${appDomain}`;
}


/**
 * Same expiry functions as before (already synchronous)
 */
export function getSubdomainExpiryTime(): Date {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow;
}

export function getTimeUntilExpiry(): number {
  return getSubdomainExpiryTime().getTime() - Date.now();
}