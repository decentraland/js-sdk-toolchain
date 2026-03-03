import { getExplorerInformation } from '~system/Runtime'

export type Platform = 'mobile' | 'desktop' | 'web'

let platform: Platform | null = null
void getExplorerInformation({}).then((response) => {
  platform = response.platform as Platform
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
