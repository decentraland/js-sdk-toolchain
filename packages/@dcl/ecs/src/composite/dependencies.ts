import { Schemas } from '../schemas'
import { ReadWriteByteBuffer } from '../serialization/ByteBuffer'
import { CompositeRootName, CompositeRootSchema, CompositeRootType } from './components'
import { CompositeResource } from './instance'
import * as path from './path'

export function getDedendenciesFrom(compositeResource: CompositeResource): { path: string; resolvedPath: string }[] {
  const compositeDirectoryPath = path.dirname(path.resolve(compositeResource.src))
  const ret = []
  const CompositeRoot = Schemas.Map(CompositeRootSchema)
  const childrenComposite = compositeResource.composite.components.find((item) => item.name === CompositeRootName)
  if (childrenComposite) {
    for (const [_, compositeRawData] of childrenComposite.data) {
      let childComposite: CompositeRootType
      if (compositeRawData.data?.$case === 'json') {
        childComposite = compositeRawData.data.json
      } else {
        childComposite = CompositeRoot.deserialize(new ReadWriteByteBuffer(compositeRawData.data?.binary))
      }

      const childCompositePath = path.resolveComposite(childComposite.src, compositeDirectoryPath)
      ret.push({ path: childComposite.src, resolvedPath: childCompositePath })
    }
  }
  return ret
}
