#!/usr/bin/env node

import { copySync, mkdirSync, readFileSync, removeSync } from 'fs-extra'
import path from 'path'
import { compareFolders } from '../utils/compareFolder'
import { getFilePathsSync } from '../utils/getFilePathsSync'
import { Component, generateComponent } from './generateComponent'
import {
  generateProtocolBuffer,
  getComponentId
} from './generateProtocolBuffer'
import { generateIndex } from './generateIndex'

const PROTO_BLACKLIST = [
  1090, // Billboard
  1050, // UiTransform
  1070, // AvatarModifierArea,
  1071, // CameraModeArea
  1021, // AudioStream
]

function getParam(key: string) {
  const index = process.argv.findIndex((item) => item === key)
  return index !== -1 && process.argv.length > index && process.argv[index + 1]
}

/**
 * @param componentPath - Argument of execution '--component-path'
 *
 * The component-path folder must have the `definitions` folder with .proto files
 * definition inside. This will be used to execute the protobuf compiler generating the
 *  .ts files in the folder `${componentPath}/generated/pb`.
 * After protocol-buffer generation, the ecs-components are generated in the folder
 * `${componentPath}/generated/ComponentInPascalCase.ts` and an `index.ts` with the engine
 *  integration is also generated.
 *
 */
async function main() {
  const componentPathParam = getParam('--component-path')
  const definitionsPath = getParam('--definitions-path')
  const test = process.argv.findIndex((item) => item === 'test') !== -1
  if (!componentPathParam) {
    console.error('Arg --component-path is required.')
    process.exit(2)
  }

  if (!definitionsPath) {
    console.error('Arg --definitions-path is required.')
    process.exit(2)
  }

  const componentPath = test
    ? path.resolve(process.cwd(), 'temp-protocolbuffers')
    : componentPathParam
  const generatedPath = path.resolve(componentPath, 'generated')

  if (test) {
    removeSync(componentPath)
    mkdirSync(path.resolve(componentPath, 'definitions'), { recursive: true })
    copySync(path.resolve(componentPathParam, 'definitions'), definitionsPath, {
      recursive: true
    })
  }

  console.log(
    `Decentraland > Gen dir: ${generatedPath} - definitions dir: ${definitionsPath}`
  )

  const componentsFile = getFilePathsSync(definitionsPath, false)
    .filter((filePath) => filePath.toLowerCase().endsWith('.proto'))
    .map((filePath) => filePath.substring(0, filePath.length - '.proto'.length))

  const components: Component[] = componentsFile.map((componentName) => {
    const protoFileContent = readFileSync(
      path.resolve(definitionsPath, `${componentName}.proto`)
    ).toString()

    let componentId: number = -1
    try {
      componentId = getComponentId(protoFileContent)
    } catch (error) {
      console.error(error)
      throw new Error(
        `Couldn't get the component id in component ${componentName}.proto, please check the line with "option (ecs_component_id) = XXXX;" is well formated and it exists.`
      )
    }

    return {
      componentId,
      componentName
    }
  }).filter(({ componentId }) => !PROTO_BLACKLIST.includes(componentId))

  if (
    !(await generateProtocolBuffer({
      components,
      componentPath,
      definitionsPath,
      generatedPath
    }))
  ) {
    throw new Error('Failed to generate protocol buffer')
  }

  for (const component of components) {
    await generateComponent({
      component,
      generatedPath,
      definitionsPath
    })
  }

  await generateIndex({ components, generatedPath })
  // await runCommand({/
  //   command: path.resolve(process.cwd(), 'node_modules', '.bin', 'eslint'),
  //   args: [generatedPath, '--ext', '.ts', '--fix'],
  //   workingDir: process.cwd(),
  //   fdStandards: FileDescriptorStandardOption.ONLY_IF_THROW
  // })

  if (test) {
    const result = compareFolders(
      generatedPath,
      path.resolve(componentPathParam, 'generated')
    )
    removeSync(componentPath)

    if (!result) {
      process.exit(1)
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
