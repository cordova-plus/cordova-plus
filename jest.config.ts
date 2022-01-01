import type { Config } from "@jest/types";
import { defaults } from "jest-config";

export default async (): Promise<Config.InitialOptions> => ({
  preset: "ts-jest/presets/default-esm",
  globals: {
    ...defaults.globals,
    "ts-jest": {
      useESM: true,
    },
  },
  moduleNameMapper: {
    ...defaults.moduleNameMapper,
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  testEnvironment: "node",
  testPathIgnorePatterns: [
    ...defaults.testPathIgnorePatterns,
    "<rootDir>/lib/",
    "<rootDir>/src/cmds/plugin/test.ts",
  ],
});
