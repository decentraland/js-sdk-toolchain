import { BodyShape, WearableCategory, WearableWithBlobs } from '@dcl/schemas'

export function toWearableWithBlobs(file: File, resources: File[] = []): WearableWithBlobs {
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
            },
            ...resources.map((resource) => ({
              key: resource.name,
              blob: resource
            }))
          ],
          overrideHides: [],
          overrideReplaces: []
        }
      ]
    }
  }
}
