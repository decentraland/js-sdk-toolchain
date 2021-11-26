import * as fs from 'fs'
import { sync as globSync } from 'glob'
import * as path from 'path'
import * as http from 'http'
import * as https from 'https'
import * as crypto from 'crypto'
import ignore from 'ignore'
import * as express from 'express'
import { sdk } from '@dcl/schemas'

// instead of using fs-extra, create a custom function to no need to rollup
export async function copyDir(src: string, dest: string) {
  await fs.promises.mkdir(dest, { recursive: true })
  let entries = await fs.promises.readdir(src, { withFileTypes: true })

  for (let entry of entries) {
    let srcPath = path.join(src, entry.name)
    let destPath = path.join(dest, entry.name)

    entry.isDirectory() ? await copyDir(srcPath, destPath) : await fs.promises.copyFile(srcPath, destPath)
  }
}

export const defaultHashMaker = (str: string) => 'b64-' + Buffer.from(str).toString('base64')

export const getFilesFromFolder = ({
  folder,
  addOriginalPath,
  ignorePattern,
  customHashMaker,
  rootFolder
}: {
  folder: string
  addOriginalPath?: boolean
  ignorePattern?: string
  customHashMaker?: (str: string) => string
  rootFolder?: string
}) => {
  const hashMaker = customHashMaker ? customHashMaker : defaultHashMaker

  const allFiles = globSync('**/*', {
    cwd: folder,
    dot: false,
    absolute: true
  })
    .map((file) => {
      try {
        if (!fs.statSync(file).isFile()) return
      } catch (err) {
        return
      }
      const _folder = folder.replace(/\\/gi, '/')
      const key = file.replace(_folder, '').replace(/^\/+/, '')
      return key
    })
    .filter(($) => !!$) as string[]

  const ensureIgnorePattern = ignorePattern && ignorePattern !== '' ? ignorePattern : defaultDclIgnore()
  const ig = ignore().add(ensureIgnorePattern)
  const filteredFiles = ig.filter(allFiles)

  return filteredFiles
    .map((file) => {
      const absolutePath = path.resolve(folder, file)
      try {
        if (!fs.statSync(absolutePath).isFile()) return
      } catch (err) {
        console.log(err)
        return
      }

      const absoluteFolder = rootFolder ? rootFolder.replace(/\\/gi, '/') : folder.replace(/\\/gi, '/')
      const relativeFilePathToRootFolder = absolutePath.replace(absoluteFolder, '').replace(/^\/+/, '')
      const relativeFilePathToFolder = file.replace(absoluteFolder, '').replace(/^\/+/, '')

      return {
        file: relativeFilePathToFolder.toLowerCase(),
        original_path: addOriginalPath ? absolutePath : undefined,
        hash: hashMaker(relativeFilePathToRootFolder)
      }
    })
    .filter(($) => !!$)
}

export function entityV3FromFolder({
  folder,
  addOriginalPath,
  ignorePattern,
  customHashMaker,
  catalystRootFolder
}: {
  folder: string
  addOriginalPath?: boolean
  ignorePattern?: string
  customHashMaker?: (str: string) => string
  catalystRootFolder: string
}) {
  const sceneJsonPath = path.resolve(folder, './scene.json')
  let isParcelScene = true

  const assetJsonPath = path.resolve(folder, './asset.json')
  if (fs.existsSync(assetJsonPath)) {
    try {
      const assetJson = require(assetJsonPath)
      if (sdk.AssetJson.validate(assetJson) && assetJson.assetType === sdk.ProjectType.PORTABLE_EXPERIENCE) {
        isParcelScene = false
      }
    } catch (err) {
      console.error(`Unable to load asset.json properly`, err)
    }
  }

  const hashMaker = customHashMaker ? customHashMaker : defaultHashMaker

  if (fs.existsSync(sceneJsonPath) && isParcelScene) {
    const sceneJson = JSON.parse(fs.readFileSync(sceneJsonPath).toString())

    const { base, parcels }: { base: string; parcels: string[] } = sceneJson.scene
    const pointers = new Set<string>()
    pointers.add(base)
    parcels.forEach(($) => pointers.add($))

    const mappedFiles = getFilesFromFolder({
      folder,
      addOriginalPath,
      ignorePattern,
      customHashMaker,
      rootFolder: catalystRootFolder
    })
    return {
      version: 'v3',
      type: 'scene',
      id: hashMaker(folder),
      pointers: Array.from(pointers),
      timestamp: Date.now(),
      metadata: sceneJson,
      content: mappedFiles
    }
  }

  return null
}

