import type { Metadata } from 'next';
import './globals.css';
import { body, display, mono, ui } from './fonts';
import { GridBg } from '@/components/theme/grid-bg';
import { Nav } from '@/components/nav';

export const metadata: Metadata = {
  title: 'AMC // 10',
  description: 'A private AMC10 practice arena.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable} ${ui.variable}`}
    >
      <body>
        <GridBg />
        <Nav active="home" />
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
