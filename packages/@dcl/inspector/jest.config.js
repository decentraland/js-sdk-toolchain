module.exports = {
  moduleFileExtensions: ["ts", "js", "jsx", "tsx"],
  transform: {
    "^.+\\.[tj]sx?$": require.resolve('./test/jest-transformer')
  },
  coverageDirectory: "coverage",
  coverageProvider: 'v8',
  collectCoverageFrom: ["src/**/*.ts"],
  verbose: true,
  testMatch: ["**/*.spec.(ts)"],
  testEnvironment: "node",
  transformIgnorePatterns: [`/node_modules/(?!@babylonjs)`],
}