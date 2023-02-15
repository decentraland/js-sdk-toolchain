import React from 'react'
import ReactDOM from 'react-dom/client'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

import './index.css'
import TreeComponent from './components/tree/Tree'
import reportWebVitals from './reportWebVitals'

import { Tree } from './utils/tree'

// just an example tree
const tree: Tree = new Tree('src', 'directory', true)
  .addChild(
    new Tree('components', 'directory')
      .addChild(
        new Tree('tree', 'directory')
          .addChild(
            new Tree('deep', 'directory').addChild(new Tree('deep-file.ts')).addChild(new Tree('other-deep-file.ts'))
          )
          .addChild(new Tree('tree.tsx'))
          .addChild(new Tree('tree.css'))
      )
      .addChild(new Tree('modal', 'directory').addChild(new Tree('modal.tsx')).addChild(new Tree('modal.css')))
  )
  .addChild(new Tree('index.tsx'))
  .addChild(new Tree('index.css'))

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(
  <React.StrictMode>
    <DndProvider backend={HTML5Backend}>
      <TreeComponent value={tree} />
    </DndProvider>
  </React.StrictMode>
)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
