
import { PBUiText } from '../src/components/generated/pb/UiText.gen'
import { PBUiTransform } from '../src/components/generated/pb/UiTransform.gen'

type DivOpts = Partial<Omit<PBUiTransform, 'parent'>>
type TextOpts = Partial<Omit<PBUiText, 'text'>>

declare global {
  /*
  * @jsx jsx
  */

declare namespace JSX {
  // The return type of our JSX Factory
  type Element = null
  interface HTMLElementTagNameMap {
    divui: DivOpts
    textui: TextOpts
  }

  // IntrinsicElementMap grabs all the standard HTML tags in the TS DOM lib.
  type IntrinsicElements = IntrinsicElementMap

  // The following are custom types, not part of TS's known JSX namespace:
  type IntrinsicElementMap = {
    [K in keyof HTMLElementTagNameMap]: {
      [k: string]: any
    }
  }

  type Tag = keyof JSX.IntrinsicElements

  interface Component {
    (properties?: { [key: string]: any }, children?: any[]): Node
  }
}
}

export {}