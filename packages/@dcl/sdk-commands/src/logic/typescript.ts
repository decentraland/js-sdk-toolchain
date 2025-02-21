import ts from 'typescript'
import path from 'path'

export function getTypeScriptWatchPatterns(tsconfigPath: string): string[] {
  const configPath = ts.findConfigFile(tsconfigPath, ts.sys.fileExists, 'tsconfig.json')

  if (!configPath) {
    throw new Error('Could not find tsconfig.json')
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile)
  if (configFile.error) {
    throw new Error(`Error reading tsconfig.json: ${configFile.error.messageText}`)
  }

  const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(configPath))

  const patterns: string[] = []

  if (parsedConfig.raw.include) {
    patterns.push(...parsedConfig.raw.include)
  } else {
    // Default TypeScript patterns if no includes specified
    patterns.push('**/*.ts', '**/*.tsx', '**/*.d.ts')
  }

  if (parsedConfig.raw.files) {
    patterns.push(...parsedConfig.raw.files)
  }

  // Convert excludes to negative patterns
  const excludePatterns = []
  if (parsedConfig.raw.exclude) {
    excludePatterns.push(...parsedConfig.raw.exclude.map((p: string) => `!${p}`))
  }

  // Add default TypeScript excludes
  excludePatterns.push('!**/node_modules/**', '!**/dist/**', '!**/*.js', '!**/*.jsx')

  return [...patterns, ...excludePatterns]
}
