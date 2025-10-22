/**
 * Polyfills for older browsers and mobile devices
 * ALSO: Firebase App Check debug token initialization (MUST be first!)
 */

// ═══════════════════════════════════════════════════════════════════════════
// CRITICAL: Firebase App Check Debug Token
// MUST be set BEFORE any Firebase SDK code loads
// This allows development on localhost, LAN (192.168.x.x), and mobile devices
// ═══════════════════════════════════════════════════════════════════════════
const debugToken =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN) ||
  'tourfeedbackhub-dev-debug-token';

if (typeof window !== 'undefined') {
  // Check if we should enable debug token
  // Use multiple checks because Next.js may strip process.env in certain contexts
  const isLocalhost = window.location.hostname === 'localhost' ||
                      window.location.hostname === '127.0.0.1' ||
                      window.location.hostname.startsWith('192.168.') ||
                      window.location.hostname.startsWith('10.') ||
                      window.location.hostname.match(/^172\.(1[6-9]|2\d|3[01])\./);

  // Also check if running on non-HTTPS (dev indicator)
  const isLocalDev = window.location.protocol === 'http:' && isLocalhost;

  // Check NODE_ENV if available
  const nodeEnv = typeof process !== 'undefined' && process.env ? process.env.NODE_ENV : undefined;
  const isDevelopmentEnv = nodeEnv !== 'production';

  // Enable debug token if ANY of these conditions are true
  const shouldEnableDebugToken = isLocalDev || (isDevelopmentEnv && isLocalhost);

  if (shouldEnableDebugToken) {
    // @ts-ignore - Set debug token for Firebase App Check
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔓 Firebase App Check Debug Token ENABLED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Detection method:');
    console.log('  - Is localhost/LAN:', isLocalhost);
    console.log('  - Is HTTP (not HTTPS):', window.location.protocol === 'http:');
    console.log('  - NODE_ENV:', nodeEnv || 'undefined');
    console.log('');
    console.log('Current environment:');
    console.log('  - Domain:', window.location.hostname);
    console.log('  - URL:', window.location.href);
    console.log('  - Protocol:', window.location.protocol);
    console.log('  - Debug token:', debugToken);
    console.log('');
    console.log('✅ Firebase Auth/Firestore will work without reCAPTCHA');
    console.log('✅ No need to add domain to Firebase Console');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } else {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔒 PRODUCTION MODE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('App Check will enforce reCAPTCHA verification');
    console.log('Domain:', window.location.hostname);
    console.log('Protocol:', window.location.protocol);
    console.log('Ensure NEXT_PUBLIC_RECAPTCHA_KEY is set in .env.local');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Polyfill for crypto.randomUUID() - not available in older mobile browsers
// ═══════════════════════════════════════════════════════════════════════════
if (typeof globalThis !== 'undefined') {
  const cryptoObj = typeof globalThis.crypto !== 'undefined' 
    ? globalThis.crypto 
    : (typeof window !== 'undefined' && typeof window.crypto !== 'undefined' ? window.crypto : null);

  if (cryptoObj && !cryptoObj.randomUUID) {
    cryptoObj.randomUUID = function randomUUID(): string {
      // Use crypto.getRandomValues if available
      if (typeof cryptoObj.getRandomValues === 'function') {
        return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c: string) => {
          const num = parseInt(c, 10);
          return (num ^ (cryptoObj.getRandomValues(new Uint8Array(1))[0] & (15 >> (num / 4)))).toString(16);
        });
      }
      
      // Fallback to Math.random() for very old browsers
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    };
    
    console.log('[Polyfill] crypto.randomUUID() polyfilled for older browsers');
  }
}

export {};
