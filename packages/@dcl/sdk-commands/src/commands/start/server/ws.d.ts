import { WebSocketServer } from 'ws';
import { PreviewComponents } from '../types';
import { IBaseComponent } from '@well-known-components/interfaces';
export type WebSocketComponent = IBaseComponent & {
    ws: WebSocketServer;
};
export declare function createWsComponent(_: Pick<PreviewComponents, 'logs'>): Promise<WebSocketComponent>;
