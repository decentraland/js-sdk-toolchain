export interface PropTypes {
  type: 'horizontal' | 'vertical'
  min?: 'initial' | number
  initial?: number
  max?: number
  onChange?(value: [number, number]): void
}

export interface TypeProps {
  offsetValue: 'offsetWidth' | 'offsetHeight'
  eventClientValue: 'clientX' | 'clientY'
  css: {
    childs: 'width' | 'height'
    handle: 'left' | 'top'
  }
}

export const HORIZONTAL_PROPS: TypeProps = {
  offsetValue: 'offsetWidth',
  eventClientValue: 'clientX',
  css: {
    childs: 'width',
    handle: 'left'
  }
}

export const VERTICAL_PROPS: TypeProps = {
  offsetValue: 'offsetHeight',
  eventClientValue: 'clientY',
  css: {
    childs: 'height',
    handle: 'top'
  }
}
