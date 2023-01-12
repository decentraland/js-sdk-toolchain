export const __esModule: true;
export function copyDir(src: any, dest: any): any;
export function defaultHashMaker(str: any): string;
export function getFilesFromFolder(_a: any): ({
    file: string;
    original_path: string | undefined;
    hash: any;
} | undefined)[];
export function entityV3FromFolder(_a: any): {
    version: string;
    type: string;
    id: any;
    pointers: any[];
    timestamp: number;
    metadata: any;
    content: ({
        file: string;
        original_path: string | undefined;
        hash: any;
    } | undefined)[];
} | null;
export function getSceneJson(_a: any): any[];
export function ensureWriteFile(filePath: any, data: any): any;
export function ensureCopyFile(fromFilePath: any, filePath: any): any;
export function downloadFile(url: any, path: any, timeout_seg: any): any;
export function shaHashMaker(str: any): string;
export function defaultDclIgnore(): string;
export function getDirectories(source: any): string[];
export function createStaticRoutes(app: any, route: any, localFolder: any, mapFile: any): void;
