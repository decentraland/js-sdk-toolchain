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
  collectCoverageFrom: ["src/**/*.ts", "src/**/*.js"],
  testMatch: ["**/*.spec.(ts)"],
  testEnvironment: "node",
}
