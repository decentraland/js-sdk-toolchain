import { Entity, IEngine, Transform as TransformEngine, Name as NameEngine, NameComponent } from '@dcl/ecs'

import { EditorComponentNames, EditorComponents } from '../components'
import { getNodes, pushChild } from '../nodes'

export function addChild(engine: IEngine) {
  return function addChild(parent: Entity, name: string): Entity {
    const child = engine.addEntity()
    const Transform = engine.getComponent(TransformEngine.componentName) as typeof TransformEngine
    const Nodes = engine.getComponent(EditorComponentNames.Nodes) as EditorComponents['Nodes']
    const Name = engine.getComponent(NameEngine.componentName) as typeof NameEngine

    // create new child components
    Name.create(child, { value: generateUniqueName(engine, Name, name) })
    Transform.create(child, { parent })
    // update Nodes component
    Nodes.createOrReplace(engine.RootEntity, { value: pushChild(engine, parent, child) })

    return child
  }
}

export function generateUniqueName(engine: IEngine, Name: NameComponent, value: string): string {
  const pattern = new RegExp(`^${value.toLowerCase()}(?:_\\d+)*$`, 'i')
  const nodes = getNodes(engine)

  let isFirst = true
  let max = 0
  for (const $ of nodes) {
    const name = (Name.getOrNull($.entity)?.value || '').toLowerCase()
    if (pattern.test(name)) {
      isFirst = false
      const suffix = getSuffixDigits(name)
      if (suffix !== -1) {
        max = Math.max(max, suffix)
      }
    }
  }

  const suffix = isFirst ? '' : `_${max + 1}`

  return `${value}${suffix}`
}

function getSuffixDigits(name: string): number {
  const underscoreIndex = name.lastIndexOf('_')
  if (underscoreIndex === -1 || underscoreIndex === name.length - 1) return -1

  const digits = name.slice(underscoreIndex + 1)
  return /^\d+$/.test(digits) ? parseInt(digits, 10) : -1
}

export default addChild
