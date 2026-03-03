import { getExplorerInformation } from '~system/Runtime'
import { Atom } from '../atom'

export type Platform = 'mobile' | 'desktop' | 'vr' | 'web'

const platformAtom = Atom<Platform>()
void getExplorerInformation({}).then((response) => {
  platformAtom.swap(response.platform as Platform)
})

export function getPlatform(): Platform | null {
  return platformAtom.getOrNull()
}

export function isMobile(): boolean {
  return getPlatform() === 'mobile'
}

export function isDesktop(): boolean {
  return getPlatform() === 'desktop'
}

export function isVR(): boolean {
  return getPlatform() === 'vr'
}

export function isWeb(): boolean {
  return getPlatform() === 'web'
}
