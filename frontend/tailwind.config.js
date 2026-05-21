// File: frontend/tailwind.config.js
// Purpose: Tailwind CSS configuration for the frontend.
// Functionality: Wires the brand colour palette (defined as CSS variables
// in `src/index.css`) into Tailwind utility classes, sets Montserrat as
// the default sans font, overrides the default border colour, and adds a
// soft card shadow used by the mockup's cards.
// Role: Loaded by PostCSS at build time. Every `bg-brand-orange`,
// `text-ink`, `border`, etc. class in the JSX resolves through this file.

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: 'var(--brand-orange)',
          'orange-dark': 'var(--brand-orange-dark)',
          'orange-soft': 'var(--brand-orange-soft)',
          navy: 'var(--brand-navy)',
        },
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        surface: 'var(--surface)',
        'surface-alt': 'var(--surface-alt)',
        success: 'var(--success)',
        danger: 'var(--danger)',
      },
      borderColor: {
        DEFAULT: 'var(--border)',
      },
      fontFamily: {
        sans: ['Montserrat', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(17, 24, 39, 0.04), 0 1px 3px rgba(17, 24, 39, 0.06)',
      },
    },
  },
  plugins: [],
};
