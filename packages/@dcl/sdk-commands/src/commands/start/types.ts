import {
  ILoggerComponent,
  IMetricsComponent,
  IHttpServerComponent,
  IConfigComponent
} from '@well-known-components/interfaces'
import { HTTPProvider } from 'eth-connect'
import { RoomComponent } from '@dcl/mini-comms/dist/adapters/rooms'
import { WebSocketComponent } from './server/ws'
import { CliComponents } from '../../components'
import { ISignalerComponent } from '../../components/exit-signal'

export type PreviewComponents = CliComponents & {
  logs: ILoggerComponent
  server: IHttpServerComponent<PreviewComponents>
  config: IConfigComponent
  metrics: IMetricsComponent<any>
  ethereumProvider: HTTPProvider
  rooms: RoomComponent
  ws: WebSocketComponent
  signaler: ISignalerComponent
}
