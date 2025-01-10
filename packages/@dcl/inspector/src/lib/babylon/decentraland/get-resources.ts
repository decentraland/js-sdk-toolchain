import { NullEngine, Scene } from '@babylonjs/core'
import { getDataLayerInterface } from '../../../redux/data-layer'
import { loadAssetContainer, resourcesByPath } from './sdkComponents/gltf-container'
import future from 'fp-future'

// This function takes a path to a gltf or glb file, loads it in Babylon, checks for all the resources loaded by the file, and returns them
export async function getResourcesFromModel(path: string) {
  const base = path.split('/').slice(0, -1).join('/')
  const src = path + '?base=' + encodeURIComponent(base)
  const engine = new NullEngine()
  const resources: Set<string> = new Set()
  const scene = new Scene(engine)
  const extension = path.toLowerCase().endsWith('.gltf') ? '.gltf' : '.glb'
  const dataLayer = getDataLayerInterface()
  if (!dataLayer) {
    return resources
  }
  const { content } = await dataLayer.getFile({ path })
  const file = new File([content], src)

  const load = future<void>()

  loadAssetContainer(
    file,
    scene,
    () => load.resolve(),
    () => {},
    (_scene, _error) => load.reject(new Error(_error)),
    extension,
    path
  )

  await load

  return resourcesByPath.get(path)
}

export async function getResourcesFromModels(paths: string[]): Promise<string[]> {
  const results = await Promise.all(paths.map(getResourcesFromModel))
  return results.flatMap((resourceSet) => (resourceSet ? Array.from(resourceSet) : []))
}
