import * as path from 'path'
import * as fs from 'fs'
import { getDirectories, getFilesFromFolder } from './setupUtils'
import * as express from 'express'
type ItemAssetJson = {
  id?: string
  name?: string
  description?: string
  category?: 'hat' | 'hair' | 'upper_body' | string
  rarity?: 'unique' | 'mythic' | 'legendary' | string
  thumbnail?: string
  model?: string
  bodyShape?: 'male' | 'female' | 'both' | string
}

export const serveWearable = ({
  assetJsonPath,
  baseUrl,
  catalystRootFolder
}: {
  assetJsonPath: string
  baseUrl: string
  catalystRootFolder: string
}) => {
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
    ignorePattern: ignoreFileContent,
    rootFolder: catalystRootFolder
  })

  const thumbnailFiltered = hashedFiles.filter(($) => $?.file == assetJson.thumbnail)
  let thumbnail: string | undefined
  if (thumbnailFiltered.length > 0 && thumbnailFiltered[0]?.hash) {
    thumbnail = `${baseUrl}/${thumbnailFiltered[0].hash}`
  }

  return {
    id: assetJson.id || '00000000-0000-0000-0000-000000000000',
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

export const mockPreviewWearables = (app: express.Application, baseFolders: string[], catalystRootFolder: string) => {
  app.use('/preview-wearables', async (req, res, next) => {
    const assetPathArray: string[] = []
    for (const wearableDir of baseFolders) {
      const assetJsonPath = path.resolve(wearableDir, 'asset.json')
      console.log({ assetJsonPath })
      if (fs.existsSync(assetJsonPath)) {
        assetPathArray.push(assetJsonPath)
      }
    }

    const baseUrl = `http://${req.get('host')}/content/contents`
    const ret = []
    for (const assetJsonPath of assetPathArray) {
      try {
        ret.push(serveWearable({ assetJsonPath, baseUrl, catalystRootFolder }))
      } catch (err) {
        console.error(`Couldn't mock the asset ${assetJsonPath}. Please verify the correct format and scheme.`, err)
      }
    }

    return res.json({
      ok: true,
      data: ret
    })
  })
}
