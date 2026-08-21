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
        // Paleta extraída do brasão PMRV-SC (watermarked_img)
        pmrv: '#2b6cb0',        // Azul do céu (primário / cabeçalho)
        'pmrv-dark': '#1e4e8c', // Azul mais escuro (hover)
        charcoal: '#1e293b',    // Ardósia (texto / estrutura — cor da via)
        bone: '#eaf2fb',        // Fundo claro azulado (céu claro)
        gold: '#fbbf24',        // Dourado (destaque)
        brick: '#dc2626',       // Vermelho do brasão (perigo / ação)
        'brick-dark': '#b91c1c',
        'step-idle': '#dbeafe', // Azul claro (steps não feitos)
        'step-done': '#2b6cb0',
        'pm-green': '#4ade80',  // Verde da grama (acento)
        whatsapp: '#25D366',
        'pm-gray': '#cbd5e1',   // Prata da borda
      },
    },
  },
  plugins: [],
};
