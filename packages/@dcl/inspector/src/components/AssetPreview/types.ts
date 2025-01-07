export interface Props {
  value: File
  resources?: File[]
  onScreenshot: (value: string) => void
  onLoad?: () => void
}
