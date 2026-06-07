import { Bebas_Neue, Inter, JetBrains_Mono, Rajdhani } from 'next/font/google';

export const display = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const body = Rajdhani({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const mono = JetBrains_Mono({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const ui = Inter({
  subsets: ['latin'],
  variable: '--font-ui',
  display: 'swap',
});
