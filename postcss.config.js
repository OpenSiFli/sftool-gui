export default {
  plugins: {
    // DaisyUI emits nested CSS. Flatten it during development as well so
    // older WebKit receives the same compatible CSS as release builds.
    '@tailwindcss/postcss': { optimize: true },
  },
};
