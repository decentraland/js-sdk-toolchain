// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface EmptyObject {}

export type DataLayerInterface = {
  undo(req: EmptyObject): Promise<EmptyObject>
  // redo(): Promise<any>
  stream(iter: AsyncIterable<{ data: Uint8Array }>): AsyncGenerator<{ data: Uint8Array }>
}
