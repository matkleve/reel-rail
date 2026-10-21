import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "tmp/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}", "tests/**/*.ts"],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // File length is not a style preference: state spread across a file
      // nobody can hold in their head is where the hard bugs live.
      "max-lines": ["error", { max: 300, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["warn", { max: 80, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: ["scripts/**/*.mjs", "public/sw.js"],
    languageOptions: { globals: { ...globals.node, ...globals.browser, ...globals.serviceworker } },
  },
  {
    // Tests are legitimately long: one case per acceptance criterion.
    files: ["**/*.test.{ts,tsx}"],
    rules: { "max-lines": "off", "max-lines-per-function": "off" },
  },
);
