/**
 * Polyfills for older browsers and mobile devices
 */

// Polyfill for crypto.randomUUID() - not available in older mobile browsers
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
