import * as fs from 'fs'
import * as path from 'path'
import { glob } from 'glob'

import { Extractor, ExtractorConfig, ExtractorLogLevel, IExtractorConfigPrepareOptions } from '@microsoft/api-extractor'

export async function apiExtractor(packageJsonPath: string, localBuild: boolean) {
  const cwd = path.dirname(packageJsonPath)
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath).toString())
  const prepareOptions: IExtractorConfigPrepareOptions = {
    configObject: {
      projectFolder: cwd,
      mainEntryPointFilePath: path.resolve(packageJson.main.replace(/\.js$/, '.d.ts')),
      compiler: {
        tsconfigFilePath: 'tsconfig.json'
      },
      dtsRollup: {
        enabled: true,
        untrimmedFilePath: packageJson.typings
      },
      tsdocMetadata: {
        enabled: true,
        tsdocMetadataFilePath: '<projectFolder>/tsdoc-metadata.json'
      },
      messages: {
        compilerMessageReporting: {
          default: {
            logLevel: ExtractorLogLevel.Warning
          }
        },
        extractorMessageReporting: {
          default: {
            logLevel: ExtractorLogLevel.Warning
          }
        },
        tsdocMessageReporting: {
          default: {
            logLevel: ExtractorLogLevel.Error
          }
        }
      }
    },
    configObjectFullPath: undefined,
    packageJsonFullPath: packageJsonPath
  }
  console.assert(packageJson.typings, 'package.json#typings is not valid')
  const typingsFullPath = path.resolve(packageJson.typings)

  let newentryPoint = null

  if (
    fs.existsSync(typingsFullPath) &&
    typingsFullPath == path.resolve(prepareOptions.configObject.mainEntryPointFilePath)
  ) {
    newentryPoint = path.resolve(path.dirname(typingsFullPath), Math.random() + path.basename(typingsFullPath))
    fs.copyFileSync(typingsFullPath, newentryPoint)
    fs.unlinkSync(typingsFullPath)
    prepareOptions.configObject.mainEntryPointFilePath = newentryPoint
  }

  const extractorConfig = ExtractorConfig.prepare(prepareOptions)

  // Invoke API Extractor
  const extractorResult = Extractor.invoke(extractorConfig, {
    // Equivalent to the "--local" command-line parameter
    localBuild: localBuild,

    // Equivalent to the "--verbose" command-line parameter
    showVerboseMessages: true
  })

  glob.sync(path.dirname(packageJson.main) + '/**/*.d.ts', { absolute: true }).forEach((file) => {
    if (file != typingsFullPath) {
      fs.unlinkSync(file)
    }
  })

  if (extractorResult.succeeded) {
    console.log(`API Extractor completed successfully`)
  } else {
    throw new Error(
      `API Extractor completed with ${extractorResult.errorCount} errors and ${extractorResult.warningCount} warnings`
    )
  }
}
