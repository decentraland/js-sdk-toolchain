import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './components/Tree'
import reportWebVitals from './reportWebVitals'

import { Tree } from './components/Tree'

const tree: Tree = {
  type: 'directory',
  value: 'src',
  childs: [{
    type: 'directory',
    value: 'components',
    childs: [{
      type: 'file',
      value: 'Tree.tsx',
      childs: []
    }, {
      type: 'file',
      value: 'Tree.css',
      childs: []
    }]
  }, {
    type: 'file',
    value: 'index.tsx',
      childs: []
  }, {
    type: 'file',
    value: 'index.css',
      childs: []
  }]
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(
  <React.StrictMode>
    <App value={tree} />
  </React.StrictMode>
)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
