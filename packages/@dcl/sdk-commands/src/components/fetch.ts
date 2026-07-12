// dispatcher is node's non-standard fetch extension (an undici Agent); typed loosely
// so the one Agent user does not couple every consumer to undici's type surface
export type IFetchComponent = {
  fetch(url: string, init?: Omit<RequestInit, 'dispatcher'> & { dispatcher?: unknown }): Promise<Response>
}

export function createFetchComponent(): IFetchComponent {
  return {
    fetch: (url: string, init?: Omit<RequestInit, 'dispatcher'> & { dispatcher?: unknown }) => fetch(url, init as RequestInit)
  }
}
