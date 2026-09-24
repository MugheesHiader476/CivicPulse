import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist", "coverage", "src/api/schema.gen.ts"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat["recommended-latest"],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
  },
  {
    // The fake backend used by `npm run dev:mock` must never leak into application code.
    // main.tsx loads it through a dev-only dynamic import, which this rule does not cover.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/mocks/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/mocks", "**/mocks/**"],
              message: "App code must not depend on the mock backend.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["vite.config.ts"],
    languageOptions: { globals: globals.node },
  },
]);
