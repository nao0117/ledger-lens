import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended, reactHooks.configs.flat.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    rules: {
      // CLAUDE.md ルール6: データやトークンを console に出さない
      'no-console': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'dangerouslySetInnerHTML は使わない（CLAUDE.md ルール6）',
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'sessionStorage', message: 'トークンやデータをブラウザに保存しない（CLAUDE.md ルール2）' },
        { name: 'indexedDB', message: 'トークンやデータをブラウザに保存しない（CLAUDE.md ルール2）' },
      ],
    },
  },
]);
