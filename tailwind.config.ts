import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Theme-aware: values come from CSS variables in globals.css
        white: 'rgb(var(--c-fg) / <alpha-value>)',
        black: 'rgb(var(--c-bg) / <alpha-value>)',
        nothing: {
          black: 'rgb(var(--c-bg) / <alpha-value>)',
          dark: 'rgb(var(--c-dark) / <alpha-value>)',
          card: 'rgb(var(--c-card) / <alpha-value>)',
          hover: 'rgb(var(--c-hover) / <alpha-value>)',
          border: 'rgb(var(--c-border) / <alpha-value>)',
          red: '#D71921',
          'red-hover': '#B8141B',
          gray: 'rgb(var(--c-gray) / <alpha-value>)',
          muted: 'rgb(var(--c-gray) / <alpha-value>)',
          light: 'rgb(var(--c-light) / <alpha-value>)',
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        dot: ['var(--font-ndot57)', 'var(--font-ndot55)', 'var(--font-ndot-orig)', 'NDot57', 'NDot55', 'NDotOriginal', 'ui-monospace', 'Courier New', 'monospace'],
        ndot: ['var(--font-ndot57)', 'var(--font-ndot55)', 'var(--font-ndot-orig)', 'NDot57', 'NDot55', 'NDotOriginal', 'ui-monospace', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
