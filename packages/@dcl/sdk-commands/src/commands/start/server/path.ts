import path from 'path'

/**
 * Resolves a requested path and returns it only when it is contained by the given root.
 *
 * @param root - Directory that must contain the resolved path.
 * @param requestedPath - Relative or absolute path to validate.
 * @returns The absolute resolved path, or `undefined` when it escapes the root.
 */
export function resolvePathInside(root: string, requestedPath: string): string | undefined {
  const resolvedRoot = path.resolve(root)
  const resolvedPath = path.resolve(resolvedRoot, requestedPath)
  const relativePath = path.relative(resolvedRoot, resolvedPath)

  if (relativePath === '') return resolvedPath
  if (path.isAbsolute(relativePath) || relativePath === '..' || relativePath.startsWith(`..${path.sep}`)) {
    return undefined
  }

  return resolvedPath
}
