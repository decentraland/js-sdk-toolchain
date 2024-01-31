export interface Props {
  canvas: React.RefObject<HTMLCanvasElement>
  onResetCamera: () => void
  onZoomIn: () => void
  onZoomOut: () => void
}
