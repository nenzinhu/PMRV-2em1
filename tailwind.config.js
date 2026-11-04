/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
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
        // Paleta extraída do brasão PMRV-SC (watermarked_img)
        pmrv: 'var(--ds-primary)',
        'pmrv-dark': 'var(--ds-primary)',
        charcoal: 'var(--ds-text)',
        bone: 'var(--ds-bg)',
        surface: 'var(--ds-surface)',
        gold: 'var(--ds-accent)',
        'on-accent': 'var(--ds-on-accent)',
        'gold-ink': 'var(--ds-gold-ink)',
        'on-primary': 'var(--ds-on-primary)',
        focus: 'var(--ds-focus)',
        brick: 'var(--ds-danger)',
        'brick-dark': 'var(--ds-danger)',
        success: 'var(--ds-success)',
        'on-success': 'var(--ds-on-success)',
        'step-idle': 'var(--ds-muted)',
        'step-done': 'var(--ds-primary)',
        'pm-green': '#4ade80',
        whatsapp: '#25D366',
        'pm-gray': '#cbd5e1',
      },
      // Escala fixa de z-index: nada de z-[arbitrário] em componente
      zIndex: {
        base: '0',
        raised: '10',
        sticky: '20',
        nav: '50',
        toast: '70',
        overlay: '90',
        modal: '100',
      },

    },
  },
  plugins: [],
};
