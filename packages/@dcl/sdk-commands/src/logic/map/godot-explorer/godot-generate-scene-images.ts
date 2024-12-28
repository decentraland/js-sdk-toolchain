import { readdir, rm, writeFile } from 'fs/promises'
import path from 'path'
import { runGodotExplorer } from './run-godot-explorer'
import { CliComponents } from '../../../components'

type CameraConfig = {
  position: {
    x: number
    y: number
    z: number
  }
  target: {
    x: number
    y: number
    z: number
  }
  orthoSize: number
  projection: 'ortho' | 'perspective' // Assuming "projection" can be either "ortho" or "perspective".
}

type PayloadItem = {
  coords: string
  width: number
  height: number
  destPath: string
  sceneDistance: number
  camera: CameraConfig
}

type SceneRenderingConfig = {
  realmUrl: string
  defaultPayload: Partial<PayloadItem>
  payload: Partial<PayloadItem>[]
}

export async function godotGenerateSceneImages(components: Pick<CliComponents, 'logger' | 'fs'>, pointers: string[]) {
  const { logger, fs } = components
  const pointersToProcess = new Set<string>()

  pointers.forEach((pointer) => {
    // Parse the pointer
    const [x, y] = pointer.split(',').map((coord) => parseInt(coord, 10))

    // Calculate the sector center
    const sectorX = Math.floor(x / 3) * 3
    const sectorY = Math.floor(y / 3) * 3

    // Add the center to the list as a string
    pointersToProcess.add(`${sectorX},${sectorY}`)
  })

  // Convert the Set to an array (if needed for further processing)
  const centersToProcess = Array.from(pointersToProcess)

  // Example: Log the sectors to process
  logger.info('Sectors to process:', { centersToProcess: JSON.stringify(centersToProcess) })

  const inputData: SceneRenderingConfig = {
    realmUrl: `https://peer.decentraland.org`, //job.contentServerUrls![0],
    defaultPayload: {
      width: 512,
      height: 512,
      destPath: 'output/$coords.png',
      sceneDistance: 4,
      camera: {
        position: {
          x: 8,
          y: 25,
          z: -8
        },
        target: {
          x: 8,
          y: 0,
          z: -8
        },
        orthoSize: 25,
        projection: 'ortho'
      }
    },
    payload: centersToProcess.map((center) => ({ coords: center }))
  }

  const tempId = Date.now()
  const inputDataPath = `input-data-${tempId}.json`
  await writeFile(inputDataPath, JSON.stringify(inputData))

  const timeout = 45_000 + 60000 * centersToProcess.length
  try {
    const result = await runGodotExplorer(components, `--scene-renderer --scene-input-file ${inputDataPath}`, timeout)
    centersToProcess.forEach(async function (center) {
      await writeFile(`./output/${center}-stdout.log`, result.stdout)
      await writeFile(`./output/${center}-stderr.log`, result.stderr)
    })
  } catch (err) {
    logger.error('Failed to run godot')
  } finally {
    await rm(inputDataPath).catch(logger.error)
  }

  const outputPath = './output' // Replace with your path
  const files = await readdir(outputPath)
  for (const file of files) {
    const filePath = path.join(outputPath, file)
    logger.log(`Upload ${file}`)

    // await storage.storeFile(file, filePath)
  }
}
