// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface EmptyObject {}

export type StreamMessage = {
  data: Uint8Array
}

export type DataLayerInterface = {
  undo(req: EmptyObject): Promise<EmptyObject>
  redo(req: EmptyObject): Promise<EmptyObject>
  stream(iter: AsyncIterable<StreamMessage>): AsyncGenerator<StreamMessage>
}

export type Fs = {
  readFile: unknown
  writeFile: unknown
}
