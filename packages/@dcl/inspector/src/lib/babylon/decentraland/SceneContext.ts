import * as BABYLON from '@babylonjs/core'
import { AsyncQueue } from '@well-known-components/pushable-channel'

import { CrdtStreamMessage } from '../../data-layer/proto/gen/data-layer.gen'
import { DataLayerRpcClient } from '../../data-layer/types'
import { serializeCrdtMessages } from '../../sdk/crdt-logger'
import { consumeAllMessagesInto } from '../../logic/consume-stream'
import { createGizmoManager } from './gizmo-manager'

import { SceneContext as EngineSceneContext } from 'decentraland-babylon/src/lib/babylon/scene/scene-context'
import { LoadableScene } from 'decentraland-babylon/src/lib/decentraland/scene/content-server-entity'
import { entitySelectedComponent } from './editorComponents/selection'
import { createLwwStore } from 'decentraland-babylon/src/lib/decentraland/crdt-internal/last-write-win-element-set'
import { putSceneComponent } from './editorComponents/scene'
import { GizmoType } from '../../utils/gizmo'

export class SceneContext extends EngineSceneContext {
  gizmos = createGizmoManager(this)

  editorComponents = {
    [entitySelectedComponent.componentName]: createLwwStore(entitySelectedComponent),
    [putSceneComponent.componentName]: createLwwStore(putSceneComponent)
  } as const

  constructor(scene: BABYLON.Scene, loadableScene: LoadableScene, public dataLayer: DataLayerRpcClient) {
    super(scene, loadableScene, false)

    Object.values(this.editorComponents).forEach((value) => {
      if (value && typeof value === 'object' && 'componentId' in value) {
        ;(this.components as any)[value.componentId] = value
      }
    })
  }

  // async getFile(src: string): Promise<Uint8Array | null> {
  //   try {
  //     const response = await this.dataLayer.getAssetData({ path: src })
  //     return response.data
  //   } catch (err) {
  //     console.error('Error fetching file ' + src, err)
  //     return null
  //   }
  // }

  async connectCrdtTransport(crdtStream: DataLayerRpcClient['crdtStream']) {
    const outgoingMessages = new AsyncQueue<CrdtStreamMessage>((_, _action) => {
      // console.log('SCENE QUEUE', action)
    })

    const tick = async (data: Uint8Array) => {
      if (data.byteLength) {
        Array.from(serializeCrdtMessages('DataLayer>Babylon', data)).forEach(($) => console.log($))
      }

      const response = await this.crdtSendToRenderer({ data })

      // Get the total length of all arrays.
      let length = 0
      response.data.forEach((item) => {
        length += item.length
      })

      // Create a new array with total length and merge all source arrays.
      const mergedArray = new Uint8Array(length)
      let offset = 0
      response.data.forEach((item) => {
        mergedArray.set(item, offset)
        offset += item.length
      })

      if (mergedArray.byteLength) {
        Array.from(serializeCrdtMessages('Babylon>Datalayer', mergedArray)).forEach(($) => console.log($))
      }

      outgoingMessages.enqueue({ data: mergedArray })
    }

    consumeAllMessagesInto(crdtStream(outgoingMessages), tick, outgoingMessages.close).catch((e) => {
      console.error('consumeAllMessagesInto failed: ', e)
    })
  }

  updateSelectedEntity(entityId: number) {
    let gizmo = GizmoType.POSITION

    // clear selection and find used gizmo
    const Selection = this.editorComponents[entitySelectedComponent.componentName]

    for (const [currentlySelectedEntity, value] of Selection.iterator()) {
      if (currentlySelectedEntity !== entityId) {
        gizmo = value.gizmo
        Selection.deleteFrom(currentlySelectedEntity)
      }
    }

    // then select new entity
    if (!Selection.has(entityId)) {
      Selection.createOrReplace(entityId, { gizmo })
    }
  }
}
