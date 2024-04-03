import * as fs from 'fs'
import * as path from 'path'
import { Component } from './generateComponent'
import generateExportedTypes from './generateExportedTypes'

function importComponent(component: Component) {
  return `import { ${component.componentPascalName}Schema } from './${component.componentPascalName}.gen'; import { PB${component.componentPascalName} } from './pb/decentraland/sdk/components/${component.componentFile}.gen'`
}

function importComponentFromIndex(component: Component) {
  return `import { PB${component.componentPascalName} } from './pb/decentraland/sdk/components/${component.componentFile}.gen'`
}

function exportComponent(component: Component) {
  return `export * from './pb/decentraland/sdk/components/${component.componentFile}.gen'`
}

const GROWN_ONLY_COMPONENTS = ['PointerEventsResult', 'VideoEvent', 'AvatarEmoteCommand', 'AudioEvent']
function isGrowOnlyValueSet(component: Component): boolean {
  return GROWN_ONLY_COMPONENTS.includes(component.componentPascalName)
}

function defineComponentDecl(component: Component) {
  if (isGrowOnlyValueSet(component)) {
    return `/** @public */ export const ${component.componentPascalName}: GSetComponentGetter<GrowOnlyValueSetComponentDefinition<PB${component.componentPascalName}>> = (
      engine
    ) => /* @__PURE__ */
      engine.defineValueSetComponentFromSchema("core::${component.componentPascalName}", ${component.componentPascalName}Schema, {
        timestampFunction: (t) => t.timestamp,
        maxElements: 100
      })`.trim()
  } else {
    return `/** @public */ export const ${component.componentPascalName}: LwwComponentGetter<LastWriteWinElementSetComponentDefinition<PB${component.componentPascalName}>> = engine =>
    /* @__PURE__ */ engine.defineComponentFromSchema("core::${component.componentPascalName}", ${component.componentPascalName}Schema);
  `.trim()
  }
}

const skipExposeGlobally: string[] = ['Animator', 'MeshRenderer', 'MeshCollider', 'Material', 'Tween']
function defineGlobalComponentDecl(component: Component) {
  if (skipExposeGlobally.includes(component.componentPascalName)) return ''
  if (isGrowOnlyValueSet(component)) {
    return `/** @public */ export const ${component.componentPascalName}: GrowOnlyValueSetComponentDefinition<PB${component.componentPascalName}> = /* @__PURE__ */ components.${component.componentPascalName}(engine)`.trim()
  } else {
    return `/** @public */ export const ${component.componentPascalName}: LastWriteWinElementSetComponentDefinition<PB${component.componentPascalName}> = /* @__PURE__ */ components.${component.componentPascalName}(engine)`.trim()
  }
}

function keyNameValueDefinition(component: Component) {
  return `\t"core::${component.componentPascalName}": ${component.componentPascalName},`
}

const indexTemplate = `import type { IEngine } from '../../engine/types'
import { LastWriteWinElementSetComponentDefinition, GrowOnlyValueSetComponentDefinition } from '../../engine/component'

$componentImports
$componentExports

export type LwwComponentGetter<T extends LastWriteWinElementSetComponentDefinition<any>> = (engine: Pick<IEngine,'defineComponentFromSchema'>) => T
export type GSetComponentGetter<T extends GrowOnlyValueSetComponentDefinition<any>> = (engine: Pick<IEngine,'defineValueSetComponentFromSchema'>) => T

$componentDeclarations

/** public */
export const componentDefinitionByName = /* @__PURE__ */ {
$allKeyNameValueDefinition
}
`

const globalTemplate = `
import { engine } from '../../runtime/initialization'
import { LastWriteWinElementSetComponentDefinition, GrowOnlyValueSetComponentDefinition } from '../../engine/component'
import * as components from './index.gen'
export * from './index.gen';

$allGlobalComponentsImports

$allGlobalComponents
`

export function generateIndex(param: { components: Component[]; generatedPath: string }) {
  const { components, generatedPath } = param
  const componentWithoutIndex = components.filter((component) => component.componentPascalName !== 'index')

  const indexContent = indexTemplate
    .replace('$componentDeclarations', componentWithoutIndex.map(defineComponentDecl).join('\n'))
    .replace('$componentImports', componentWithoutIndex.map(importComponent).join('\n'))
    .replace('$componentExports', componentWithoutIndex.map(exportComponent).join('\n'))
    .replace('$allKeyNameValueDefinition', componentWithoutIndex.map(keyNameValueDefinition).join('\n'))

  fs.writeFileSync(path.resolve(generatedPath, 'index.gen.ts'), indexContent)

  const globalContent = globalTemplate
    .replace('$allGlobalComponentsImports', componentWithoutIndex.map(importComponentFromIndex).join('\n'))
    .replace('$allGlobalComponents', componentWithoutIndex.map(defineGlobalComponentDecl).join('\n'))

  fs.writeFileSync(path.resolve(generatedPath, 'global.gen.ts'), globalContent)

  generateExportedTypes(generatedPath)
}

export function generateNameMappings(param: { components: Component[]; generatedPath: string }) {
  const { components, generatedPath } = param

  const componentsMapping: Record<string, number> = {
    'core::Transform': 1
  }

  components.forEach(($) => {
    componentsMapping['core::' + $.componentPascalName] = $.componentId
  })

  const content = `
/**
 * Autogenerated mapping of core components to their component numbers
 */
export const coreComponentMappings: Record<string, number> = ${JSON.stringify(componentsMapping, null, 2)}
`

  fs.writeFileSync(path.resolve(generatedPath, 'component-names.gen.ts'), content)
}
