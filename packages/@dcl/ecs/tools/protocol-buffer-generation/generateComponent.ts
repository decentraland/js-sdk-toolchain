import fs from 'fs'
import path from 'path'
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
    .replace(/\$\{ComponentName\}/g, component.componentName)
    .replace(/\$\{ComponentId\}/g, component.componentId.toString())
  fs.writeFileSync(componentFilePath, componentContent)
}
