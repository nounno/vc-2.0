import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'vt-fg': '#f8fafc',
        'vt-fg-2': '#cbd5e1',
        'vt-muted': '#64748b',
        'vt-border': '#263246',
        'vt-border-soft': '#1c2638',
        'vt-accent': '#38bdf8',
        'vt-accent-on': '#070b12',
        'vt-surface': '#101826',
        'vt-surface-2': '#162238',
      },
    },
  },
  plugins: [],
};
export default config;
