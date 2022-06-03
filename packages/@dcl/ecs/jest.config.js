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
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    },
    "src/components/generated/pb": {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  verbose: true,
  testMatch: ["**/*.spec.(ts)"],
  testEnvironment: "node",
  setupFilesAfterEnv: ['./test/setup.ts']
}
