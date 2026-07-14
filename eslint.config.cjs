// CommonJS form — works around an ESLint 9.x ESM loader bug on Node 24
// where dynamic import of typescript-eslint's CJS bundle fails with
// "SyntaxError: Unexpected token '.'" inside Node's ESM translator.
const tseslint = require("typescript-eslint");

const recommendedConfigs = tseslint.configs.recommended;

const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      ".next/**",
      "data/**",
      "generated/**",
      "backup-system/**",
      "db-migrations/**",
      "webhook-system/**",
      "scripts/**",
      "**/*.cjs",
      "**/*.js",
      "**/*.mjs",
    ],
  },
  ...recommendedConfigs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/ban-ts-comment": "error",
      "@typescript-eslint/no-require-imports": "error",
      "@typescript-eslint/no-unused-expressions": "error",
      "@typescript-eslint/no-this-alias": "error",
      "@typescript-eslint/prefer-as-const": "warn",
      "prefer-const": "error",
      "no-unused-vars": "off",
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      "no-debugger": "error",
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-irregular-whitespace": "error",
      "no-case-declarations": "error",
      "no-fallthrough": "error",
      "no-mixed-spaces-and-tabs": "error",
      "no-redeclare": "off",
      "no-unreachable": "error",
      "no-useless-escape": "warn",
      "eqeqeq": ["error", "smart"],
    },
  },
];

module.exports = eslintConfig;
