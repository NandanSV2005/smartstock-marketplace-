/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb', // Brand Color
          700: '#1d4ed8',
          900: '#1e3a8a',
        },
        secondary: {
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#10b981', // Success/Healthy Stock
          600: '#059669',
          700: '#047857',
        },
        accent: {
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b', // Warning/Pending
          600: '#d97706',
          700: '#b45309',
        },
        slate: {
          50: '#f8fafc', // Global Background
          100: '#f1f5f9',
          200: '#e2e8f0', // Borders
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b', // Secondary Text
          600: '#475569',
          700: '#334155',
          800: '#1e293b', // Primary Text
          900: '#0f172a',
        },
        error: {
          50: '#fef2f2',
          500: '#ef4444', // Error/Low Stock
          600: '#dc2626',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
