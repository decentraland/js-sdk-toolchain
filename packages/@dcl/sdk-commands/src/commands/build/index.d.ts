import { CliComponents } from '../../components';
interface Options {
    args: Omit<typeof args, '_'>;
    components: Pick<CliComponents, 'fs' | 'logger'>;
}
export declare const args: import("arg").Result<{
    '--help': BooleanConstructor;
    '--json': BooleanConstructor;
    '-h': string;
} & {
    '--watch': BooleanConstructor;
    '-w': string;
    '--production': BooleanConstructor;
    '-p': string;
    '--skip-install': BooleanConstructor;
    '--dir': StringConstructor;
}>;
export declare function help(): string;
export declare function main(options: Options): Promise<void>;
export {};
