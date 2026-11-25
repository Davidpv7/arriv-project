// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = defineConfig([
  expoConfig,
  prettierRecommended,
  {
    ignores: ['dist/*', '.expo/*', 'src/types/database.ts', 'supabase/functions/**'],
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    // Screens: tokens only, and no direct Supabase access (CLAUDE.md rules).
    files: ['app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]',
          message: 'No hard-coded colours in screens. Use tokens from @/theme/tokens.',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/lib/supabase',
              message:
                'Screens must not call Supabase directly. Use hooks from src/features/<area>/api.ts.',
            },
            {
              name: '@supabase/supabase-js',
              message:
                'Screens must not call Supabase directly. Use hooks from src/features/<area>/api.ts.',
            },
          ],
        },
      ],
    },
  },
]);
