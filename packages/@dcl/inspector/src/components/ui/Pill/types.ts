export interface Props {
  content: React.ReactNode
  className?: string
  onClick?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
  onRemove?: (e: React.MouseEvent<SVGElement, MouseEvent>) => void
}
