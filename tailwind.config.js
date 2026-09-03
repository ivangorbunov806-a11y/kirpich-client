/** Конфиг перенесён один в один из inline-блока index.html (там он выполнялся
 *  CDN-версией Tailwind прямо в браузере). Теперь по нему собирается статический CSS. */
module.exports = {
  content: ["./index.html", "./blog/**/*.html"],
  theme: {
    extend: {
      colors: {
        amber: {
          50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d',
          400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309',
          800: '#92400e', 900: '#78350f',
        },
        stone: {
          900: '#1c1917', 800: '#292524', 700: '#44403c',
          600: '#57534e', 300: '#d6d3d1', 100: '#f5f5f4',
        }
      },
      fontFamily: {
        heading: ['Oswald', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
