// eslint.config.js — lint do projeto (flat config, ESLint 10).
// O ESLint 10 já rastreia referências de JSX, então não precisamos do
// eslint-plugin-react (que ainda não suporta a v10) só para "jsx-uses-vars".
// Formatação fica com o Prettier: eslint-config-prettier desliga as regras
// de estilo que brigariam com ele.
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import prettier from "eslint-config-prettier";

export default [
  { ignores: ["dist/", "dev-dist/", "node_modules/", "coverage/"] },
  js.configs.recommended,
  {
    files: ["**/*.js", "**/*.jsx"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // catch vazio é usado de propósito (ex.: setPointerCapture que pode falhar).
      "no-empty": ["error", { allowEmptyCatch: true }],
      // `_` no início = ignorado de propósito (ex.: desestruturar para remover um campo).
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "none",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    // Configs e testes rodam no Node.
    files: ["*.config.js", "tests/**/*.js"],
    languageOptions: { globals: { ...globals.node } },
  },
  prettier,
];
