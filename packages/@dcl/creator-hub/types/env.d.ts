/// <reference types="vite/client" />
/// <reference types="@types/segment-analytics" />

/**
 * Describes all existing environment variables and their types.
 * Required for Code completion/intellisense and type checking.
 *
 * Note: To prevent accidentally leaking env variables to the client, only variables prefixed with `VITE_` are exposed to your Vite-processed code.
 *
 * @see https://github.com/vitejs/vite/blob/0a699856b248116632c1ac18515c0a5c7cf3d1db/packages/vite/types/importMeta.d.ts#L7-L14 Base Interface.
 * @see https://vitejs.dev/guide/env-and-mode.html#env-files Vite Env Variables Doc.
 */
interface ImportMetaEnv {
  /**
   * URL where `renderer` web page is running.
   * This variable is initialized in scripts/watch.ts
   */
  readonly VITE_DEV_SERVER_URL: undefined | string;

  /** Current app version */
  readonly VITE_APP_VERSION: string;

  // Analytics
  VITE_SEGMENT_CREATORS_HUB_API_KEY: string | undefined;
  VITE_SEGMENT_INSPECTOR_API_KEY: string | undefined;

  // Local Development
  VITE_INSPECTOR_PORT: string | undefined;
  VITE_ASSET_PACKS_CONTENT_URL: string | undefined;
  VITE_ASSET_PACKS_JS_PORT: string | undefined;
  VITE_ASSET_PACKS_JS_PATH: string | undefined;
  VITE_CLI_DEPLOY_PORT: string | undefined;

  // Publish
  VITE_WORLDS_SERVER: string | undefined;
  VITE_TEST_SERVER: string | undefined;

  // Security
  VITE_ALLOWED_EXTERNAL_ORIGINS: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
