import { getConfig } from '../../logic/config'

export async function downloadAssets(mappings: Record<string, string>) {
  const fileContent: Record<string, Buffer> = {}

  async function downloadAndAssignAsset([path, contentHash]: [string, string]) {
    const config = getConfig()
    try {
      const url = `${config.contentUrl}/contents/${contentHash}`
      const request = await fetch(url)
      const content = await request.arrayBuffer()
      fileContent[path] = Buffer.from(content)
    } catch (err) {
      console.error('Error fetching an asset for feed in-memory storage ' + path)
    }
  }

  const assetPromises = Object.entries(mappings).map(downloadAndAssignAsset)
  await Promise.all(assetPromises)

  return fileContent
}
