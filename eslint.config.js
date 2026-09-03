const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  globalIgnores(['.expo/**', 'dist/**', 'node_modules/**', 'supabase/functions/**']),
  ...expoConfig,
  {
    rules: {
      'react-hooks/exhaustive-deps': 'warn',
      'no-restricted-imports': ['error', {
        patterns: [{ group: ['../*', '../../*', '../../../*'], message: 'Use the @/ project alias for cross-feature imports.' }],
      }],
    },
  },
]);
