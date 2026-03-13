/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        surface: {
          0:   'var(--surface-0)',
          50:  'var(--surface-50)',
          100: 'var(--surface-100)',
          200: 'var(--surface-200)',
          300: 'var(--surface-300)',
        },
      },
      fontFamily: {
        sans: ['Verdana', 'Geneva', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      animation: {
        'fade-in':    'fadeIn 200ms ease-out',
        'slide-in':   'slideIn 200ms ease-out',
        'slide-up':   'slideUp 200ms ease-out',
        'scale-in':   'scaleIn 150ms ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'shimmer':    'shimmer 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:   { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideIn:  { '0%': { opacity: '0', transform: 'translateX(-8px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        slideUp:  { '0%': { opacity: '0', transform: 'translateY(4px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        scaleIn:  { '0%': { opacity: '0', transform: 'scale(0.95)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        shimmer:  { '0%, 100%': { opacity: '0.5' }, '50%': { opacity: '1' } },
      },
      spacing: {
        '4.5': '1.125rem',
        '13':  '3.25rem',
        '15':  '3.75rem',
        '18':  '4.5rem',
        '88':  '22rem',
      },
      boxShadow: {
        'glow':       '0 0 20px rgba(99, 102, 241, 0.15)',
        'glow-sm':    '0 0 10px rgba(99, 102, 241, 0.1)',
        'elevated':   '0 4px 24px -4px rgba(0, 0, 0, 0.08)',
        'elevated-lg':'0 8px 40px -8px rgba(0, 0, 0, 0.12)',
      },
    },
  },
  plugins: [],
}