export function getSceneJson({
  baseFolders,
  pointers,
  customHashMaker,
  catalystRootFolder
}: {
  baseFolders: string[]
  pointers: string[]
  customHashMaker?: (str: string) => string
  catalystRootFolder: string
}) {
  const requestedPointers = new Set<string>(pointers)
  const resultEntities = []
  const allDeployments = baseFolders.map((folder) => {
    const dclIgnorePath = path.resolve(folder, '.dclignore')
    let ignoreFileContent = ''
    if (fs.existsSync(dclIgnorePath)) {
      ignoreFileContent = fs.readFileSync(path.resolve(folder, '.dclignore'), 'utf-8')
    }

    return entityV3FromFolder({
      folder,
      addOriginalPath: false,
      ignorePattern: ignoreFileContent,
      customHashMaker,
      catalystRootFolder
    })
  })

  for (let pointer of Array.from(requestedPointers)) {
    // get deployment by pointer
    const theDeployment = allDeployments.find(($) => $ && $.pointers.includes(pointer))
    if (theDeployment) {
      // remove all the required pointers from the requestedPointers set
      // to prevent sending duplicated entities
      theDeployment.pointers.forEach(($) => requestedPointers.delete($))

      // add the deployment to the results
      resultEntities.push(theDeployment)
    }
  }

  return resultEntities
}

export async function ensureWriteFile(filePath: string, data: any) {
  const directoryPath = path.dirname(filePath)
  if (!fs.existsSync(directoryPath)) {
    await fs.promises.mkdir(directoryPath, { recursive: true })
  }

  await fs.promises.writeFile(filePath, data, 'utf-8')
}

export async function ensureCopyFile(fromFilePath: string, filePath: any) {
  const directoryPath = path.dirname(filePath)
  if (!fs.existsSync(directoryPath)) {
    await fs.promises.mkdir(directoryPath, { recursive: true })
  }

  await fs.promises.copyFile(fromFilePath, filePath)
}

export const downloadFile = async (url: string, path: string) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(path)

    let schema = http
    if (url.toLowerCase().startsWith('https:')) {
      schema = https as any
    }

    schema
      .get(url, function (response) {
        response.pipe(file)
        file.on('finish', function () {
          file.close()
          resolve(true)
        })
      })
      .on('error', function (err) {
        fs.unlinkSync(path)
        reject(err)
      })
  })
}

export const shaHashMaker = (str: string) => crypto.createHash('sha1').update(str).digest('hex')

export const defaultDclIgnore = () =>
  [
    '.*',
    'package.json',
    'package-lock.json',
    'yarn-lock.json',
    'build.json',
    'export',
    'tsconfig.json',
    'tslint.json',
    'node_modules',
    '*.ts',
    '*.tsx',
    'Dockerfile',
    'dist',
    'README.md',
    '*.blend',
    '*.fbx',
    '*.zip',
    '*.rar'
  ].join('\n')

export const getDirectories = (source: string) => {
  if (!fs.existsSync(source)) return []

  return fs
    .readdirSync(source, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)
}

export const createStaticRoutes = (
  app: express.Application,
  route: string,
  localFolder: string,
  mapFile?: (filePath: string) => string
) => {
  app.use(route, (req, res, next) => {
    const options = {
      root: localFolder,
      dotfiles: 'deny',
      maxAge: 1,
      cacheControl: false,
      lastModified: true,
      headers: {
        'x-timestamp': Date.now(),
        'x-sent': true,
        etag: JSON.stringify(Date.now().toString()),
        'cache-control': 'no-cache,private,max-age=1'
      }
    }

    const fileName: string = mapFile ? mapFile(req.params[0]) : req.params[0]

    res.sendFile(fileName, options, (err) => {
      if (err) {
        next(err)
      }
    })
  })
}
