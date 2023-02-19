import { CliComponents } from '../../components';
interface Options {
    args: typeof args;
    components: Pick<CliComponents, 'fetch' | 'fs' | 'logger'>;
}
export declare const args: import("arg").Result<{
    '--help': BooleanConstructor;
    '--json': BooleanConstructor;
    '-h': string;
} & {
    '--dir': StringConstructor;
    '--destination': StringConstructor;
    '--timestamp': StringConstructor;
}>;
export declare function help(): Promise<string>;
export declare function main(options: Options): Promise<{
    urn: string;
    entityId: string;
    destination: string;
}>;
export {};
