import fs from 'fs'
import path from 'path'
import componentEcsTypeTemplate from './componentEcsTypeTemplate'

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
  const componentContent = componentEcsTypeTemplate
    .replace(/Component.gen/g, `${component.componentName}.gen`)
    .replace(/Component/g, component.componentName)
    .replace('INVALID_COMPONENT_ID', component.componentId.toString())
  fs.writeFileSync(componentFilePath, componentContent)
}
