import os from 'os'

/**
 * Returns true only when running inside WSL2.
 */
export function isWSL2(): boolean {
  if (process.platform !== 'linux') return false

  const release = os.release().toLowerCase()
  const isWsl = release.includes('microsoft') || !!process.env.WSL_DISTRO_NAME
  if (!isWsl) return false

  // WSL2 kernels usually contain "wsl2" in os.release(), and expose WSL_INTEROP.
  return release.includes('wsl2') || !!process.env.WSL_INTEROP
}
