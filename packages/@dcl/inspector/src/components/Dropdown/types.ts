export type Props = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
  options: string[] | { text: string; value: any }[]
}
