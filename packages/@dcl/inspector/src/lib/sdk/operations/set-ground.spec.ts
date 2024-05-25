import {
  Transform as defineTransform,
  GltfContainer as defineGltfContainer,
  Name as defineName
} from '@dcl/ecs/dist/components'
import { createEditorComponents } from '../components'
import { setGround as createSetGround } from './set-ground'
import { ComponentDefinition, Engine } from '@dcl/ecs'

const engine = Engine()
const { Scene, Ground, Lock, Tile, Nodes } = createEditorComponents(engine)
const Transform = defineTransform(engine)
const GltfContainer = defineGltfContainer(engine)
const Name = defineName(engine)

const components = {
  [Transform.componentName]: Transform,
  [GltfContainer.componentName]: GltfContainer,
  [Scene.componentName]: Scene,
  [Ground.componentName]: Ground,
  [Lock.componentName]: Lock,
  [Tile.componentName]: Tile,
  [Nodes.componentName]: Nodes,
  [Name.componentName]: Name
}

describe('setGround', () => {
  beforeEach(() => {
    Scene.createOrReplace(engine.RootEntity, {
      layout: {
        base: { x: 2, y: 2 },
        parcels: [
          { x: 2, y: 2 },
          { x: 2, y: 3 },
          { x: 3, y: 2 },
          { x: 3, y: 3 }
        ]
      }
    })

    Nodes.createOrReplace(engine.RootEntity, {
      value: [{ entity: engine.RootEntity, children: [] }]
    })
  })

  describe('When setting the ground', () => {
    let getComponentSpy: jest.SpyInstance
    beforeEach(() => {
      getComponentSpy = jest.spyOn(engine, 'getComponent')
      getComponentSpy.mockImplementation((componentName) => {
        return components[componentName]
      })
    })
    afterEach(() => {
      jest.resetAllMocks()
    })
    it('should remove previous ground if any', () => {
      const previousGround = engine.addEntity()
      Transform.create(previousGround, { parent: engine.RootEntity })
      Ground.create(previousGround, {})
      const deleteFromSpy = jest.spyOn(Ground, 'deleteFrom')

      const setGround = createSetGround(engine)
      setGround('some-src')

      expect(deleteFromSpy).toHaveBeenCalledTimes(1)
      expect(deleteFromSpy).toHaveBeenCalledWith(previousGround)
    })
    it('should create a ground entity with four tiles as children', () => {
      const setGround = createSetGround(engine)
      const src = 'some-src'
      setGround(src)

      const getEntitiesWith = <T>(component: ComponentDefinition<T>) =>
        Array.from(engine.getEntitiesWith(component)).map(([entity]) => entity)

      const ground = getEntitiesWith(Ground)[0]
      const tiles = getEntitiesWith(Tile)

      expect(tiles.length).toBe(4)
      expect(tiles.every((tile) => Transform.get(tile).parent === ground))
      expect(tiles.every((tile) => GltfContainer.get(tile).src === src))
      expect(tiles.every((tile) => Lock.has(tile)))
      expect(Transform.get(tiles[0])).toEqual(
        expect.objectContaining({ parent: ground, position: { x: 8, y: 0, z: 8 } })
      )
      expect(Transform.get(tiles[1])).toEqual(
        expect.objectContaining({ parent: ground, position: { x: 8, y: 0, z: 24 } })
      )
      expect(Transform.get(tiles[2])).toEqual(
        expect.objectContaining({ parent: ground, position: { x: 24, y: 0, z: 8 } })
      )
      expect(Transform.get(tiles[3])).toEqual(
        expect.objectContaining({ parent: ground, position: { x: 24, y: 0, z: 24 } })
      )
    })
  })
})
