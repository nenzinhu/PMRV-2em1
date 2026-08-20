/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        pmrv: '#0A0A0A',
        charcoal: '#2B2B2B',
        bone: '#F5F0E8',
        gold: '#C8933F',
        brick: '#C44536',
        'step-idle': '#D8D2C4',
        'step-done': '#C8933F',
        whatsapp: '#16a34a',
      },
    },
  },
  plugins: [],
};
