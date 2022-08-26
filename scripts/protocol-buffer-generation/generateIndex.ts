import * as fs from 'fs'
import * as path from 'path'
import { Component } from './generateComponent'

function enumTemplate({ componentName, componentId }: Component) {
  return `\t${componentName} = ${componentId},`
}

function importComponent(component: Component) {
  return `import * as ${component.componentName}Schema from './${component.componentName}.gen'`
}

function defineComponent(component: Component) {
  return `\t\t${component.componentName}: defineComponentFromSchema(${component.componentName}Schema.${component.componentName}Schema, ${component.componentName}Schema.COMPONENT_ID),`
}

function useDefinedComponent(component: Component) {
  return `/** @public */\nexport const ${component.componentName} = engine.baseComponents.${component.componentName}`
}

function namespaceComponent(component: Component) {
  return `\t/** @public */\n\texport const ${component.componentName} = engine.baseComponents.${component.componentName}`
}

const TransformComponent = { componentId: 1, componentName: 'Transform' }

const indexTemplate = `import type { IEngine } from '../../engine/types'
import * as TransformSchema from '../legacy/Transform'
$componentImports

export function defineLibraryComponents({
  defineComponentFromSchema
}: Pick<IEngine, 'defineComponentFromSchema'>) {
  return {
${defineComponent(TransformComponent)}
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
$componentNamespace
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
    (component) => component.componentName !== 'index'
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

  fs.writeFileSync(path.resolve(generatedPath, 'index.gen.ts'), indexContent)

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
