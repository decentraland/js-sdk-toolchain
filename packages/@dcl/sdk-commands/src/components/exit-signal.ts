import future from 'fp-future'
import { IBaseComponent } from '@well-known-components/interfaces'

export type ISignalerComponent = {
  // programClosed resolves when the component is stopped
  programClosed: Promise<void>
}

// this component exists to "await program stopped" at the end of Lifecycle.main
export function createExitSignalComponent() {
  const programClosed = future<void>()
  const signaler: IBaseComponent & ISignalerComponent = {
    programClosed,
    async stop() {
      // this promise is resolved upon SIGTERM or SIGHUP
      // or when program.stop is called
      programClosed.resolve()
    }
  }
  return signaler
}
