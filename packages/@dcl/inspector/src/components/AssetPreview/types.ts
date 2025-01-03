export interface Props {
  value: File
  onScreenshot: (value: string) => void
  onLoad?: () => void
}
