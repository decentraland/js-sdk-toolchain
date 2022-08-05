import fs from 'fs'
import path from 'path'
import { Component } from './generateComponent'

function enumTemplate({ componentName, componentId }: Component) {
  return `\t${componentName} = ${componentId},`
}

function importComponent(component: Component) {
  return `import * as ${component.componentName}Schema from './${component.componentName}.gen'`
}

function defineComponent(component: Component) {
  return `${component.componentName} = engine.defineComponent(${component.componentName}Schema.COMPONENT_ID, ${component.componentName}Schema.${component.componentName}Schema)`
}

function useDefinedComponent(component: Component) {
  return `export const ${component.componentName} = engine.baseComponents.${component.componentName}`
}

function namespaceComponent(component: Component) {
  return `\texport const ${component.componentName} = ComponentDefinitions.${component.componentName}`
}

const TransformComponent = { componentId: 1, componentName: 'Transform' }

const indexTemplate = `import type { IEngine } from '../../engine/types'
import * as TransformSchema from './../legacy/Transform'
$componentImports

declare const engine: IEngine

${defineComponent(TransformComponent)}
$componentReturns
`

const globalTemplate = `import type { IEngine } from '../../engine/types'
declare const engine: IEngine

${useDefinedComponent(TransformComponent)}
$componentReturns
`

const globalNamespaceTemplate = `import * as ComponentDefinitions from './global.gen'
export namespace Components {
${namespaceComponent(TransformComponent)}
$componentNamespace
}
`

const idsTemplate = `export enum ECSComponentIDs {
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
    (component) => component.componentName !== 'index'
  )

  const globalContent = globalTemplate.replace(
    '$componentReturns',
    componentWithoutIndex.map(useDefinedComponent).join('\n')
  )

  fs.writeFileSync(path.resolve(generatedPath, 'global.gen.ts'), globalContent)

  const namespaceContent = globalNamespaceTemplate.replace(
    '$componentNamespace',
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
}
