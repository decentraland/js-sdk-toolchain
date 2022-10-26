export type OnClick = () => Promise<void> | void

export type Listeners = {
  onClick?: OnClick
}

export const isListener = (key: string): key is keyof Listeners => {
  if (key === 'onClick') return true
  return false
}
