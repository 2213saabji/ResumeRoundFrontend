import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

const config = [
  {
    ignores: ['.next/**', 'out/**', 'node_modules/**', 'coverage/**', 'playwright-report/**'],
  },
  ...nextCoreWebVitals,
  {
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Features stay self-contained: share code through lib/ and contracts/ only.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/app/*'],
              message: 'Routes are thin; import from features/, lib/ or components/ instead.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['features/**/*.{js,jsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*'],
              message:
                'Features never import from each other; move shared code to lib/ or contracts/.',
            },
          ],
        },
      ],
    },
  },
];

export default config;
