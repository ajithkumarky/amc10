import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#06070d',
          surface: '#0c0d1a',
          surface2: '#16181f',
          violet: '#1a0a2a',
          deepblue: '#0a1a2a',
          pink: '#ff2e9c',
          cyan: '#00e5ff',
          amber: '#ffd866',
          purple: '#6b1eff',
          ink: '#f0f4ff',
          mute: '#cdd6f4',
          dim: '#9aa0b4',
          line: '#232634',
        },
        topic: {
          algebra: '#ff2e9c',
          geometry: '#00e5ff',
          numbertheory: '#6b1eff',
          counting: '#ffd866',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
        ui: ['var(--font-ui)', 'sans-serif'],
      },
      backgroundImage: {
        'cyber-page':
          'linear-gradient(135deg, #0c0d1a 0%, #1a0a2a 50%, #0a1a2a 100%)',
        'cyber-grid':
          'linear-gradient(rgba(255,46,156,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.06) 1px, transparent 1px)',
        'cyber-chip': 'linear-gradient(90deg, #ff2e9c, #6b1eff)',
      },
      backgroundSize: {
        'grid-24': '24px 24px',
      },
    },
  },
  plugins: [],
};

export default config;
