/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#1A3A3A',
        'primary-light': '#2C4F4F',
        'accent-gold': '#8B7D3C',
        'bg-white': '#FFFFFF',
        'bg-light': '#F5F5F5',
        'bg-cream': '#F8F6F0',
        'text-primary': '#1A1A1A',
        'text-secondary': '#6B7280',
        'text-muted': '#9CA3AF',
        success: '#10B981',
        danger: '#EF4444',
        warning: '#F59E0B',
        info: '#3B82F6',
        border: '#E5E7EB',
      },
      borderRadius: {
        card: '16px',
        'card-sm': '12px',
        badge: '8px',
        btn: '12px',
        input: '10px',
      },
    },
  },
  plugins: [],
};
