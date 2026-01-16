/**
 * EnvVar provides methods to fetch environment variables from the
 * Server Side Storage service. This module only works when running
 * on server-side scenes.
 */
export declare const EnvVar: {
    /**
     * Fetches all environment variables as plain text.
     *
     * @returns A promise that resolves to the plain text response containing all environment variables
     * @throws Error if not running on a server-side scene
     * @throws Error if the request fails
     */
    all(): Promise<string>;
    /**
     * Fetches a specific environment variable by key as plain text.
     *
     * @param key - The name of the environment variable to fetch
     * @returns A promise that resolves to the plain text value of the environment variable
     * @throws Error if not running on a server-side scene
     * @throws Error if the request fails
     */
    get(key: string): Promise<string>;
};
