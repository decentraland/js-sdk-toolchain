import { Composite } from './proto/gen/composite.gen'

/* @public @deprecated */
export function compositeFromJson(object: any): Composite {
  return Composite.fromJSON(object)
}

/* @public @deprecated */
export function compositeFromBinary(buffer: Uint8Array): Composite {
  return Composite.decode(buffer)
}

/* @public @deprecated */
export function compositeToJson(composite: Composite): any {
  return Composite.toJSON(composite)
}

/* @public @deprecated */
export function compositeToBinary(composite: Composite): Uint8Array {
  return Composite.encode(composite).finish()
}
