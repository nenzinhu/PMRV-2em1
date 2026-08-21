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
        // Paleta oficial PM Santa Catarina (pm.sc.gov.br)
        pmrv: '#008448',       // Verde PM (cor primária / cabeçalho)
        'pmrv-dark': '#006338', // Verde PM mais escuro (hover)
        charcoal: '#2B2B2B',   // Texto / estrutura
        bone: '#F4F6F5',       // Fundo claro (levemente esverdeado)
        gold: '#FFC300',        // Dourado PM (destaque)
        brick: '#E6232B',       // Vermelho PM (perigo / ação forte)
        'brick-dark': '#C0171F',
        'step-idle': '#CFE3D8', // Verde claro (steps não feitos)
        'step-done': '#008448',
        whatsapp: '#25D366',
        'pm-gray': '#868075',
      },
    },
  },
  plugins: [],
};
