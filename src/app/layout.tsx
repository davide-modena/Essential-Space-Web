import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { THEME_INIT_SCRIPT } from '@/lib/theme';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';

const ndot57 = localFont({
  src: '../../public/fonts/Ndot57Caps-Regular.otf',
  variable: '--font-ndot57',
  display: 'swap',
  weight: '400',
});

const ndot55 = localFont({
  src: '../../public/fonts/Ndot55Caps-Regular.otf',
  variable: '--font-ndot55',
  display: 'swap',
  weight: '400',
});

const ndotOriginal = localFont({
  src: '../../public/fonts/ndot.otf',
  variable: '--font-ndot-orig',
  display: 'swap',
  weight: '400',
});

export const metadata: Metadata = {
  title: 'ESSENTIAL SPACE // WEB',
  description: 'Self-hosted web dashboard for Nothing OS Essential Space notes, audio transcriptions, and tasks.',
  applicationName: 'Essential Space',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Essential',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F5F5F3' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body
        suppressHydrationWarning
        className={`${ndot55.variable} ${ndot57.variable} ${ndotOriginal.variable} bg-black text-nothing-light min-h-screen selection:bg-nothing-red selection:text-white`}
      >
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
