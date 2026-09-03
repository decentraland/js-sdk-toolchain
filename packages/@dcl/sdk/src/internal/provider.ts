export interface SendAsyncResponse {
  jsonAnyResponse: string
}

export interface SendAsyncRequest {
  id: number
  method: string
  jsonParams: string
}

export type RPCSendableMessage = {
  jsonrpc: '2.0'
  id: number
  method: string
  params: any[]
}

export interface MessageDict {
  [key: string]: string
}

export type SendAsyncType = (params: SendAsyncRequest) => Promise<SendAsyncResponse>

export function getEthereumProvider(sendAsync: SendAsyncType) {
  async function request(message: RPCSendableMessage) {
    const response = await sendAsync({
      id: message.id,
      method: message.method,
      jsonParams: JSON.stringify(message.params)
    })
    return JSON.parse(response.jsonAnyResponse)
  }

  return {
    // @internal
    send(message: RPCSendableMessage, callback?: (error: Error | null, result?: any) => void): void {
      if (message && callback && callback instanceof Function) {
        // Failure is handled as .then's second argument, not as a .catch after
        // it: chained, a throw from the success callback would run the callback
        // a second time with its own error, as though the call had failed. The
        // trailing catch reports that throw instead of losing it.
        request(message)
          .then(
            (x: any) => callback(null, x),
            (error: Error) => callback(error)
          )
          .catch(console.error)
      } else {
        throw new Error('Decentraland provider only allows async calls')
      }
    },
    sendAsync(message: RPCSendableMessage, callback: (error: Error | null, result?: any) => void): void {
      request(message)
        .then(
          (x: any) => callback(null, x),
          (error: Error) => callback(error)
        )
        .catch(console.error)
    }
  }
}
