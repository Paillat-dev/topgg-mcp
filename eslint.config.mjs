import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import unicornPlugin from "eslint-plugin-unicorn";
import globals from "globals";

const tsRules = {
  ...tsPlugin.configs.strict.rules,
  ...tsPlugin.configs["strict-type-checked"].rules,
  "no-undef": "off",
};

const unicornRules = {
  ...unicornPlugin.configs.recommended.rules,
  "unicorn/prevent-abbreviations": "off",
  "unicorn/no-array-reduce": "off",
  "unicorn/prefer-top-level-await": "off",
  "unicorn/no-process-exit": "off",
  "unicorn/no-null": "off",
};

export default [
  js.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.node },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      unicorn: unicornPlugin,
    },
    rules: {
      ...tsRules,
      ...unicornRules,
    },
  },
  {
    files: ["tests/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.test.json",
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.node },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      unicorn: unicornPlugin,
    },
    rules: {
      ...tsRules,
      ...unicornRules,
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/require-await": "off",
      "unicorn/no-useless-undefined": "off",
      "unicorn/catch-error-name": "off",
    },
  },
  {
    ignores: ["dist/**", "node_modules/**", "*.config.mjs", "*.config.ts", "*.config.js"],
  },
];
