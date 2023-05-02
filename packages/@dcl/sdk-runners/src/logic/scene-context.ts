import future, { IFuture } from 'fp-future'
import { RunnerContext } from './types'
import { LoadableScene } from '../common/loadable-scene'
import {
  CrdtGetStateResponse,
  CrdtSendToRendererRequest,
  CrdtSendToResponse
} from '@dcl/protocol/out-js/decentraland/kernel/apis/engine_api.gen'

export abstract class SceneContext implements RunnerContext {
  // after the "tick" is completed, resolving the futures will send back the CRDT
  // updates to the scripting scene
  nextFrameFutures: Array<IFuture<{ data: Array<Uint8Array> }>> = []
  // stash of incoming CRDT messages from the scripting scene, processed using a
  // quota each renderer frame. ByteBuffer reading is continuable using iterators.
  incomingMessages: Uint8Array[] = []
  // stash of outgoing messages ready to be sent to back to the scripting scene
  outgoingMessages: Uint8Array[] = []

  // when we finish to process all the income messages of a tick,
  // set finishedProcessingFrame to true to send the outgoing messages, then to false.
  finishedProcessingIncomingMessagesOfTick: boolean = false

  // empty until start() is called
  mainCrdtContents: Uint8Array = Uint8Array.of()

  // tick counter for EngineInfo
  currentTick = 0

  // start time for EngineInfo
  readonly startTime = performance.now()
  // start frame for EngineInfo
  startFrame = 0

  constructor(public loadableScene: LoadableScene) {}

  abstract readFile(file: string): Promise<{ content: Uint8Array; hash: string }>

  // this method is the first one to execute once the SceneContext is ready.
  async start() {
    // load the main.crdt as specified by ADR-133 and ADR-148. the tick number zero
    // is always completed by either the contents of main.crdt or by an empty array
    try {
      const file = 'main.crdt'
      if (this.loadableScene.entity.content.some(($) => $.file.toLowerCase() === file)) {
        const { content } = await this.readFile(file)
        this.mainCrdtContents = content
        this.incomingMessages.push(content)
      }
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error(err)
    }
  }

  // this method should process the entirety of CRDT messages in one pass
  abstract processIncomingMessages(messages: Uint8Array): void

  // this cancels the lateUpdate if returns true.
  // true IF any GltfContainnerLoadingState is LOADING
  abstract haltLateUpdateTickZero(): boolean

  // here we calculate raycasts and queries of all kinds
  abstract physicsPhase(): void

  /**
   * The "update" function handles all the incoming messages from the scene and
   * applies the changes to the renderer entities.
   *
   * This function is declared as a property to be added and removed to the
   * rendering engine without binding the SceneContext object.
   *
   * Returns false if the quota was exceeded. True if there is still time to continue
   * processing more messages, similar to cooperative scheduling.
   */
  update(hasQuota: () => boolean) {
    // process all the incoming messages
    while (this.incomingMessages.length) {
      const message = this.incomingMessages[0]

      this.processIncomingMessages(message)

      // if we exceeded the quota, finish the processing of this "message" and yield
      // the execution control back to the event loop
      if (!hasQuota()) {
        return false
      }
    }

    // mark the frame as processed. this signals the lateUpdate to respond to the scene with updates
    this.finishedProcessingIncomingMessagesOfTick = true
    return true
  }

  /**
   * lateUpdate should run in each frame AFTER the physics are processed. This is described
   * in ADR-148.
   *
   * The lateUpdate function is declared as a property to be added and removed to the
   * rendering engine without binding the SceneContext object.
   */
  lateUpdate() {
    // only emit messages if there are receiver promises
    if (!this.nextFrameFutures.length) return

    // only finalize the frame once the incoming messages were cleared
    if (!this.finishedProcessingIncomingMessagesOfTick) return

    // on the first frame, as per ADR-148, the crdtSendToRenderer should only respond
    // if and only if all assets finished loading to properly process the raycasts
    //
    // to compy with that statement, we early-finalize this procedure if a component is in
    // LOADING state. the engine will catch up and finish the crdtSendToRenderer on the
    // next renderer frame
    if (this.currentTick === 0) {
      if (this.haltLateUpdateTickZero()) return
    }

    this.physicsPhase()

    const outMessages = this.outgoingMessages.splice(0, this.outgoingMessages.length)

    // finally resolve the future so the function "receiveBatch" is unblocked
    // and the next scripting frame is allowed to happen
    this.nextFrameFutures.forEach((fut) => fut.resolve({ data: outMessages }))

    // finally clean the futures
    this.nextFrameFutures.length = 0

    // increment the tick number, as per ADR-148
    this.currentTick++
    this.finishedProcessingIncomingMessagesOfTick = false
  }

  private async _crdtSendToRenderer(data: Uint8Array) {
    if (data.byteLength) {
      this.incomingMessages.push(data)
    }

    // create a future to wait until all the messages are processed. even if there
    // are no updates, we must return the future for CRDT updates like the camera
    // position
    const fut = future<CrdtSendToResponse>()
    this.nextFrameFutures.push(fut)
    return fut
  }

  async crdtGetState(): Promise<CrdtGetStateResponse> {
    const result = await this._crdtSendToRenderer(new Uint8Array(0))
    const hasEntities = this.mainCrdtContents.byteLength > 0

    if (hasEntities) {
      // prepend the main.crdt to the response (if not empty). crdt messages are
      // processed sequentially, so the main.crdt will be processed first.
      // if the renderer has any modifications to the main.crdt, they will be
      // applied because they will be processed after
      result.data.unshift(this.mainCrdtContents)
    }

    return { hasEntities, data: result.data }
  }

  async crdtSendToRenderer(payload: CrdtSendToRendererRequest): Promise<CrdtSendToResponse> {
    return this._crdtSendToRenderer(payload.data)
  }
}
