import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ variable: '--font-sans', subsets: ['latin', 'greek'] });

export const metadata: Metadata = {
  title: 'Keanita Admin',
  description: 'Dashboard διαχείρισης Keanita Kids Club',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="el" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
