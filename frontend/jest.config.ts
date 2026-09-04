import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testMatch: ["<rootDir>/src/**/*.spec.ts", "<rootDir>/src/**/*.spec.tsx"],
  moduleNameMapper: {
    "^@/app/(.*)$": "<rootDir>/src/app/$1",
    "^@/features/(.*)$": "<rootDir>/src/features/$1",
    "^@/shared/(.*)$": "<rootDir>/src/shared/$1",
    "^@engine/(.*)$": "<rootDir>/src/features/board/engine/$1",
  },
  modulePathIgnorePatterns: ["<rootDir>/.next/"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {}],
  },
};

export default config;
