import { DivProps } from '..'
import { PBUiText } from '../../../components/generated/pb/UiText.gen'

export type Key = string | number
export interface ReactElement<
  P = any,
  T extends string | JSXElementConstructor<any> =
    | string
    | JSXElementConstructor<any>
> {
  type: T
  props: P
  key: Key | null
}

export type JSXElementConstructor<P> = (
  props: P
) => ReactElement<any, any> | null

export type TextOpts = Partial<Omit<PBUiText, 'text'>>

export declare global {
  export namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Element extends ReactElement<any, any> {}

    type IntrinsicElements = {
      divui: Partial<DivProps>
      textui: Partial<TextOpts>
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Component {}
  }
}
