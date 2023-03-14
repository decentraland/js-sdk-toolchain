// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface EmptyObject {}

export type StreamMessage = {
  data: Uint8Array
}

export type DataLayerInterface = {
  init(req: EmptyObject): Promise<EmptyObject>
  undo(req: EmptyObject): Promise<EmptyObject>
  // redo(): Promise<any>
  stream(iter: AsyncIterable<StreamMessage>): AsyncGenerator<StreamMessage>
}

export type Fs = {
  readFile: unknown
  writeFile: unknown
}
