import * as path from 'path'
import * as fs from 'fs'
import { getFilesFromFolder } from './setupUtils'
import * as express from 'express'

import { sdk } from '@dcl/schemas'

const serveWearable = ({
  assetJsonPath,
  baseUrl,
  catalystRootFolder
}: {
  assetJsonPath: string
  baseUrl: string
  catalystRootFolder: string
}) => {
  const wearableDir = path.dirname(assetJsonPath)
  const assetJson = require(assetJsonPath)
  
  if (!sdk.AssetJson.validate(assetJson)) {
    const errors = (sdk.AssetJson.validate.errors || [])
      .map((a) => `${a.dataPath} ${a.message}`)
      .join('')
      
    console.error(
      `Unable to validate asset.json properly, please check it.`,
      errors
    )
    throw new Error(`Invalid asset.json (${assetJsonPath})`)
  }

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
  const thumbnail =
    thumbnailFiltered.length > 0 && thumbnailFiltered[0]?.hash && `${baseUrl}/${thumbnailFiltered[0].hash}`

  return {
    id: assetJson.id || '00000000-0000-0000-0000-000000000000',
    rarity: assetJson.rarity,
    i18n: [{ code: 'en', text: assetJson.name }],
    description: assetJson.description,
    thumbnail,
    baseUrl,
    name: assetJson.name || '',
    data: {
      category: assetJson.category,
      replaces: [],
      hides: [],
      tags: [],
      scene: hashedFiles,
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

export const getAllPreviewWearables = ({
  baseFolders,
  catalystRootFolder,
  baseUrl
}: {
  baseFolders: string[]
  catalystRootFolder: string
  baseUrl: string
}) => {
  const assetPathArray: string[] = []
  for (const wearableDir of baseFolders) {
    const assetJsonPath = path.resolve(wearableDir, 'asset.json')
    if (fs.existsSync(assetJsonPath)) {
      assetPathArray.push(assetJsonPath)
    }
  }

  const ret = []
  for (const assetJsonPath of assetPathArray) {
    try {
      ret.push(serveWearable({ assetJsonPath, baseUrl, catalystRootFolder }))
    } catch (err) {
      console.error(`Couldn't mock the asset ${assetJsonPath}. Please verify the correct format and scheme.`, err)
    }
  }
  return ret
}

export const mockPreviewWearables = (app: express.Application, baseFolders: string[], catalystRootFolder: string) => {
  app.use('/preview-wearables', async (req, res, next) => {
    const baseUrl = `http://${req.get('host')}/content/contents`
    return res.json({
      ok: true,
      data: getAllPreviewWearables({ baseUrl, baseFolders, catalystRootFolder })
    })
  })

  app.use('/preview-wearables/:id', async (req, res, next) => {
    const baseUrl = `http://${req.get('host')}/content/contents`
    const wearables = getAllPreviewWearables({ baseUrl, baseFolders, catalystRootFolder })
    const wearableId = req.params.id

    return res.json({
      ok: true,
      data: wearables.filter((w) => w?.id === wearableId)
    })
  })
}
