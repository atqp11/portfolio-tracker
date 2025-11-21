// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  safelist: [
    // Safelist dynamic theme classes for glow effects
    {
      pattern: /shadow-(blue|purple|emerald|orange|pink|teal|indigo|rose)-(400|500)\/(10|20)/,
      variants: ['hover', 'dark'],
    },
    {
      pattern: /border-(blue|purple|emerald|orange|pink|teal|indigo|rose)-(400|500)/,
      variants: ['hover', 'dark'],
    },
    {
      pattern: /text-(blue|purple|emerald|orange|pink|teal|indigo|rose)-(400|600)/,
      variants: ['group-hover', 'dark'],
    },
  ],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;