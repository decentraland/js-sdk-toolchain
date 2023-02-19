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
    '--yes': BooleanConstructor;
    '-y': string;
    '--dir': StringConstructor;
    '--skip-install': BooleanConstructor;
}>;
export declare function help(): Promise<void>;
export declare function main(options: Options): Promise<void>;
export {};
