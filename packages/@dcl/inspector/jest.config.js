const useTsJestTransform = process.env['TS_JEST_TRANSFORMER'] !== undefined
const isE2E = process.env['IS_E2E'] !== undefined

if (isE2E) {
  console.log('Is E2E')
}

const transformer = useTsJestTransform ?
  ["ts-jest", {
    tsconfig: "test/tsconfig.json",
    isolatedModules: true
  }]
  :
  require.resolve('./test/jest-transformer')

module.exports = isE2E ? {
  moduleFileExtensions: ["ts", "js", "jsx", "tsx"],
  testMatch: ["**/e2e/*.spec.(ts)"],
  preset: "jest-puppeteer",
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": transformer
  }
} : {
  moduleFileExtensions: ["ts", "js", "jsx", "tsx"],
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": transformer
  },
  coverageDirectory: "coverage",
  coverageProvider: 'v8',
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 30,
      lines: 30,
      statements: 30,
    }
  },
  collectCoverageFrom: ["src/**/*.ts"],
  coveragePathIgnorePatterns: ["node_modules/", "src/lib/babylon/decentraland/gizmo-patch.ts"],
  verbose: true,
  testMatch: ["**/*.spec.(ts)"],
  testEnvironment: "jsdom",
  transformIgnorePatterns: [
    `/node_modules/(?!(@babylonjs)|(@dcl/ecs-math))`,
  ]
}

