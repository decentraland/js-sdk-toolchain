module.exports = {
  globals: {
    "ts-jest": {
      tsconfig: "test/tsconfig.json",
    },
  },
  moduleFileExtensions: ["ts", "js"],
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },
  coverageDirectory: "coverage",
  // coverageProvider: 'v8',
  coverageThreshold: {
    "packages/@dcl/ecs/src/components/generated/pb": {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    },
    "packages/@dcl/ecs/src": {
      branches: 75,
      functions: 95,
      lines: 90,
      statements: 90
    },
    "packages/@dcl/sdk/src/cli": {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0
    }
  },
  coveragePathIgnorePatterns: [
    "scripts",
    "test",
    "packages/@dcl/sdk/src/cli/mock-catalyst",
  ],
  verbose: true,
  testMatch: ["**/*.spec.(ts)"],
  testEnvironment: "node",
  setupFilesAfterEnv: ['./test/ecs/setup.ts']
}
