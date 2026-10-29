'use client';
import { useEffect } from 'react';
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';
export default function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      // The worker's scope is restricted to this app (also on GitHub Pages subpaths).
      navigator.serviceWorker.register(`${BASE}/sw.js`, { scope: `${BASE}/` }).then(async registration => {
        const ready = await navigator.serviceWorker.ready;
        const assets = Array.from(document.querySelectorAll<HTMLScriptElement | HTMLLinkElement>('script[src],link[href]'))
          .map(el => el instanceof HTMLScriptElement ? el.src : el.href)
          .filter(url => url && new URL(url).origin === location.origin);
        ready.active?.postMessage({ type: 'WARM_CACHE', urls: assets });
      }).catch(() => {});
    }
  }, []);
  return null;
}
