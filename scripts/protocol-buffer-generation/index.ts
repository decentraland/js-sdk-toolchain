import { copySync, mkdirSync, readFileSync, removeSync } from 'fs-extra'
import { resolve } from 'path'
import { compareFolders } from '../utils/compareFolder'
import { getFilePathsSync } from '../utils/getFilePathsSync'
import { Component, generateComponent } from './generateComponent'
import {
  generateProtocolBuffer,
  getComponentId
} from './generateProtocolBuffer'
import { generateIndex } from './generateIndex'

const NON_EXPOSED_LIST = [
  1050, // UiTransform
  1021 // AudioStream
]

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
export function compileEcsComponents(
  componentPathParam: string,
  definitionsPath: string,
  test = false
) {
  it('compiles components for folder ' + componentPathParam, async () => {
    const componentPath = test
      ? resolve(process.cwd(), 'temp-protocolbuffers')
      : componentPathParam
    const generatedPath = resolve(componentPath, 'generated')

    if (test) {
      removeSync(componentPath)
      mkdirSync(resolve(componentPath, 'definitions'), { recursive: true })
      copySync(resolve(componentPathParam, 'definitions'), definitionsPath, {
        recursive: true
      })
    }

    console.log(
      `Decentraland > Gen dir: ${generatedPath} - definitions dir: ${definitionsPath}`
    )

    const componentsFile = getFilePathsSync(definitionsPath, false)
      .filter((filePath) => filePath.toLowerCase().endsWith('.proto'))
      .map((filePath) =>
        filePath.substring(0, filePath.length - '.proto'.length)
      )

    const components: Component[] = componentsFile.map((componentName) => {
      const protoFileContent = readFileSync(
        resolve(definitionsPath, `${componentName}.proto`)
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
    })

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
    const filteredComponents = components.filter(
      ({ componentId }) => !NON_EXPOSED_LIST.includes(componentId)
    )
    generateIndex({ components: filteredComponents, generatedPath })
    // await runCommand({/
    //   command: resolve(process.cwd(), 'node_modules', '.bin', 'eslint'),
    //   args: [generatedPath, '--ext', '.ts', '--fix'],
    //   workingDir: process.cwd(),
    //   fdStandards: FileDescriptorStandardOption.ONLY_IF_THROW
    // })

    if (test) {
      const result = compareFolders(
        generatedPath,
        resolve(componentPathParam, 'generated')
      )
      removeSync(componentPath)

      if (!result) {
        process.exit(1)
      }
    }
  })
}
