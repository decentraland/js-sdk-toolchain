import { Entity, IEngine, LastWriteWinElementSetComponentDefinition, Name, Transform } from '@dcl/ecs'

export function removeLegacyEntityNodeComponents(engine: IEngine) {
  // Legacy EntityNode for backwards-compability
  function legacyEntityNode() {
    engine.removeSystem(legacyEntityNode)
    const LegacyEntityNodeComponent = engine.getComponentOrNull(
      'inspector::EntityNode'
    ) as LastWriteWinElementSetComponentDefinition<{ label: string; parent: Entity }>
    if (!LegacyEntityNodeComponent) return

    for (const [entity, entityNodeValue] of engine.getEntitiesWith(LegacyEntityNodeComponent)) {
      LegacyEntityNodeComponent.deleteFrom(entity)
      const NameComponent = engine.getComponent(Name.componentId) as typeof Name
      const TransformComponent = engine.getComponent(Transform.componentId) as typeof Transform
      NameComponent.createOrReplace(entity, { value: entityNodeValue.label })
      const transform = TransformComponent.getMutableOrNull(entity)
      if (!transform) {
        TransformComponent.create(entity, { parent: entityNodeValue.parent })
      }
    }
    engine.removeComponentDefinition(LegacyEntityNodeComponent.componentId)
  }
  engine.addSystem(legacyEntityNode)
}
