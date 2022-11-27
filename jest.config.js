module.exports = {
  // preset: "ts-jest/presets/js-with-ts",
  globals: {
    "ts-jest": {
      tsconfig: "test/tsconfig.json",
    },
  },
  moduleFileExtensions: ["ts", "js", "tsx", "jsx"],
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": "ts-jest",
  },
  coverageDirectory: "coverage",
  coverageThreshold: {
    global: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
    },
    "packages/@dcl/ecs/src/components/generated/pb": {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    },
    "packages/@dcl/ecs/src/runtime/temp-fp": {
      branches: 10,
      functions: 10,
      lines: 10,
      statements: 10
    }
  },
  coveragePathIgnorePatterns: [
    "scripts",
    "test"
  ],
  verbose: true,
  testMatch: ["**/*.spec.(ts|tsx)"],
  testEnvironment: "node",
  setupFilesAfterEnv: ['./test/ecs/setup.ts']
}
