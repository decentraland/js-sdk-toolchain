import * as fs from 'fs'
import * as path from 'path'
import componentSchemaTemplate from './componentSchemaTemplate'

export type Component = {
  componentId: number
  componentName: string
}

export async function generateComponent(params: {
  component: Component
  generatedPath: string
  definitionsPath: string
}) {
  const { component, generatedPath } = params

  const componentFilePath = path.resolve(
    generatedPath,
    `${component.componentName}.gen.ts`
  )
  const componentContent = componentSchemaTemplate
    .replace(/Component.gen/g, `${component.componentName}.gen`)
    .replace(/Component/g, component.componentName)
    .replace('INVALID_COMPONENT_ID', component.componentId.toString())
  fs.writeFileSync(componentFilePath, componentContent)
}
