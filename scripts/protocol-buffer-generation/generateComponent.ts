import * as fs from 'fs'
import * as path from 'path'
import componentSchemaTemplate from './componentSchemaTemplate'

export type Component = {
  componentId: number
  componentPascalName: string
  componentFile: string
}

export async function generateComponent(params: {
  component: Component
  generatedPath: string
  definitionsPath: string
}) {
  const { component, generatedPath } = params

  const componentFilePath = path.resolve(generatedPath, `${component.componentPascalName}.gen.ts`)
  const componentContent = componentSchemaTemplate
    .replace(/\$\{ComponentName\}/g, component.componentPascalName)
    .replace(/\$\{ComponentFile\}/g, component.componentFile)
    .replace(/\$\{ComponentId\}/g, component.componentId.toString())
  fs.writeFileSync(componentFilePath, componentContent)
}
