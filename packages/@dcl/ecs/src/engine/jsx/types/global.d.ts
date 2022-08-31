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

export declare global {
  export namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Element extends ReactElement<any, any> {}

    interface IntrinsicElements {
      divui: unknown
      textui: unknown
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Component {}
  }
}
