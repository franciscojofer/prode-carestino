// File: frontend/.eslintrc.cjs
// Purpose: ESLint configuration for the React + TypeScript frontend.
// Functionality: Enables the TypeScript parser, the React Hooks lint rules,
// and the React Refresh plugin so HMR-incompatible exports get flagged
// early.
// Role: Picked up by `npm run lint` and IDE integrations.

module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint', 'react-hooks', 'react-refresh'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  settings: {
    react: { version: '18' },
  },
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
  ignorePatterns: ['dist', 'node_modules'],
};
