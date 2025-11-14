// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'dist/**', 'node_modules/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked, //  타입 기반으로 엄격하게 검사
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'module',
      parserOptions: {
        project: ['./tsconfig.json'], //  타입 정보 기반 검사
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      // ============================================
      // 타입 안정성 - 핵심 규칙
      // ============================================
      '@typescript-eslint/no-explicit-any': 'error', // any 사용 금지
      '@typescript-eslint/no-floating-promises': 'error', // Promise 처리 강제
      '@typescript-eslint/strict-boolean-expressions': 'warn', // boolean 조건식 명확히

      // ============================================
      // 타입 안정성 - Mongoose/NestJS 호환을 위한 완화
      // ============================================
      '@typescript-eslint/no-unsafe-assignment': 'warn', // error → warn (Mongoose 때문)
      '@typescript-eslint/no-unsafe-call': 'warn', // error → warn
      '@typescript-eslint/no-unsafe-member-access': 'warn', // error → warn
      '@typescript-eslint/no-unsafe-argument': 'warn', // error → warn
      '@typescript-eslint/no-unsafe-return': 'warn', // 추가

      // ============================================
      // 명시적 타입 습관
      // ============================================
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
        },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'warn',

      // ============================================
      // 코드 품질
      // ============================================
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports' },
      ],
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',

      // ============================================
      // NestJS 특화
      // ============================================
      '@typescript-eslint/no-empty-function': [
        'error',
        { allow: ['constructors'] }, // NestJS 빈 생성자 허용
      ],
      '@typescript-eslint/no-extraneous-class': [
        'error',
        { allowWithDecorator: true }, // NestJS Module 클래스 허용
      ],

      // ============================================
      // Prettier 통합
      // ============================================
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
  // ============================================
  // ORM/NestJS 데코레이터 관련 파일 - 타입 추론 경고 완화
  // ============================================
  {
    files: [
      '**/repositories/**/*.ts',
      '**/services/**/*.ts',
      '**/schemas/**/*.ts',
      '**/controllers/**/*.ts', // NestJS 데코레이터 때문에 추가
    ],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },
);
