import * as path from 'path'
import * as fs from 'fs'
import { getFilesFromFolder } from './setupUtils'
import * as express from 'express'

import { sdk } from '@dcl/schemas'

const serveWearable = ({
  wearableJsonPath,
  baseUrl
}: {
  wearableJsonPath: string
  baseUrl: string
}) => {
  const wearableDir = path.dirname(wearableJsonPath)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const wearableJson = require(wearableJsonPath)

  if (!sdk.AssetJson.validate(wearableJson)) {
    const errors = (sdk.AssetJson.validate.errors || [])
      .map((a) => `${a.dataPath} ${a.message}`)
      .join('')

    console.error(
      `Unable to validate wearable.json properly, please check it.`,
      errors
    )
    throw new Error(`Invalid wearable.json (${wearableJson})`)
  }

  const dclIgnorePath = path.resolve(wearableDir, '.dclignore')
  let ignoreFileContent = ''
  if (fs.existsSync(dclIgnorePath)) {
    ignoreFileContent = fs.readFileSync(
      path.resolve(wearableDir, '.dclignore'),
      'utf-8'
    )
  }

  const hashedFiles = getFilesFromFolder({
    folder: wearableDir,
    addOriginalPath: false,
    ignorePattern: ignoreFileContent
  })

  const thumbnailFiltered = hashedFiles.filter(
    ($) => $?.file === wearableJson.thumbnail
  )
  const thumbnail =
    thumbnailFiltered.length > 0 &&
    thumbnailFiltered[0]?.hash &&
    `${baseUrl}/${thumbnailFiltered[0].hash}`

  return {
    id: wearableJson.id || '00000000-0000-0000-0000-000000000000',
    rarity: wearableJson.rarity,
    i18n: [{ code: 'en', text: wearableJson.name }],
    description: wearableJson.description,
    thumbnail,
    baseUrl,
    name: wearableJson.name || '',
    data: {
      category: wearableJson.category,
      replaces: [],
      hides: [],
      tags: [],
      scene: hashedFiles,
      representations: [
        {
          bodyShapes: ['urn:decentraland:off-chain:base-avatars:BaseMale'],
          mainFile: `male/${wearableJson.model}`,
          contents: hashedFiles.map(($) => ({
            key: `male/${$?.file}`,
            url: `${baseUrl}/${$?.hash}`
          })),
          overrideHides: [],
          overrideReplaces: []
        },
        {
          bodyShapes: ['urn:decentraland:off-chain:base-avatars:BaseFemale'],
          mainFile: `female/${wearableJson.model}`,
          contents: hashedFiles.map(($) => ({
            key: `female/${$?.file}`,
            url: `${baseUrl}/${$?.hash}`
          })),
          overrideHides: [],
          overrideReplaces: []
        }
      ]
    }
  }
}

export const getAllPreviewWearables = ({
  baseFolders,
  baseUrl
}: {
  baseFolders: string[]
  baseUrl: string
}) => {
  const wearablePathArray: string[] = []
  for (const wearableDir of baseFolders) {
    const wearableJsonPath = path.resolve(wearableDir, 'wearable.json')
    if (fs.existsSync(wearableJsonPath)) {
      wearablePathArray.push(wearableJsonPath)
    }
  }

  const ret = []
  for (const wearableJsonPath of wearablePathArray) {
    try {
      ret.push(serveWearable({ wearableJsonPath, baseUrl }))
    } catch (err) {
      console.error(
        `Couldn't mock the wearable ${wearableJsonPath}. Please verify the correct format and scheme.`,
        err
      )
    }
  }
  return ret
}

export const mockPreviewWearables = (
  app: express.Application,
  baseFolders: string[]
) => {
  app.use('/preview-wearables/:id', async (req, res) => {
    const baseUrl = `${req.protocol}://${req.get('host')}/content/contents`
    const wearables = getAllPreviewWearables({
      baseUrl,
      baseFolders
    })
    const wearableId = req.params.id
    return res.json({
      ok: true,
      data: wearables.filter((w) => w?.id === wearableId)
    })
  })

  app.use('/preview-wearables', async (req, res) => {
    const baseUrl = `${req.protocol}://${req.get('host')}/content/contents`
    return res.json({
      ok: true,
      data: getAllPreviewWearables({ baseUrl, baseFolders })
    })
  })
}
