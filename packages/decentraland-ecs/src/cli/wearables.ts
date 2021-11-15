import * as path from 'path'
import * as fs from 'fs'
import { getFilesFromFolder } from './setupUtils'

type ItemAssetJson = {
  name?: string
  description?: string
  category?: 'hat' | 'hair' | 'upper_body' | string
  rarity?: 'unique' | 'mythic' | 'legendary' | string
  thumbnail?: string
  model?: string
  bodyShape?: 'male' | 'female' | 'both' | string
}

export const mockWearable = ({ assetJsonPath, baseUrl }: { assetJsonPath: string; baseUrl: string }) => {
  const wearableDir = path.dirname(assetJsonPath)
  const assetJson = require(assetJsonPath) as ItemAssetJson

  const dclIgnorePath = path.resolve(wearableDir, '.dclignore')
  let ignoreFileContent = ''
  if (fs.existsSync(dclIgnorePath)) {
    ignoreFileContent = fs.readFileSync(path.resolve(wearableDir, '.dclignore'), 'utf-8')
  }

  const hashedFiles = getFilesFromFolder({
    folder: wearableDir,
    addOriginalPath: false,
    ignorePattern: ignoreFileContent
  })

  const thumbnailFiltered = hashedFiles.filter(($) => $?.file == assetJson.thumbnail)
  let thumbnail: string | undefined
  if (thumbnailFiltered.length > 0 && thumbnailFiltered[0]?.hash) {
    thumbnail = `${baseUrl}/${thumbnailFiltered[0].hash}`
  }

  return {
    id: '00000000-0000-0000-0000-4af690a2328f',
    rarity: assetJson.rarity,
    i18n: [{ code: 'en', text: assetJson.name }],
    description: assetJson.description,
    thumbnail,
    data: {
      category: assetJson.category,
      replaces: [],
      hides: [],
      tags: [],
      representations: [
        {
          bodyShapes: ['urn:decentraland:off-chain:base-avatars:BaseMale'],
          mainFile: `male/${assetJson.model}`,
          contents: hashedFiles.map(($) => ({ key: `male/${$?.file}`, url: `${baseUrl}/${$?.hash}` })),
          overrideHides: [],
          overrideReplaces: []
        },
        {
          bodyShapes: ['urn:decentraland:off-chain:base-avatars:BaseFemale'],
          mainFile: `female/${assetJson.model}`,
          contents: hashedFiles.map(($) => ({ key: `female/${$?.file}`, url: `${baseUrl}/${$?.hash}` })),
          overrideHides: [],
          overrideReplaces: []
        }
      ]
    }
  }
}
