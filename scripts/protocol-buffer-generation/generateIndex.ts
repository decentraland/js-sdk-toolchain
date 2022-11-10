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

function useDefinedComponent(component: Component) {
  return `/** @public */\nexport const ${component.componentPascalName} = engine.baseComponents.${component.componentPascalName}`
}

function namespaceComponent(component: Component) {
  return `\t/** @public */\n\texport const ${component.componentPascalName} = engine.baseComponents.${component.componentPascalName}`
}

const indexTemplate = `import type { IEngine } from '../../engine/types'
import * as TransformSchema from '../legacy/Transform'
$componentImports
$componentExports

export function defineLibraryComponents({
  defineComponentFromSchema
}: Pick<IEngine, 'defineComponentFromSchema'>) {
  return {
$componentReturns
  }
}
`

const globalTemplate = `import { engine } from '../../runtime/initialization'

${useDefinedComponent(TransformComponent)}
$componentReturns
`

const globalNamespaceTemplate = `import { engine } from '../../runtime/initialization'
/** @public */
export namespace Components {
${namespaceComponent(TransformComponent)}
$componentPascalNamespace
}
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
      '$componentImports',
      componentWithoutIndex.map(importComponent).join('\n')
    )
    .replace(
      '$componentExports',
      componentWithoutIndex.map(exportComponent).join('\n')
    )

  fs.writeFileSync(path.resolve(generatedPath, 'index.gen.ts'), indexContent)

  const globalContent = globalTemplate.replace(
    '$componentReturns',
    componentWithoutIndex.map(useDefinedComponent).join('\n')
  )

  fs.writeFileSync(path.resolve(generatedPath, 'global.gen.ts'), globalContent)

  const namespaceContent = globalNamespaceTemplate.replace(
    '$componentPascalNamespace',
    componentWithoutIndex.map(namespaceComponent).join('\n')
  )

  fs.writeFileSync(
    path.resolve(generatedPath, 'global.namespace.gen.ts'),
    namespaceContent
  )

  const idsContent = idsTemplate.replace(
    '$enumComponentIds',
    componentWithoutIndex.map(enumTemplate).join('\n')
  )

  fs.writeFileSync(path.resolve(generatedPath, 'ids.gen.ts'), idsContent)
  generateExportedTypes(generatedPath)
}
