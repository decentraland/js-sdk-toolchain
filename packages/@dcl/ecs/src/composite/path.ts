const currentWorkingDir = '/'

/**
 * The functions `normalizeStringPosix`, `dirname` and `resolve`
 * were extracted from package @browserify/path
 */

/* istanbul ignore next */
function normalizeStringPosix(path: string, allowAboveRoot: boolean = false) {
  let res = ''
  let lastSegmentLength = 0
  let lastSlash = -1
  let dots = 0
  let code
  for (let i = 0; i <= path.length; ++i) {
    if (i < path.length) code = path.charCodeAt(i)
    else if (code === 47 /*/*/) break
    else code = 47 /*/*/
    if (code === 47 /*/*/) {
      if (lastSlash === i - 1 || dots === 1) {
        // NOOP
      } else if (lastSlash !== i - 1 && dots === 2) {
        if (
          res.length < 2 ||
          lastSegmentLength !== 2 ||
          res.charCodeAt(res.length - 1) !== 46 /*.*/ ||
          res.charCodeAt(res.length - 2) !== 46 /*.*/
        ) {
          if (res.length > 2) {
            const lastSlashIndex = res.lastIndexOf('/')
            if (lastSlashIndex !== res.length - 1) {
              if (lastSlashIndex === -1) {
                res = ''
                lastSegmentLength = 0
              } else {
                res = res.slice(0, lastSlashIndex)
                lastSegmentLength = res.length - 1 - res.lastIndexOf('/')
              }
              lastSlash = i
              dots = 0
              continue
            }
          } else if (res.length === 2 || res.length === 1) {
            res = ''
            lastSegmentLength = 0
            lastSlash = i
            dots = 0
            continue
          }
        }
        if (allowAboveRoot) {
          if (res.length > 0) res += '/..'
          else res = '..'
          lastSegmentLength = 2
        }
      } else {
        if (res.length > 0) res += '/' + path.slice(lastSlash + 1, i)
        else res = path.slice(lastSlash + 1, i)
        lastSegmentLength = i - lastSlash - 1
      }
      lastSlash = i
      dots = 0
    } else if (code === 46 /*.*/ && dots !== -1) {
      ++dots
    } else {
      dots = -1
    }
  }
  return res
}

/* istanbul ignore next */
export function resolve(...args: string[]) {
  let resolvedPath = ''
  let resolvedAbsolute = false
  let cwd

  for (let i = args.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    let path
    if (i >= 0) path = args[i]
    else {
      if (cwd === undefined) cwd = currentWorkingDir
      path = cwd
    }
    // Skip empty entries
    if (path.length === 0) {
      continue
    }

    resolvedPath = path + '/' + resolvedPath
    resolvedAbsolute = path.charCodeAt(0) === 47 /*/*/
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeStringPosix(resolvedPath, !resolvedAbsolute)

  if (resolvedAbsolute) {
    if (resolvedPath.length > 0) return '/' + resolvedPath
    else return '/'
  } else if (resolvedPath.length > 0) {
    return resolvedPath
  } else {
    return '.'
  }
}

/* istanbul ignore next */
export function dirname(path: string) {
  if (path.length === 0) return '.'
  let code = path.charCodeAt(0)
  const hasRoot = code === 47 /*/*/
  let end = -1
  let matchedSlash = true
  for (let i = path.length - 1; i >= 1; --i) {
    code = path.charCodeAt(i)
    if (code === 47 /*/*/) {
      if (!matchedSlash) {
        end = i
        break
      }
    } else {
      // We saw the first non-path separator
      matchedSlash = false
    }
  }

  if (end === -1) return hasRoot ? '/' : '.'
  if (hasRoot && end === 1) return '//'
  return path.slice(0, end)
}

export function resolveComposite(path: string, cwd: string) {
  const absolutePath = path.startsWith('.') ? resolve(cwd, path) : resolve(path)
  return absolutePath.substring(1)
}
