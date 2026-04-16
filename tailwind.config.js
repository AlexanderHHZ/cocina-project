/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Warm Linen — Propuesta A ──────────────────────────
        linen:     '#F5EFE6', // fondo principal (reemplaza cream)
        parchment: '#EDE0CC', // fondo de cards y UI (nuevo)
        walnut:    '#5C3D2E', // texto principal (reemplaza charcoal)
        paprika:   '#B5451B', // color de acción / apetito (reemplaza terra)
        herb:      '#4A7C59', // fresco / dificultad fácil (reemplaza sage)
        honey:     '#C9922A', // acento dorado / dificultad media (reemplaza gold)
        wine:      '#7A2B32', // dificultad difícil (ajuste sutil)
 
        // ── Aliases semánticos para no romper clases existentes ──
        // Si tu código usa bg-cream, text-charcoal, etc., estos alias
        // los redirigen a los nuevos valores sin tocar cada archivo.
        cream:    '#F5EFE6', // → linen
        charcoal: '#5C3D2E', // → walnut
        terra:    '#B5451B', // → paprika
        sage:     '#4A7C59', // → herb
        gold:     '#C9922A', // → honey
      },
      fontFamily: {
        // Lora  — títulos, nombres de recetas, headings del blog
        display: ['var(--font-lora)', 'Georgia', 'serif'],
        // Poppins — navbar, botones, badges, labels, stats
        ui:      ['var(--font-poppins)', 'system-ui', 'sans-serif'],
        // Inter  — cuerpo de texto, ingredientes, instrucciones, comentarios
        body:    ['var(--font-inter)', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'fade-in':  'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        scaleIn: { '0%': { opacity: '0', transform: 'scale(0.95)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
      },
    },
  },
  plugins: [],
};