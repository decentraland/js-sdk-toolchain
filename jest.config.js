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
  transformIgnorePatterns: [
    "<rootDir>/packages/@dcl/ecs",
  ],
  coverageDirectory: "coverage",
  verbose: true,
  testMatch: ["**/*.spec.(ts)"],
  testEnvironment: "node",
}
