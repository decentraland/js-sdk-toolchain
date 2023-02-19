import { PreviewComponents } from '../types';
export declare function wireFileWatcherToWebSockets(components: Pick<PreviewComponents, 'fs' | 'ws'>, projectRoot: string): Promise<void>;
