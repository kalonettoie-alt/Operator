import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1A3A3A',
        'accent-gold': '#8B7D3C',
      },
    },
  },
  plugins: [],
};

export default config;
