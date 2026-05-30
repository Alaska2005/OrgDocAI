/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        purple: {
          50:  '#F4F3FF',
          100: '#EEEDFE',
          200: '#DDD9FD',
          300: '#C2BAFC',
          400: '#A396F9',
          500: '#6C63FF',
          600: '#534AB7',
          700: '#3D3587',
          800: '#2A2360',
          900: '#1A1540',
        },
      },
      boxShadow: {
        card: '0 4px 20px rgba(108, 99, 255, 0.10)',
        'card-hover': '0 8px 30px rgba(108, 99, 255, 0.18)',
      },
      borderRadius: {
        xl2: '1rem',
        xl3: '1.25rem',
      },
    },
  },
  plugins: [],
};
