import fs from 'fs'
import path from 'path'

const indexTemplate = `$componentImports
import type { IEngine } from '../../engine/types'

export function defineProtocolBufferComponents({
  defineComponent
}: Pick<IEngine, 'defineComponent'>) {

  return {
    $componentReturns
  }
}
`
function importComponent(component: string) {
  return `import * as ${component} from './${component}'`
}

function defineComponent(component: string) {
  return `${component}: defineComponent(${component}.COMPONENT_ID, ${component}.${component})`
}

export function generateIndex(param: {
  components: string[]
  generatedPath: string
}) {
  const { components, generatedPath } = param
  const componentWithoutIndex = components.filter(
    (component) => component !== 'index'
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

  fs.writeFileSync(path.resolve(generatedPath, 'index.ts'), indexContent)
}
