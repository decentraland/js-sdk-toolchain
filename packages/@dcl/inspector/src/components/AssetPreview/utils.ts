import { BodyShape, WearableCategory, WearableWithBlobs } from '@dcl/schemas'

export function toWearableWithBlobs(file: File): WearableWithBlobs {
  return {
    id: file.name,
    name: '',
    description: '',
    image: '',
    thumbnail: '',
    i18n: [],
    data: {
      category: WearableCategory.HAT,
      hides: [],
      replaces: [],
      tags: [],
      representations: [
        {
          bodyShapes: [BodyShape.MALE, BodyShape.FEMALE],
          mainFile: file.name,
          contents: [
            {
              key: file.name,
              blob: file
            }
          ],
          overrideHides: [],
          overrideReplaces: []
        }
      ]
    }
  }
}
