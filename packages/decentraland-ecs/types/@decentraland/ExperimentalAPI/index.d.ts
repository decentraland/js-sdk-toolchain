
declare module '@decentraland/ExperimentalAPI' {
  /**
   * @deprecated
   * Sends a chunk of bytes in base64 encoded. It only works in Preview mode.
   * @param dataStr - base64 bytes
   */
  export function sendToRenderer(dataStr: string): Promise<any>
}
