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
    "packages/@dcl/ecs/src/components/generated/pb": {
      branches: 1,
      functions: 1,
      lines: 1,
      statements: 1
    },
    "packages/@dcl/ecs/src/composite/proto/gen": {
      branches: 1,
      functions: 1,
      lines: 1,
      statements: 1
    },
    "packages/@dcl/ecs/src/components/generated/index.gen.ts": {
      functions: 10,
    },
    "packages/@dcl/sdk/src/internal": {
      branches: 26,
      functions: 26,
      lines: 26,
      statements: 26
    },
    "packages/@dcl/sdk-commands": {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    }
  },
  coveragePathIgnorePatterns: [
    "scripts",
    "test",
    "(.)\\.(js)$",
    "packages/@dcl/inspector",
    "packages/@dcl/dcl-rollup",
    "packages/@dcl/ecs/src/components/generated/pb",
    "packages/@dcl/ecs/src/composite/proto/gen",
    "packages/@dcl/ecs/src/components/generated/index.gen.ts",
    "packages/@dcl/sdk/src/internal"
  ],
  verbose: true,
  testMatch: ["**/*.spec.(ts|tsx)"],
  testEnvironment: "node",
  setupFilesAfterEnv: ['./test/ecs/setup.ts']
}
