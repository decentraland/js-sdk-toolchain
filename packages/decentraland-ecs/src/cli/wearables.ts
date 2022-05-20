import * as path from 'path'
import * as fs from 'fs'
import { getFilesFromFolder } from './setupUtils'
import * as express from 'express'

import { generateValidator, Wearable } from '@dcl/schemas'

export const wearableValidator = generateValidator(Wearable.schema)

const serveWearable = ({
  wearableJsonPath,
  baseUrl
}: {
  wearableJsonPath: string
  baseUrl: string
}) => {
  const wearableDir = path.dirname(wearableJsonPath)
  const wearableJson = JSON.parse(fs.readFileSync(wearableJsonPath).toString())

  if (!wearableValidator(wearableJson)) {
    const errors = (wearableValidator.errors || [])
      .map((a) => `${a.dataPath} ${a.message}`)
      .join('')

    if (errors.length > 0) {
      console.error(
        `Unable to validate '${wearableJsonPath}' properly, please check it: ${errors}`
      )
    } else {
      console.error(
        `Unable to validate '${wearableJsonPath}' properly, please check it.`
      )
    }
    throw new Error(`Invalid wearable.json (${wearableJson})`)
  } else {
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

  const wearableJsonWithContents = {
    ...wearableJson,
    baseUrl,
    thumbnail,
    data: {
      ...wearableJson.data,
      thumbnail,
      scene: hashedFiles,
      baseUrl,
      representations: wearableJson.data.representations.map(
        (representation) => ({
          ...representation,
          contents: hashedFiles.map((file) => ({
            key: `${file?.file}`,
            url: `${baseUrl}/${file?.hash}`
          }))
        })
      )
    }
  }

  return wearableJsonWithContents
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
