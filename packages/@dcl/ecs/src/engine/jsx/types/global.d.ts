export declare global {
  import React from 'react'
  export namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Element extends React.ReactElement<any, any> {}

    interface IntrinsicElements {
      divui: unknown
      textui: unknown
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Component {}
  }
}
