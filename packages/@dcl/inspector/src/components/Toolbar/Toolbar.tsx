import { useCallback } from 'react'
import { BiUndo, BiRedo } from 'react-icons/bi'
import { RiListSettingsLine } from 'react-icons/ri'
import { withSdk } from '../../hoc/withSdk'
import { Gizmos } from './Gizmos'
import { Button } from './Button'
import './Toolbar.css'

const Toolbar = withSdk(({ sdk }) => {
  const handleInspector = useCallback(() => {
    const { debugLayer } = sdk.scene
    if (debugLayer.isVisible()) {
      debugLayer.hide()
    } else {
      void debugLayer.show({ showExplorer: true, embedMode: true })
    }
  }, [])

  return (
    <div className="Toolbar">
      <Button className="undo" onClick={sdk?.dataLayer.undo}>
        <BiUndo />
      </Button>
      <Button className="redo" onClick={sdk?.dataLayer.redo}>
        <BiRedo />
      </Button>
      <Gizmos />
      <Button className="babylonjs-inspector" onClick={handleInspector}>
        <RiListSettingsLine />
      </Button>
    </div>
  )
})

export default Toolbar
