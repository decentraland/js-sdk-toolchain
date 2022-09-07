module.exports = {
  globals: {
    "ts-jest": {
      tsconfig: "test/tsconfig.json",
    },
  },
  moduleFileExtensions: ["ts", "js", "tsx"],
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },
  coverageDirectory: "coverage",
  coverageThreshold: {
    "packages/@dcl/ecs/src/components/generated/pb": {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
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
    "packages/@dcl/react-ecs"
  ],
  verbose: true,
  testMatch: ["**/*.spec.(ts|tsx)"],
  testEnvironment: "node",
  setupFilesAfterEnv: ['./test/ecs/setup.ts']
}
