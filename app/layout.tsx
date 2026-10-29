import type { Metadata, Viewport } from 'next';
import './globals.css';
import PwaRegister from '@/components/PwaRegister';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
export const metadata: Metadata = {
  title: 'LutongPinoy — Anong lulutuin natin?',
  description: '106 Filipino recipes, daily/weekly/monthly rotating family meal plans, ingredients, cooking instructions and smart grocery lists.',
  applicationName: 'LutongPinoy',
  manifest: `${basePath}/manifest.webmanifest`,
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'LutongPinoy' },
  icons: { icon: `${basePath}/icons/icon-192.png`, apple: `${basePath}/icons/icon-192.png` },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#24483b' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><PwaRegister />{children}</body></html>;
}
