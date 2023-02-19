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
    '--help': BooleanConstructor;
    '--port': NumberConstructor;
    '--no-debug': BooleanConstructor;
    '--no-browser': BooleanConstructor;
    '--no-watch': BooleanConstructor;
    '--ci': BooleanConstructor;
    '--skip-install': BooleanConstructor;
    '--web3': BooleanConstructor;
    '-h': string;
    '-p': string;
    '-d': string;
    '-b': string;
    '-w': string;
    '--skip-build': BooleanConstructor;
    '--desktop-client': BooleanConstructor;
}>;
export declare function help(): string;
export declare function main(options: Options): Promise<void>;
export {};
