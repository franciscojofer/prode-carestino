// File: backend/.eslintrc.cjs
// Purpose: ESLint configuration for the backend TypeScript code.
// Functionality: Enables the TypeScript parser and recommended rule sets,
// keeps unused-variable warnings (with `_` prefix as opt-out) and flags
// explicit `any` usage. Ignores build artefacts and Prisma migrations.
// Role: Picked up by `npm run lint` and IDE integrations.

module.exports = {
  root: true,
  env: { node: true, es2022: true },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
  },
  ignorePatterns: ['dist', 'node_modules', 'prisma/migrations'],
};
