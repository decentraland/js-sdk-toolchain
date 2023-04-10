module.exports = {
  moduleFileExtensions: ["ts", "js", "jsx", "tsx"],
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": ["ts-jest", {
      tsconfig: "test/tsconfig.json", 
      isolatedModules: true
    }]
  },
  coverageDirectory: "coverage",
  coverageProvider: 'v8',
  collectCoverageFrom: ["src/**/*.ts"],
  verbose: true,
  testMatch: ["**/*.spec.(ts)"],
  testEnvironment: "node",
  transformIgnorePatterns: [`/node_modules/(?!@babylonjs)`],
}