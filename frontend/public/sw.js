// Service Worker for Open Notebook PWA
// Using a network-first/network-only fallback strategy to ensure reliability and always-fresh content

const CACHE_NAME = 'open-notebook-pwa-v1';

self.addEventListener('install', (event) => {
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim any currently open clients immediately
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Network-only/Network-first approach: Let browser handle network requests normally.
  // This satisfies PWA install criteria without risking stuck cached states for dynamic API data.
  event.respondWith(fetch(event.request));
});
