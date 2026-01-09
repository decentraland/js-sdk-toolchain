/**
 * Determines the correct storage server URL based on the current realm.
 *
 * - If `isPreview` is true, uses the realm's baseUrl (localhost)
 * - If the realm's baseUrl contains `.zone`, uses storage-server.decentraland.zone
 * - Otherwise, uses storage-server.decentraland.org (production)
 *
 * @returns The storage server base URL
 */
export declare function getStorageServerUrl(): Promise<string>;
