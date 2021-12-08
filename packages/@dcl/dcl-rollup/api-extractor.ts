import * as fs from 'fs'
import * as path from 'path'
import { glob } from 'glob'

import {
  Extractor,
  ExtractorConfig,
  IExtractorConfigPrepareOptions
} from '@microsoft/api-extractor'

export async function apiExtractor(
  packageJsonPath: string,
  localBuild: boolean
) {
  const cwd = path.dirname(packageJsonPath)
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath).toString())
  console.assert(packageJson.typings, 'package.json#typings is not valid')
  const typingsFullPath = path.resolve(packageJson.typings)

  const prepareOptions: IExtractorConfigPrepareOptions =
    ExtractorConfig.tryLoadForFolder({ startingFolder: cwd }) || {
      configObject: {
        projectFolder: cwd,
        mainEntryPointFilePath: path.resolve(
          packageJson.main.replace(/\.js$/, '.d.ts')
        ),
        compiler: {
          tsconfigFilePath: 'tsconfig.json'
        }
      },
      configObjectFullPath: undefined,
      packageJsonFullPath: packageJsonPath
    }

  prepareOptions.configObject.mainEntryPointFilePath = path.resolve(
    prepareOptions.configObject.mainEntryPointFilePath
  )

  if (!prepareOptions.configObject.dtsRollup) {
    prepareOptions.configObject.dtsRollup = {
      enabled: true,
      publicTrimmedFilePath: typingsFullPath,
      untrimmedFilePath: path.resolve(
        path.dirname(typingsFullPath),
        path.basename(typingsFullPath, '.d.ts') + '-full.d.ts'
      ),
      betaTrimmedFilePath: path.resolve(
        path.dirname(typingsFullPath),
        path.basename(typingsFullPath, '.d.ts') + '-beta.d.ts'
      )
    }
  }

  if (!prepareOptions.configObject.tsdocMetadata) {
    prepareOptions.configObject.tsdocMetadata = {
      enabled: true,
      tsdocMetadataFilePath: '<projectFolder>/tsdoc-metadata.json'
    }
  }

  let newentryPoint = null

  if (
    fs.existsSync(typingsFullPath) &&
    typingsFullPath ===
      path.resolve(prepareOptions.configObject.mainEntryPointFilePath)
  ) {
    newentryPoint = path.resolve(
      path.dirname(typingsFullPath),
      Math.random() + path.basename(typingsFullPath)
    )
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

  glob
    .sync(path.dirname(packageJson.main) + '/**/*.d.ts', { absolute: true })
    .forEach((file) => {
      if (file !== typingsFullPath) {
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
