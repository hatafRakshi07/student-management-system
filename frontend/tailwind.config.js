/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#fdf3f5',
          100: '#fbe8ec',
          200: '#f7d1d9',
          300: '#f0aab7',
          400: '#e6778e',
          500: '#d84a68',
          600: '#bf2a4d',
          700: '#9e1e40',
          800: '#851d3a',
          900: '#731c35',
        },
        accent: {
          100: '#fef3c7',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'bounce-in': 'bounceIn 0.4s ease-out',
        'shimmer': 'shimmer 1.5s infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'splash-logo': 'splashLogo 0.9s cubic-bezier(0.34,1.56,0.64,1) both',
        'splash-title': 'splashTitle 0.7s ease-out both',
        'splash-sub': 'splashSub 0.6s ease-out both',
        'splash-fill': 'splashFill 3s ease-in-out forwards',
        'splash-ring': 'splashRing 2s ease-in-out infinite',
        'splash-fade-out': 'splashFadeOut 0.6s ease-in forwards',
        'sunray': 'sunray 8s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        bounceIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '60%': { transform: 'scale(1.02)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        splashLogo: {
          '0%':   { opacity: '0', transform: 'scale(0.3) rotate(-10deg)' },
          '60%':  { opacity: '1', transform: 'scale(1.12) rotate(3deg)' },
          '80%':  { transform: 'scale(0.97) rotate(-1deg)' },
          '100%': { opacity: '1', transform: 'scale(1) rotate(0deg)' },
        },
        splashTitle: {
          '0%':   { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        splashSub: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        splashFill: {
          '0%':   { width: '0%' },
          '100%': { width: '100%' },
        },
        splashRing: {
          '0%, 100%': { transform: 'scale(1)',   opacity: '0.6' },
          '50%':      { transform: 'scale(1.18)', opacity: '0.15' },
        },
        splashFadeOut: {
          '0%':   { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(1.04)' },
        },
        sunray: {
          '0%':   { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'glow': '0 0 20px rgb(191 42 77 / 0.4)',
        'glow-sm': '0 0 10px rgb(191 42 77 / 0.25)',
        'glow-gold': '0 0 30px rgb(245 158 11 / 0.5)',
      },
      screens: {
        'xs': '375px',
      },
    },
  },
  plugins: [],
}
