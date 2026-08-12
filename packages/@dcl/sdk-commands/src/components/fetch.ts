export type IFetchComponent = {
  fetch(url: string, init?: Omit<RequestInit, 'dispatcher'> & { dispatcher?: unknown }): Promise<Response>
}

export function createFetchComponent(): IFetchComponent {
  return {
    fetch: (url: string, init?: Omit<RequestInit, 'dispatcher'> & { dispatcher?: unknown }) => fetch(url, init as RequestInit)
  }
}
