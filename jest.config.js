module.exports = {
  // preset: "ts-jest/presets/js-with-ts",
  moduleFileExtensions: ["ts", "js", "tsx", "jsx"],
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": ["ts-jest", {
      tsconfig: "test/tsconfig.json",
    }]
  },
  transformIgnorePatterns: [
    "node_modules/(?!(@dcl/ecs-math)/)"
  ],
  modulePathIgnorePatterns: [
    "packages/@dcl/inspector"
  ],
  coverageDirectory: "coverage",
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    "packages/@dcl/sdk": {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
    "packages/@dcl/sdk-commands/src/commands/deploy": {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
    "packages/@dcl/sdk-commands/src/commands/export-static": {
      branches: 80,
    },
    "packages/@dcl/sdk-commands/src/commands/start": {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
    "packages/@dcl/sdk-commands/src/components/exit-signal.ts": {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
    "packages/@dcl/sdk-commands/src/logic/catalyst-requests.ts": {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    }
  },
  collectCoverageFrom: [
    "packages/@dcl/*/src/**"
  ],
  coveragePathIgnorePatterns: [
    "scripts",
    "test",
    "(.)\\.(js)$",
    "packages/@dcl/inspector",
    "packages/@dcl/playground-assets",
    "packages/@dcl/ecs/src/components/generated/pb",
    "packages/@dcl/ecs/src/composite/proto/gen",
    "packages/@dcl/ecs/src/components/generated/index.gen.ts",
    "packages/@dcl/sdk/src/internal",
    "packages/@dcl/sdk/src/testing"
  ],
  verbose: true,
  testMatch: ["**/*.spec.(ts|tsx)"],
  testEnvironment: "node",
  setupFilesAfterEnv: ['./test/ecs/setup.ts']
}
