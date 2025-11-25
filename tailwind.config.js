/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'sifli': {
          50: '#e8f6fc',
          100: '#d1eef9',
          200: '#a3ddf3',
          300: '#75cced',
          400: '#52B0E1', // SiFli 蓝主色
          500: '#3a9ed4',
          600: '#2d7fb0',
          700: '#23628a',
          800: '#1a4663',
          900: '#112a3d',
        }
      }
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        light: {
          "primary": "#52B0E1",          // SiFli 蓝
          "primary-content": "#ffffff",
          "secondary": "#3a9ed4",
          "secondary-content": "#ffffff",
          "accent": "#75cced",
          "accent-content": "#112a3d",
          "neutral": "#374151",
          "neutral-content": "#f3f4f6",
          "base-100": "#ffffff",
          "base-200": "#f9fafb",
          "base-300": "#e5e7eb",
          "base-content": "#1f2937",
          "info": "#52B0E1",
          "info-content": "#ffffff",
          "success": "#22c55e",
          "success-content": "#ffffff",
          "warning": "#f59e0b",
          "warning-content": "#ffffff",
          "error": "#ef4444",
          "error-content": "#ffffff",
        },
      },
      {
        dark: {
          "primary": "#5eb8e8",           // 暗色模式下稍微提亮
          "primary-content": "#0d1b24",
          "secondary": "#75cced",
          "secondary-content": "#112a3d",
          "accent": "#a3ddf3",
          "accent-content": "#112a3d",
          "neutral": "#1f2937",
          "neutral-content": "#d1d5db",
          "base-100": "#111827",
          "base-200": "#1f2937",
          "base-300": "#374151",
          "base-content": "#e5e7eb",
          "info": "#5eb8e8",
          "info-content": "#0d1b24",
          "success": "#22c55e",
          "success-content": "#052e16",
          "warning": "#fbbf24",
          "warning-content": "#422006",
          "error": "#f87171",
          "error-content": "#450a0a",
        },
      },
    ],
    darkTheme: "dark",
    base: true,
    styled: true,
    utils: true,
  },
}