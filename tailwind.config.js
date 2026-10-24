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
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};
