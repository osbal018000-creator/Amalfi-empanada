/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FBF7F1',
          100: '#F6EFE4',
          200: '#EFE3D0',
        },
        terracota: {
          50: '#FBF1EE',
          100: '#F4DDD5',
          200: '#E9B8A9',
          300: '#DC9377',
          400: '#C76B4D',
          500: '#B05337',
          600: '#8F422A',
          700: '#6E3320',
        },
        charcoal: {
          700: '#3A3530',
          800: '#2A2622',
          900: '#1C1916',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 3px rgba(60,40,30,0.06), 0 1px 2px rgba(60,40,30,0.04)',
        card: '0 4px 16px rgba(60,40,30,0.06), 0 1px 3px rgba(60,40,30,0.04)',
        lift: '0 12px 28px -8px rgba(110,51,32,0.18), 0 2px 6px rgba(60,40,30,0.06)',
        glow: '0 6px 18px -4px rgba(176,83,55,0.45)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        'page-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'modal-in': {
          '0%': { opacity: '0', transform: 'translateY(12px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'sheet-in': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'drawer-in': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'overlay-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'toast-in': {
          '0%': { opacity: '0', transform: 'translate(-50%, 16px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translate(-50%, 0) scale(1)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        // 'backwards' (no 'both'): al terminar no deja un transform activo, que rompería los modales fixed y el hover de las tarjetas
        'page-in': 'page-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) backwards',
        'modal-in': 'modal-in 0.28s cubic-bezier(0.16, 1, 0.3, 1) both',
        'sheet-in': 'sheet-in 0.34s cubic-bezier(0.16, 1, 0.3, 1) both',
        'drawer-in': 'drawer-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
        'overlay-in': 'overlay-in 0.22s ease-out both',
        'toast-in': 'toast-in 0.32s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        float: 'float 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
