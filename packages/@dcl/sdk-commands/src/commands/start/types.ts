import { ILoggerComponent, IMetricsComponent, IConfigComponent } from '@well-known-components/interfaces'
// The http-server component now comes from @dcl/http-server, which is typed against
// @dcl/core-commons' IHttpServerComponent (a native-fetch-bound mirror of the WKC one).
import { IHttpServerComponent } from '@dcl/core-commons'
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
