/** @alpha THIS FILE INITIALIZES THE DECENTRALAND RUNTIME. WILL CHANGE SOON */
import { Composite, engine } from '@dcl/ecs'
import { crdtGetState, crdtSendToRenderer, sendBatch } from '~system/EngineApi'
import { createRendererTransport } from './internal/transports/rendererTransport'
import { pollEvents } from './observables'
import { polyfillTextEncoder } from './ethereum-provider/text-encoder'
import { compositeProvider } from './composite-provider'

// Install TextEncoder/TextDecoder polyfill so compositeProvider.loadComposite
// can decode JSON composites at runtime. The QuickJS scene runtime has no
// native TextDecoder; without this, on-demand loads of JSON-formatted .composite
// files throw 'TextDecoder is not available...'.
polyfillTextEncoder()

// Attach CRDT transport
// @internal
export const rendererTransport = createRendererTransport({ crdtSendToRenderer })
engine.addTransport(rendererTransport)

// Register composite provider so engine.addEntityFromComposite() can resolve composite files
engine.setCompositeProvider(compositeProvider)

export async function onUpdate(deltaTime: number) {
  engine.seal()
  await engine.update(deltaTime)
  await pollEvents(sendBatch)
}

/**
 * @internal
 * Function that is called before the first update and after the evaluation of the code.
 */
export async function onStart() {
  const response = await crdtGetState({ data: new Uint8Array() })

  // when this condition is true something like `main.crdt` was pre-loaded from the runtime, we don't need to instance the main.composite
  if (!response.hasEntities) {
    const mainComposite = compositeProvider.getCompositeOrNull('main.composite')
    if (mainComposite) {
      try {
        Composite.instance(engine, mainComposite, compositeProvider)
      } catch (err) {
        console.log(`Warning: main.composite couldn't be instanced.`)
        console.error(err)
      }
    }
  }

  if (!!rendererTransport.onmessage) {
    if (response && response.data && response.data.length) {
      for (const byteArray of response.data) {
        rendererTransport.onmessage(byteArray)
      }
    }
  }
}
