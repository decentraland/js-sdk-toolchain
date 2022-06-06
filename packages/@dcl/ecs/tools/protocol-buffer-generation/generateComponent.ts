import fs from 'fs'
import path from 'path'
import componentEcsTypeTemplate from './componentEcsTypeTemplate'

export async function generateComponent(params: {
  component: string
  generatedPath: string
  definitionsPath: string
}) {
  const { component, generatedPath, definitionsPath } = params

  const protoFilePath = path.resolve(definitionsPath, `${component}.proto`)
  const protoFileContent = fs.readFileSync(protoFilePath).toString()

  const componentId = [
    ...protoFileContent.matchAll(/ComponentDefinition.ComponentID=(.*?);/g)
  ][0][1]
  const componentFilePath = path.resolve(generatedPath, `${component}.ts`)
  const componentContent = componentEcsTypeTemplate
    .replace(/Component/g, component)
    .replace('INVALID_COMPONENT_ID', componentId.toString())
  fs.writeFileSync(componentFilePath, componentContent)

  /**
   * Read the generated pb component and add @internal comments to exported methods
   * So we dont add this types to the final .d.ts build
   */
  const generatedPbPath = path.resolve(generatedPath, 'pb', `${component}.ts`)
  const generatedPbContent = fs
    .readFileSync(generatedPbPath, 'utf8')
    .replace(/export const/g, internalComment)

  fs.writeFileSync(generatedPbPath, generatedPbContent)
}

const internalComment = `
/**
 * @internal
 */
export const`
