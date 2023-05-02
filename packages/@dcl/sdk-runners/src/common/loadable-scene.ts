export type ContentServerEntity = {
  // content files of the entity
  content: Array<{ file: string; hash: string }>
  // entity metadata
  metadata: any
}

export type LoadableScene = Readonly<{
  // baseUrl to download all assets
  baseUrl: string
  // entity Id
  urn: string
  // entity file fom the content server
  entity: ContentServerEntity
}>

export function resolveFile(entity: Pick<ContentServerEntity, 'content'>, src: string): string | null {
  // filenames are lower cased as per https://adr.decentraland.org/adr/ADR-80
  const normalized = src.toLowerCase()

  // and we iterate over the entity content mappings to resolve the file hash
  for (const { file, hash } of entity.content) {
    if (file.toLowerCase() === normalized) return hash
  }

  return null
}

export function resolveFileAbsolute(scene: LoadableScene, src: string): string | null {
  const resolved = resolveFile(scene.entity, src)

  if (resolved) return scene.baseUrl + resolved

  return null
}
