import type { MetadataRoute } from 'next';
const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: `${base}/`,
    name: 'LutongPinoy — Filipino Meal Planner',
    short_name: 'LutongPinoy',
    description: 'Your Filipino family cooking planner, recipes and grocery list.',
    start_url: `${base}/`,
    scope: `${base}/`,
    display: 'standalone',
    background_color: '#faf8f2',
    theme_color: '#24483b',
    categories: ['food', 'lifestyle', 'productivity'],
    icons: [
      { src: `${base}/icons/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `${base}/icons/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' }
    ],
  };
}
