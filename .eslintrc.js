module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    // Règles de base
    'no-console': 'warn',
    'no-unused-vars': 'warn',
    'prefer-const': 'error',
    
    // Règles spécifiques au projet
    'indent': ['error', 2],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
  },
  overrides: [
    {
      // Configuration spécifique pour les fichiers JavaScript
      files: ['**/*.js'],
      extends: ['eslint:recommended'],
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    {
      // Configuration spécifique pour les fichiers TypeScript
      files: ['**/*.ts'],
      extends: ['eslint:recommended'],
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      rules: {
        'no-unused-vars': 'off', // TypeScript gère ça
      },
    },
    {
      // Configuration spécifique pour les fichiers Liquid
      files: ['**/*.liquid'],
      rules: {
        // Désactiver ESLint pour les fichiers Liquid
        'no-undef': 'off',
        'no-unused-vars': 'off',
      },
    },
  ],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '.shopify/',
    '*.min.js',
  ],
};
