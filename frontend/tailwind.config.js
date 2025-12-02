/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'editor-bg': '#1e1e1e',
        'editor-line': '#2d2d2d',
        'editor-selection': '#264f78',
        'thread-bg': '#252526',
        'thread-border': '#3c3c3c',
        'accent': '#0078d4',
        'accent-hover': '#1e8ad4',
        'success': '#4caf50',
        'warning': '#ff9800',
        'error': '#f44336',
      },
      fontFamily: {
        'mono': ['Consolas', 'Monaco', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}

