export type AssetPacksCopy = { dir: string; version: string }

function parseVersion(version: string): number[] | undefined {
  const match = /^(\d+)\.(\d+)\.(\d+)(-.+)?$/.exec(version.trim())
  if (!match) return undefined
  // a prerelease sorts before its release
  return [Number(match[1]), Number(match[2]), Number(match[3]), match[4] ? 0 : 1]
}

function isOlder(version: string, than: string): boolean {
  const a = parseVersion(version)
  const b = parseVersion(than)
  if (!a || !b) return !a && !!b
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] < b[i]
  }
  return false
}

/**
 * Picks the asset-packs copy a scene is built with. A scene's own copy wins unless it is
 * older than the one bundled with sdk-commands: an old copy can't use the network helpers
 * this SDK injects, which silently breaks the Admin Toolkit and flags every editor scene
 * as needing a multiplayer server.
 */
export function pickAssetPacks(
  sceneOwn: AssetPacksCopy | undefined,
  bundled: AssetPacksCopy | undefined
): { dir: string; warning?: string } | undefined {
  if (!sceneOwn) return bundled && { dir: bundled.dir }
  if (!bundled || !isOlder(sceneOwn.version, bundled.version)) return { dir: sceneOwn.dir }
  return {
    dir: bundled.dir,
    warning:
      `This scene has @dcl/asset-packs ${sceneOwn.version}, which is too old for this SDK, so the build uses ` +
      `the bundled ${bundled.version}. Update it (npm i @dcl/asset-packs@latest) or remove it from package.json.`
  }
}
