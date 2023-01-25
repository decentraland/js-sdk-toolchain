import * as fs from 'fs'
import * as path from 'path'

import { ExtractorConfig, IExtractorConfigPrepareOptions } from '@microsoft/api-extractor'

export function apiExtractorConfig(packageJsonPath: string) {
  const cwd = path.dirname(packageJsonPath)
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath).toString())
  console.assert(packageJson.typings, 'package.json#typings is not valid')
  const typingsFullPath = path.resolve(packageJson.typings)

  const prepareOptions: IExtractorConfigPrepareOptions = ExtractorConfig.tryLoadForFolder({ startingFolder: cwd }) || {
    configObject: {
      projectFolder: cwd,
      mainEntryPointFilePath: path.resolve(packageJson.main.replace(/\.js$/, '.d.ts')),
      compiler: {
        tsconfigFilePath: 'tsconfig.json'
      }
    },
    configObjectFullPath: undefined,
    packageJsonFullPath: packageJsonPath
  }

  prepareOptions.configObject.mainEntryPointFilePath = path.resolve(prepareOptions.configObject.mainEntryPointFilePath)

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

  return prepareOptions.configObject
}
