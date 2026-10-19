/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#09090b',
        surface: '#121215',
        'surface-elevated': '#18181b',
        'surface-hover': '#222226',
        subtle: '#27272a',
        'subtle-strong': '#3f3f46',
        brand: {
          DEFAULT: '#7c3aed',
          light: '#a78bfa',
          dark: '#5b21b6'
        },
        priority: {
          now: '#f43f5e',
          next: '#f59e0b',
          later: '#10b981'
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', '"SF Mono"', 'Menlo', 'Consolas', 'monospace']
      }
    },
  },
  plugins: [],
}

