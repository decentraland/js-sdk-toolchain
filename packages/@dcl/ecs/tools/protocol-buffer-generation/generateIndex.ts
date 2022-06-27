import fs from 'fs'
import path from 'path'
import { Component } from './generateComponent'

const indexTemplate = `$componentImports
import type { IEngine } from '../../engine/types'

export enum ComponentIds {
  $enumComponentIds
}

export function defineProtocolBufferComponents({
  defineComponent
}: Pick<IEngine, 'defineComponent'>) {

  return {
$componentReturns
  }
}
`

function enumTemplate({ componentName, componentId }: Component) {
  return `${componentName} = ${componentId},`
}

function importComponent(component: Component) {
  return `import * as ${component.componentName} from './${component.componentName}.gen'`
}

function defineComponent(component: Component) {
  return `${component.componentName}: defineComponent(${component.componentName}.COMPONENT_ID, ${component.componentName}.${component.componentName})`
}

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
      componentWithoutIndex.map(defineComponent).join(',\n')
    )
    .replace(
      '$enumComponentIds',
      componentWithoutIndex.map(enumTemplate).join('\n')
    )

  fs.writeFileSync(path.resolve(generatedPath, 'index.gen.ts'), indexContent)
}
