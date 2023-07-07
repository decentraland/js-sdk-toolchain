export async function downloadAssets(mappings: Record<string, string>) {
  const fileContent: Record<string, Buffer> = {}

  async function downloadAndAssignAsset([path, contentHash]: [string, string]) {
    try {
      const url = `https://builder-api.decentraland.org/v1/storage/contents/${contentHash}`
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
