import { Inter } from 'next/font/google';
import './globals.css';

import AppProviders from '@/components/providers/AppProviders';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Hash Cracker',
  description: 'A modern web application for cracking MD5, SHA1, and SHA256 hashes',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="antialiased">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className={inter.className}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
