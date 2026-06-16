'use client';

import { useEffect } from 'react';

export function PWARegister() {
  useEffect(() => {
    // Only register on client side and if service workers are supported
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const registerServiceWorker = async () => {
        try {
          const reg = await navigator.serviceWorker.register('/sw.js');
          console.log('[PWA] Service Worker registered successfully, scope:', reg.scope);
        } catch (err) {
          console.error('[PWA] Service Worker registration failed:', err);
        }
      };

      // Register after page load is complete
      if (document.readyState === 'complete') {
        registerServiceWorker();
      } else {
        window.addEventListener('load', registerServiceWorker);
        return () => window.removeEventListener('load', registerServiceWorker);
      }
    }
  }, []);

  return null;
}
