module.exports = {
  extends: ['../../.eslintrc.js'],
  env: {
    browser: true,
    es2021: true,
  },
  rules: {
    'no-console': 'off', // Permettre console.log dans l'extension
  },
};
