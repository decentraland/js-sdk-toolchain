"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const plugin_node_resolve_1 = __importDefault(require("@rollup/plugin-node-resolve"));
const rollup_plugin_terser_1 = require("rollup-plugin-terser");
const rollup_plugin_typescript2_1 = __importDefault(require("rollup-plugin-typescript2"));
const typescript_1 = require("typescript");
const api_extractor_1 = require("./api-extractor");
const PROD = !!process.env.CI || process.env.NODE_ENV == 'production';
console.log(`production: ${PROD}`);
const packageJsonPath = typescript_1.sys.resolvePath('./package.json');
const packageJson = JSON.parse(typescript_1.sys.readFile(packageJsonPath));
console.assert(packageJson.name, 'package.json .name must be present');
console.assert(packageJson.main, 'package.json .main must be present');
console.assert(packageJson.typings, 'package.json .typings must be present');
const plugins = [
    rollup_plugin_typescript2_1.default({
        verbosity: 2,
        clean: true,
        tsconfigDefaults: {
            include: ['src'],
            compilerOptions: {
                module: 'ESNext',
                sourceMap: true,
                declaration: true
            }
        },
        tsconfig: 'tsconfig.json',
        tsconfigOverride: {
            declaration: true,
            declarationMap: true,
            sourceMap: false,
            inlineSourceMap: true,
            inlineSources: true
        },
        typescript: require('typescript')
    }),
    plugin_node_resolve_1.default({
        browser: true,
        preferBuiltins: false
    }),
    {
        name: 'api-extractor',
        writeBundle() {
            return api_extractor_1.apiExtractor(packageJsonPath, !PROD);
        }
    }
];
const config = {
    input: './src/index.ts',
    context: 'globalThis',
    plugins,
    external: /@decentraland\//,
    output: [
        {
            file: packageJson.main,
            format: 'iife',
            name: 'globalThis',
            extend: true,
            sourcemap: 'inline'
        },
        {
            file: packageJson.main.replace(/\.js$/, '.min.js'),
            format: 'iife',
            name: 'globalThis',
            extend: true,
            sourcemap: 'hidden',
            compact: true,
            plugins: [rollup_plugin_terser_1.terser({})],
        }
    ]
};
exports.default = config;
