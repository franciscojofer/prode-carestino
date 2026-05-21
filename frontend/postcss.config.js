// File: frontend/postcss.config.js
// Purpose: PostCSS pipeline for the frontend.
// Functionality: Runs Tailwind to expand utility classes, then Autoprefixer
// to add vendor prefixes for the browsers in our browserslist.
// Role: Picked up automatically by Vite during dev and production builds.

export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
