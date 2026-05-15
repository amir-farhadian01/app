import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'app-bg': '#0d0f1a',
        'app-bg-2': '#131624',
        'app-bg-3': '#1a1d2e',
        'app-text': '#f0f2ff',
        'app-text-2': '#8b90b0',
        'app-text-3': '#4a4f70',
        'app-card': '#1e2235',
        'app-card-2': '#242840',
        'app-border': '#2a2f4a',
        'app-border-2': '#363b5e',
        'app-input': '#1a1d2e',
        'app-primary': '#2b6eff',
        'app-primary-dim': '#1a3f99',
        'app-secondary': '#0fc98a',
        'app-accent': '#ff7a2b',
        'app-warn': '#ffb800',
        'app-red': '#ff4d4d',
        'app-purple': '#8b5cf6',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        'plus-jakarta': ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
