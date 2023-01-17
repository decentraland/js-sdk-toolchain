import { coreComponentMappings } from './generated/component-names.gen'
import * as utf8 from '@protobufjs/utf8'
import { unsignedCRC32 } from '../runtime/crc'

// Max possible pre-defined (static) component.
const MAX_STATIC_COMPONENT = 2 << 10 // 2048

export function componentNumberFromName(componentName: string): number {
  if (coreComponentMappings[componentName])
    return coreComponentMappings[componentName]
  const bytes = new Uint8Array(128)
  utf8.write(componentName, bytes, 0)
  return ((unsignedCRC32(bytes) + MAX_STATIC_COMPONENT) & 0xffff_ffff) >>> 0
}
