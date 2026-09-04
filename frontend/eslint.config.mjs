import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          {
            group: ["@/features/*/*"],
            message: "Глубокий импорт feature запрещён. Используй public API: '@/features/<name>'."
          },
          {
            group: ["@/features/*/engine", "@/features/*/engine/*"],
            message: "Engine приватный. Импортируй через public API feature."
          },
          {
            group: ["@engine/*"],
            message: "@engine/* доступен только внутри src/features/board/engine. Извне используй public API: '@/features/board'."
          }
        ]
      }],
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }]
    }
  },
  {
    files: ["src/features/board/engine/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          {
            group: ["@/features/board/engine/*"],
            message: "Внутри engine используй @engine/* (см. tsconfig.paths)."
          }
        ]
      }]
    }
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
