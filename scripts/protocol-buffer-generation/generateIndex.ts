import * as fs from 'fs'
import * as path from 'path'
import { Component } from './generateComponent'
import generateExportedTypes from './generateExportedTypes'

const TransformComponent = {
  componentId: 1,
  componentPascalName: 'Transform',
  componentFile: 'none'
}

function enumTemplate({ componentPascalName, componentId }: Component) {
  return `\t${componentPascalName} = ${componentId},`
}

function importComponent(component: Component) {
  return `import * as ${component.componentPascalName}Schema from './${component.componentPascalName}.gen'`
}

function exportComponent(component: Component) {
  return `export * from './pb/decentraland/sdk/components/${component.componentFile}.gen'`
}

function defineComponent(component: Component) {
  if (component.componentId === TransformComponent.componentId) {
    return `\t\t${component.componentPascalName}: TransformSchema.defineTransformComponent({ defineComponentFromSchema }),`
  }
  return `\t\t${component.componentPascalName}: defineComponentFromSchema(${component.componentPascalName}Schema.${component.componentPascalName}Schema, ${component.componentPascalName}Schema.COMPONENT_ID),`
}

function defineComponentDecl(component: Component) {
  return `/** @public *//*#__PURE__*/ export const ${component.componentPascalName}: ComponentGetter<ComponentDefinition<typeof ${component.componentPascalName}Schema.${component.componentPascalName}Schema>> = engine =>
    engine.defineComponentFromSchema(${component.componentPascalName}Schema.${component.componentPascalName}Schema, ${component.componentPascalName}Schema.COMPONENT_ID);
  `.trim()
}

function defineGlobalComponentDecl(component: Component) {
  return `/** @public *//*#__PURE__*/ export const ${component.componentPascalName} = components.${component.componentPascalName}(engine)`.trim()
}

const indexTemplate = `import type { IEngine } from '../../engine/types'
import { ComponentDefinition } from '../../engine/component'
import * as TransformSchema from '../legacy/Transform'
$componentImports
$componentExports

export type ComponentGetter<T extends ComponentDefinition<any>> = (engine: Pick<IEngine,'defineComponentFromSchema'>) => T

$componentDeclarations
`

const globalTemplate = `
import { engine } from '../../runtime/initialization'
import * as components from './index.gen'
$allGlobalComponents
`

const idsTemplate = `/** @public */
export enum ECSComponentIDs {
${enumTemplate(TransformComponent)}
$enumComponentIds
}
`

export function generateIndex(param: {
  components: Component[]
  generatedPath: string
}) {
  const { components, generatedPath } = param
  const componentWithoutIndex = components.filter(
    (component) => component.componentPascalName !== 'index'
  )

  const indexContent = indexTemplate
    .replace(
      '$componentReturns',
      componentWithoutIndex.map(defineComponent).join('\n')
    )
    .replace(
      '$componentDeclarations',
      componentWithoutIndex.map(defineComponentDecl).join('\n')
    )
    .replace(
      '$componentImports',
      componentWithoutIndex.map(importComponent).join('\n')
    )
    .replace(
      '$componentExports',
      componentWithoutIndex.map(exportComponent).join('\n')
    )

  fs.writeFileSync(path.resolve(generatedPath, 'index.gen.ts'), indexContent)

  const globalContent = globalTemplate.replace(
    '$allGlobalComponents',
    componentWithoutIndex.map(defineGlobalComponentDecl).join('\n')
  )

  fs.writeFileSync(path.resolve(generatedPath, 'global.gen.ts'), globalContent)

  const idsContent = idsTemplate.replace(
    '$enumComponentIds',
    componentWithoutIndex.map(enumTemplate).join('\n')
  )

  fs.writeFileSync(path.resolve(generatedPath, 'ids.gen.ts'), idsContent)
  generateExportedTypes(generatedPath)
}
