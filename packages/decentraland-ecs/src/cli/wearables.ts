import * as path from 'path'
import * as fs from 'fs'
import { getFilesFromFolder } from './setupUtils'
import type { Application } from 'express'
import { WearableJson } from '@dcl/schemas/dist/sdk'

const serveWearable = ({
  wearableJsonPath,
  baseUrl
}: {
  wearableJsonPath: string
  baseUrl: string
}) => {
  const wearableDir = path.dirname(wearableJsonPath)
  const wearableJson = JSON.parse(fs.readFileSync(wearableJsonPath).toString())

  if (!WearableJson.validate(wearableJson)) {
    const errors = (WearableJson.validate.errors || [])
      .map((a) => `${a.data} ${a.message}`)
      .join('')

    console.error(
      `Unable to validate wearable.json properly, please check it.`,
      errors
    )
    throw new Error(`Invalid wearable.json (${wearableJsonPath})`)
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
    ($) => $?.file === 'thumbnail.png'
  )
  const thumbnail =
    thumbnailFiltered.length > 0 &&
    thumbnailFiltered[0]?.hash &&
    `${baseUrl}/${thumbnailFiltered[0].hash}`

  const wearableId = '8dc2d7ad-97e3-44d0-ba89-e8305d795a6a'

  const representations = wearableJson.data.representations.map(
    (representation) => ({
      ...representation,
      mainFile: `male/${representation.mainFile}`,
      contents: hashedFiles.map(($) => ({
        key: `male/${$?.file}`,
        url: `${baseUrl}/${$?.hash}`
      }))
    })
  )

  return {
    id: wearableId,
    rarity: wearableJson.rarity,
    i18n: [{ code: 'en', text: wearableJson.name }],
    description: wearableJson.description,
    thumbnail: thumbnail || '',
    baseUrl,
    name: wearableJson.name || '',
    data: {
      category: wearableJson.data.category,
      replaces: [],
      hides: [],
      tags: [],
      scene: hashedFiles,
      representations: representations
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
  app: Application,
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
      data: wearables.filter(
        (w) => w?.name.toLowerCase().replace(' ', '-') === wearableId
      )
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
