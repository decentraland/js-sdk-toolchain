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
  return `export const ${component.componentName} = engine.defineComponent(${component.componentName}Schema.COMPONENT_ID, ${component.componentName}Schema.${component.componentName})`
}

function namespaceComponent(component: Component) {
  return `\texport const ${component.componentName} = ComponentDefinitions.${component.componentName}`
}

const TransformComponent = { componentId: 1, componentName: 'Transform' }

const indexTemplate = `import type { IEngine } from '../../engine/types'
import * as TransformSchema from './../legacy/Transform'
$componentImports

declare const engine: IEngine

export enum ECSComponentIDs {
${enumTemplate(TransformComponent)}
$enumComponentIds
}

${defineComponent(TransformComponent)}
$componentReturns
`

const namespaceTemplate = `import * as ComponentDefinitions from './index.gen'
export namespace Components {
${namespaceComponent(TransformComponent)}
$componentNamespace
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
      '$componentImports',
      componentWithoutIndex.map(importComponent).join('\n')
    )
    .replace(
      '$componentReturns',
      componentWithoutIndex.map(defineComponent).join('\n')
    )
    .replace(
      '$enumComponentIds',
      componentWithoutIndex.map(enumTemplate).join('\n')
    )

  fs.writeFileSync(path.resolve(generatedPath, 'index.gen.ts'), indexContent)

  const namespaceContent = namespaceTemplate.replace(
    '$componentNamespace',
    componentWithoutIndex.map(namespaceComponent).join('\n')
  )

  fs.writeFileSync(
    path.resolve(generatedPath, 'index.namespace.gen.ts'),
    namespaceContent
  )
}
