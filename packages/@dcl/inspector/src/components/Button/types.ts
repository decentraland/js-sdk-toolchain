type Button = React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>

export type PropTypes = Omit<Button, 'type' | 'size'> & {
  type?: 'danger' | 'dark' | 'blue' | 'etc'
  size?: 'big' | 'etc'
}
