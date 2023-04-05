import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import ReactDOM from 'react-dom/client'

import { App } from './components/App'
import { SdkProvider } from './components/SdkProvider'

import 'decentraland-ui/lib/styles.css'
import 'decentraland-ui/lib/dark-theme.css'
import './vars.css'

import { Buffer as MaybeBuffer } from 'buffer'
globalThis.Buffer = MaybeBuffer

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(
  <DndProvider backend={HTML5Backend}>
    <SdkProvider>
      <App />
    </SdkProvider>
  </DndProvider>
)
