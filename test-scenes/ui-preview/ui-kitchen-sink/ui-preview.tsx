// Entry for `sdk-commands ui-preview`. Registers the UI and exposes each
// kitchen-sink area as a panel in the preview's switcher.
import { setupUi, state } from './src/ui'

setupUi()

export default {
  Layout: () => (state.panel = 'layout'),
  Text: () => (state.panel = 'text'),
  Widgets: () => (state.panel = 'widgets'),
  Textures: () => (state.panel = 'textures'),
  Interactive: () => (state.panel = 'interactive')
}
