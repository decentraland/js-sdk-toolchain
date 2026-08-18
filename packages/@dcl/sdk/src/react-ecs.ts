/**
 * The module react-ecs is exposed by the sdk in the /react-ecs path.
 *
 * UI components and semantics for the SDK 7.
 *
 * JSX & Flexbox is used due to its market adoption and availability of implementations and documentation and expertise.
 * @example
 * ```tsx
 * import ReactEcs, { Label, ReactEcsRenderer } from '@dcl/sdk/react-ecs'
 * const Ui = () => <Label value="SDK 7" />
 * ReactEcsRenderer.setUiRenderer(ui)
 * ```
 *
 *
 * Go to the Function section to see all the UI Components.
 * @module ReactEcs
 *
 */

import ReactEcs from '@dcl/react-ecs'
import { setIsMobileProvider } from '@dcl/react-ecs/dist/platform'
import { isMobile } from './platform'

// react-ecs cannot reach ~system/Runtime itself, so the platform check used
// for virtual screen size defaults is injected here.
setIsMobileProvider(isMobile)

export * from '@dcl/react-ecs'
export default ReactEcs
