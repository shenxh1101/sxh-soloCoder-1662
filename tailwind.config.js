/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        champagne: {
          50: '#FBF8F1',
          100: '#F6EFDD',
          200: '#EDDFB8',
          300: '#E2CB8C',
          400: '#D6B86B',
          500: '#C9A961',
          600: '#B28F4A',
          700: '#90703C',
          800: '#755C36',
          900: '#624D31',
        },
        rose: {
          soft: '#E8C4C4',
          pale: '#F3D9D9',
        },
        ivory: '#FAF6F1',
        cream: '#F5F0EA',
        ink: {
          charcoal: '#2D2A26',
          warm: '#6B6560',
        }
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
      boxShadow: {
        'soft': '0 4px 20px rgba(201, 169, 97, 0.1)',
        'glow': '0 8px 32px rgba(201, 169, 97, 0.18)',
        'card': '0 2px 16px rgba(45, 42, 38, 0.06)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'stagger-in': 'staggerIn 0.6s ease-out forwards',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(201, 169, 97, 0.4)' },
          '50%': { boxShadow: '0 0 0 10px rgba(201, 169, 97, 0)' },
        },
        staggerIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
