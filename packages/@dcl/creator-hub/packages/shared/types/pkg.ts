export type PackageJson = {
  version: string;
  engines: {
    node: string;
  };
  bin?: { [command: string]: string };
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

export enum PACKAGES {
  SDK_PACKAGE = '@dcl/sdk',
  JS_RUNTIME = '@dcl/js-runtime',
}

export const PACKAGES_LIST = Object.values(PACKAGES);
