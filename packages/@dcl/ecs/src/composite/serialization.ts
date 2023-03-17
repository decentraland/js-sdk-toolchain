import { Composite } from './proto/gen/composite.gen'

/* @public @deprecated */
export function compositeFromJson(object: any): Composite {
  return Composite.fromJSON(object)
}

/* @public @deprecated */
export function compositeFromBinary(buffer: Uint8Array): Composite {
  return Composite.decode(buffer)
}
