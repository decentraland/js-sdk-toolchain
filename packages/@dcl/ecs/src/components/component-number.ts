import { coreComponentMappings } from './generated/component-names.gen'
import * as utf8 from '@protobufjs/utf8'
import { unsignedCRC32 } from '../runtime/crc'

// Max possible pre-defined (static) component.
export const MAX_STATIC_COMPONENT = 1 << 11 // 2048

/**
 * All components that are not part of the coreComponentMappings MUST yield
 * a componentNumber (componentId) greather than MAX_STATIC_COMPONENT.
 * For that reason, we simply add MAX_STATIC_COMPONENT and trim to the domain 2^32
 */
export function componentNumberFromName(componentName: string): number {
  if (coreComponentMappings[componentName]) return coreComponentMappings[componentName]
  const bytes = new Uint8Array(128)
  utf8.write(componentName, bytes, 0)
  return ((unsignedCRC32(bytes) + MAX_STATIC_COMPONENT) & 0xffff_ffff) >>> 0
}
