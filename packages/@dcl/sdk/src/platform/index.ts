import { getExplorerInformation } from '~system/Runtime'

export type Platform = 'mobile' | 'desktop' | 'web'

const VALID_PLATFORMS: Set<string> = new Set<string>(['mobile', 'desktop', 'web'])

let platform: Platform | null = null
void getExplorerInformation({})
  .then((response) => {
    const normalized = response.platform.toLowerCase()
    if (VALID_PLATFORMS.has(normalized)) {
      platform = normalized as Platform
    } else {
      console.error(`Unknown platform value: "${response.platform}"`)
    }
  })
  .catch((error) => {
    console.error('Failed to get explorer information:', error)
  })

export function getPlatform(): Platform | null {
  return platform
}

export function isMobile(): boolean {
  return getPlatform() === 'mobile'
}

export function isDesktop(): boolean {
  return getPlatform() === 'desktop'
}

export function isWeb(): boolean {
  return getPlatform() === 'web'
}
