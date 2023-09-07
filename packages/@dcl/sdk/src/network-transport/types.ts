import { Entity } from '@dcl/ecs'

export type Socket = WebSocket & {
  binaryType: string
  send(data: string | Uint8Array): void
}

export type NetworkEntityFactory = {
  addEntity(): Entity
}

export enum MessageType {
  Auth = 1,
  Init = 2,
  Crdt = 3
}

export type ServerTransportConfig = {
  reservedLocalEntities: number
  networkEntitiesLimit: {
    serverLimit: number
    clientLimit: number
  }
}

declare global {
  type ClientEvent =
    | {
        type: 'open'
        clientId: string
        client: {
          sendCrdtMessage(message: Uint8Array): Promise<void>
          getMessages(): Uint8Array[]
        }
      }
    | { type: 'close'; clientId: string }
  // eslint-disable-next-line no-var
  var updateCRDTState: (crdt: Uint8Array) => void
  // eslint-disable-next-line no-var
  var registerScene: (serverConfig: ServerTransportConfig, fn: (event: ClientEvent) => void) => void
}
