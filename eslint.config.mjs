import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".claude/**",
    "supabase/functions/**",
  ]),
  // Downgrade React Compiler and other noisy rules to warnings
  // so they don't block production builds
  {
    rules: {
      // React Compiler rules (react-hooks v7+ includes compiler checks)
      "react-hooks/set-state-in-effect":           "warn",
      "react-hooks/immutability":                  "warn",
      "react-hooks/invariant":                     "warn",
      "react-hooks/preserve-manual-memoization":   "warn",
      "react-hooks/hooks":                         "warn",
      "react-hooks/purity":                        "warn",
      "react-hooks/syntax":                        "warn",
      "react-hooks/unsupported-syntax":            "warn",
      // TypeScript / general
      "prefer-const":                              "warn",
      "@typescript-eslint/no-require-imports":     "warn",
    },
  },
]);

export default eslintConfig;
