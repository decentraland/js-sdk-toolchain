import { RuntimeAbstraction } from "./types"

const MIN_FRAME_TIME = 8

// this is the default update loop used by the scenes. it can be overriden by tests
export async function defaultUpdateLoop(opts: RuntimeAbstraction) {
  await opts.onStart()

  // by ADR-133, the first update is always 0.0 elapsed time
  await opts.onUpdate(0.0)

  let start = performance.now()

  // TODO: this is a very naive implementation of the update loop. we should define
  //       a stable way to enable a graceful shutdown of the scene runtime.
  while (opts.isRunning()) {
    const now = performance.now()
    let dtMillis = now - start
    start = now

    if (dtMillis < MIN_FRAME_TIME) {
      await sleep(MIN_FRAME_TIME - dtMillis - 1)
      dtMillis = MIN_FRAME_TIME
    }

    const dtSecs = dtMillis / 1000

    await opts.onUpdate(dtSecs)
  }
}

async function sleep(ms: number) {
  if (ms > 1)
    return new Promise(resolve => setTimeout(resolve, ms))
}