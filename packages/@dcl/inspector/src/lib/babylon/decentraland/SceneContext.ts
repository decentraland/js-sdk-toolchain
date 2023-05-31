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
import { ReadWriteByteBuffer } from 'decentraland-babylon/src/lib/decentraland/ByteBuffer'
import { BabylonEntity } from 'decentraland-babylon/src/lib/babylon/scene/BabylonEntity'

export class SceneContext extends EngineSceneContext {
  gizmos = createGizmoManager(this)

  editorComponents = {
    [entitySelectedComponent.componentName]: createLwwStore(entitySelectedComponent),
    [putSceneComponent.componentName]: createLwwStore(putSceneComponent)
  } as const

  hasPendingChanges: boolean = false
  isDragging: boolean = false

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
    const outgoingMessages = new AsyncQueue<CrdtStreamMessage>((_, action) => {
      // if the server is ready to consume one of our messages:
      if (action === 'next') {
        console.log('The datalayer is waiting for the next change')
        this.nextTick()
          .then((response) => {
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
            console.groupCollapsed('Sending changes to datalayer')
            if (mergedArray.byteLength) {
              Array.from(serializeCrdtMessages('Babylon>Datalayer', mergedArray)).forEach(($) => console.log($))
            }
            console.groupEnd()
            outgoingMessages.enqueue({ data: mergedArray })
          })
          .catch((errr) => {
            console.error(errr)
            debugger
          })
      }
    })

    const tick = async (data: Uint8Array) => {
      console.groupCollapsed('Receiving changes from datalayer')
      if (data.byteLength) {
        Array.from(serializeCrdtMessages('DataLayer>Babylon', data)).forEach(($) => console.log($))
        this.incomingMessages.push({ buffer: new ReadWriteByteBuffer(data), allowedEntityRange: [6, 1000000] })
      }
      console.groupEnd()
    }

    consumeAllMessagesInto(crdtStream(outgoingMessages), tick, outgoingMessages.close).catch((e) => {
      console.error('consumeAllMessagesInto failed: ', e)
    })
  }

  dispatchChanges() {
    // this will schedule a new flush for the next Babylon frame
    this.babylonScene.onBeforeAnimationsObservable.addOnce(() => {
      this.hasPendingChanges = true
    })
  }

  update(hasQuota: () => boolean) {
    // the transform component is calculated by the scene main loop and it uses information
    // from various components like billboard and attachment points. to enable dragging behaviors
    // we must stop the update loop of the scene while we drag
    if (this.isDragging) return false

    return super.update(hasQuota)
  }

  lateUpdate() {
    if (this.isDragging) return false

    // this function hooks into the last stage of the scene tick (ADR-148) and prevents
    // the updates to be sent to the "listeners" until dispatchChanges() is called. effectively
    // batching all the local changes in between dispatchChanges calls
    if (this.hasPendingChanges) {
      super.lateUpdate()
      this.hasPendingChanges = false
    }
  }

  updateSelectedEntity(entity: BabylonEntity | null) {
    let gizmo = GizmoType.POSITION

    // clear selection and find used gizmo
    const Selection = this.editorComponents[entitySelectedComponent.componentName]

    for (const [currentlySelectedEntity, value] of Selection.iterator()) {
      if (currentlySelectedEntity !== entity?.entityId) {
        gizmo = value.gizmo
        Selection.deleteFrom(currentlySelectedEntity)
        this.hasPendingChanges = true
      }
    }

    if (entity) {
      // then select new entity
      if (!Selection.has(entity.entityId)) {
        this.hasPendingChanges = true
        Selection.createOrReplace(entity.entityId, { gizmo })
      }

      // TODO: show bounding box
      // if (entity.meshRenderer) {
      //   entity.meshRenderer.showBoundingBox = !!componentValue
      // }

      this.gizmos.setEntity(entity)
      const types = this.gizmos.getGizmoTypes()
      const type = types[gizmo || 0]
      this.gizmos.setGizmoType(type)
    } else {
      this.gizmos.unsetEntity()
    }
  }
}
