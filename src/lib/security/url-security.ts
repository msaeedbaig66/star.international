/**
 * Security utilities for URL validation to prevent XSS (Cross-Site Scripting) via protocols like javascript:
 */

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const DATA_IMAGE_PATTERN = /^data:image\/(?:png|jpe?g|webp|gif);base64,[a-z0-9+/=\s]+$/i;

/**
 * Validates if a URL is safe for use in href or src attributes.
 * Prevents javascript: and other executable protocols.
 */
export function isSafeUrl(value: string | null | undefined, allowDataImage = false): boolean {
 if (!value) return false;
 const trimmed = value.trim();
 if (!trimmed) return false;

 // Allow relative paths (e.g., /marketplace, ./profile)
 if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
 return true;
 }

 // Allow anchor links
 if (trimmed.startsWith('#')) {
 return true;
 }

 if (allowDataImage && DATA_IMAGE_PATTERN.test(trimmed)) {
 return true;
 }

 try {
 // We use a base URL to handle absolute-looking paths that aren't actually absolute
 const parsed = new URL(trimmed, 'https://allpanga.local');
 return ALLOWED_PROTOCOLS.has(parsed.protocol);
 } catch {
 // If URL parsing fails, it's likely not a standard absolute URL. 
 // Since we already handled relative paths, we'll block it to be safe.
 return false;
 }
}

/**
 * Returns the URL if safe, otherwise returns a fallback (defaulting to '#').
 */
export function getSafeHref(url: string | null | undefined, fallback = '#'): string {
 if (isSafeUrl(url)) {
 return url!;
 }
 return fallback;
}
