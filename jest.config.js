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
  transformIgnorePatterns: [
    "node_modules/(?!(@dcl/ecs-math)/)",
  ],
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
    "packages/@dcl/ecs/src/components/generated/index.gen.ts": {
      functions: 10,
    },
    "packages/@dcl/sdk/src/internal": {
      branches: 26,
      functions: 26,
      lines: 26,
      statements: 26
    }
  },
  coveragePathIgnorePatterns: [
    "scripts",
    "test",
    "(.)\\.(js)$",
  ],
  verbose: true,
  testMatch: ["**/*.spec.(ts|tsx)"],
  testEnvironment: "node",
  setupFilesAfterEnv: ['./test/ecs/setup.ts']
}
