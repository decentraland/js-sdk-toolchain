type Button = React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>

export type PropTypes = Omit<Button, 'type' | 'size'> & {
  type?: 'danger' | 'etc'
  size?: 'big' | 'etc'
}
