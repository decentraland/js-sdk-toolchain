import { Composite, engine } from '@dcl/ecs'
import { crdtGetState } from '~system/EngineApi'
import { compositeProvider } from './composite-provider'
import { onUpdate, rendererTransport } from './index'

export { onUpdate }

/**
 * @internal
 * Function that is called before the first update and after the evaluation of the code.
 */
/* @__PURE__ */ export async function onStart() {
  const response = await crdtGetState({ data: new Uint8Array() })

  // when this condition is true something like `main.crdt` was pre-loaded from the runtime, we don't need to instance the main.composite
  if (!response.hasEntities) {
    const mainComposite = compositeProvider.getCompositeOrNull('main.composite')
    if (mainComposite) {
      Composite.instance(engine, mainComposite, compositeProvider)
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
