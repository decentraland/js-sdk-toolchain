export type Props = {
  label?: string
  onDrop?: (val: any) => void
  onDropHover?: (isHover: boolean) => void
  acceptDropTypes?: string[]
}
