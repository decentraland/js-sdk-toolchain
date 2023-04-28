// This test ensures that we are loading correctly the contents of the initial crdtGetState
// using the contents of main.crdt
//
// that file creates five entities. one with a MeshRenderer and four with GltfContainer
// all of them have a Transform component

import { engine, MeshRenderer, GltfContainer, Entity } from '@dcl/sdk/ecs'
import { test } from '@dcl/sdk/src/testing'
import { assertComponentValue, assertEquals } from '@dcl/sdk/src/testing/assert'
import * as _components from '@dcl/ecs/dist/components'
export * from '@dcl/sdk'

test('ensure that cubes are in the scene on the first frame', function* () {
  // check there is one cube
  assertComponentValue(512 as Entity, MeshRenderer, { mesh: { $case: 'box', box: { uvs: [] } } })

  // check GLTFs
  const towers = Array.from(engine.getEntitiesWith(GltfContainer))
  assertEquals(towers.length, 4, 'There are four towers (GltfContainer)')
})
