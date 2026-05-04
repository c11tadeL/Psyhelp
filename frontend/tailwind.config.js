export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        sage: {
          50: '#f4f7f5',
          100: '#e3ebe5',
          200: '#c7d8cc',
          300: '#a3bdac',
          400: '#7c9d87',
          500: '#5d8169',
          600: '#496853',
          700: '#3c5444',
          800: '#324438',
          900: '#2a3830',
        },
        cream: {
          50: '#fdfbf7',
          100: '#faf6ec',
          200: '#f4ecd7',
          300: '#ecdfba',
          400: '#dec896',
          500: '#cdaf73',
        },
        warm: {
          50: '#fbf6f2',
          100: '#f5e9df',
          200: '#ead0bd',
          300: '#dcb094',
          400: '#cb8e6a',
          500: '#bb7250',
        },
        accent: {
          50: '#f0f4f8',
          100: '#dae5ee',
          200: '#b9cee0',
          300: '#8db0cc',
          400: '#6790b6',
          500: '#4d769d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Manrope', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 2px 12px rgba(60, 84, 68, 0.08)',
        gentle: '0 4px 24px rgba(60, 84, 68, 0.10)',
      },
      animation: {
        'breath-in': 'breathIn 4s ease-in-out',
        'breath-out': 'breathOut 4s ease-in-out',
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        breathIn: {
          '0%': { transform: 'scale(0.7)' },
          '100%': { transform: 'scale(1.4)' },
        },
        breathOut: {
          '0%': { transform: 'scale(1.4)' },
          '100%': { transform: 'scale(0.7)' },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
      },
    },
  },
  plugins: [],
}
