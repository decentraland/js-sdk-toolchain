import * as undici from 'undici'

export type IFetchComponent = {
  fetch(url: string, init?: undici.RequestInit): Promise<undici.Response>
}

export function createFetchComponent(): IFetchComponent {
  return {
    fetch: undici.fetch
  }
}
