import { CliComponents } from '../../components'

export async function analyticsFeatures(
  components: CliComponents,
  path: string
): Promise<{ serverlessMultiplayer: boolean }> {
  const gameJs = await components.fs.readFile(path)
  const serverlessMultiplayer = gameJs.includes('syncEntity')

  return {
    serverlessMultiplayer
  }
}
