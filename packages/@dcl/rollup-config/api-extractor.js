"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiExtractor = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const glob_1 = require("glob");
const api_extractor_1 = require("@microsoft/api-extractor");
function apiExtractor(packageJsonPath, localBuild) {
    return __awaiter(this, void 0, void 0, function* () {
        const cwd = path.dirname(packageJsonPath);
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath).toString());
        const prepareOptions = {
            configObject: {
                projectFolder: cwd,
                mainEntryPointFilePath: path.resolve(packageJson.main.replace(/\.js$/, '.d.ts')),
                compiler: {
                    tsconfigFilePath: 'tsconfig.json'
                },
                dtsRollup: {
                    enabled: true,
                    untrimmedFilePath: packageJson.typings
                },
                tsdocMetadata: {
                    enabled: true,
                    tsdocMetadataFilePath: '<projectFolder>/tsdoc-metadata.json'
                },
                messages: {
                    compilerMessageReporting: {
                        default: {
                            logLevel: "warning" /* Warning */
                        }
                    },
                    extractorMessageReporting: {
                        default: {
                            logLevel: "warning" /* Warning */
                        }
                    },
                    tsdocMessageReporting: {
                        default: {
                            logLevel: "error" /* Error */
                        }
                    }
                }
            },
            configObjectFullPath: undefined,
            packageJsonFullPath: packageJsonPath
        };
        console.assert(packageJson.typings, 'package.json#typings is not valid');
        const typingsFullPath = path.resolve(packageJson.typings);
        let newentryPoint = null;
        if (fs.existsSync(typingsFullPath) &&
            typingsFullPath == path.resolve(prepareOptions.configObject.mainEntryPointFilePath)) {
            newentryPoint = path.resolve(path.dirname(typingsFullPath), Math.random() + path.basename(typingsFullPath));
            fs.copyFileSync(typingsFullPath, newentryPoint);
            fs.unlinkSync(typingsFullPath);
            prepareOptions.configObject.mainEntryPointFilePath = newentryPoint;
        }
        const extractorConfig = api_extractor_1.ExtractorConfig.prepare(prepareOptions);
        // Invoke API Extractor
        const extractorResult = api_extractor_1.Extractor.invoke(extractorConfig, {
            // Equivalent to the "--local" command-line parameter
            localBuild: localBuild,
            // Equivalent to the "--verbose" command-line parameter
            showVerboseMessages: true
        });
        glob_1.glob.sync(path.dirname(packageJson.main) + '/**/*.d.ts', { absolute: true }).forEach((file) => {
            if (file != typingsFullPath) {
                fs.unlinkSync(file);
            }
        });
        if (extractorResult.succeeded) {
            console.log(`API Extractor completed successfully`);
        }
        else {
            throw new Error(`API Extractor completed with ${extractorResult.errorCount} errors and ${extractorResult.warningCount} warnings`);
        }
    });
}
exports.apiExtractor = apiExtractor;
