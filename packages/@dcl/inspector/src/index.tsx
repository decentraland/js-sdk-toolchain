import { Provider } from 'react-redux'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import ReactDOM from 'react-dom/client'
import { Buffer as MaybeBuffer } from 'buffer'

import { store } from './redux/store'
import { App } from './components/App'
import { SdkProvider } from './components/SdkProvider'

import 'decentraland-ui/lib/styles.css'
import 'decentraland-ui/lib/dark-theme.css'
import 'react-contexify/ReactContexify.css'
import './vars.css'
import './index.css'

globalThis.Buffer = MaybeBuffer

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(
  <DndProvider backend={HTML5Backend}>
    <Provider store={store}>
      <SdkProvider>
        <App />
      </SdkProvider>
    </Provider>
  </DndProvider>
)
