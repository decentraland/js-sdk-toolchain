import React, { useCallback, useMemo } from 'react'
import cx from 'classnames'
import {
  MdOutlineZoomIn as ZoomInIcon,
  MdOutlineZoomOut as ZoomOutIcon,
  MdKeyboard as KeyboardIcon
} from 'react-icons/md'
import { HiOutlineViewfinderCircle as ResetCameraIcon } from 'react-icons/hi2'

import { useContainerSize } from '../../../hooks/useContainerSize'
import { useOutsideClick } from '../../../hooks/useOutsideClick'
import { Button } from '../../Button'
import { InfoTooltip } from '../../ui'
import { Props } from './types'

import './Shortcuts.css'

const ICON_SIZE = 18

const Shortcuts: React.FC<Props> = ({ canvas, onResetCamera, onZoomIn, onZoomOut }) => {
  const [showShortcuts, setShowShortcuts] = React.useState(false)
  const { height } = useContainerSize(canvas)

  const maxOverlayHeight = useMemo(() => {
    return (height ?? 600) - 60
  }, [height])

  const handleToggleShortcutsOverlay = useCallback(
    (e: React.MouseEvent<HTMLButtonElement> | MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setShowShortcuts((value) => !value)
    },
    [showShortcuts, setShowShortcuts]
  )

  const overlayRef = useOutsideClick(handleToggleShortcutsOverlay)

  return (
    <div className="Shortcuts">
      <div className="Buttons">
        <Button onClick={onResetCamera}>
          <ResetCameraIcon size={ICON_SIZE} />
        </Button>
        <div className="ZoomButtons">
          <Button onClick={onZoomIn}>
            <ZoomInIcon size={ICON_SIZE} />
          </Button>
          <Button onClick={onZoomOut}>
            <ZoomOutIcon size={ICON_SIZE} />
          </Button>
        </div>
        <InfoTooltip
          text="View Shortcuts"
          trigger={
            <Button className={cx({ Active: showShortcuts })} onClick={handleToggleShortcutsOverlay}>
              <KeyboardIcon size={ICON_SIZE} />
            </Button>
          }
          openOnTriggerMouseEnter={!showShortcuts}
          closeOnTriggerClick={true}
          position="top center"
        />
      </div>
      {showShortcuts && (
        <div ref={overlayRef} className="Overlay" style={{ maxHeight: maxOverlayHeight }}>
          <h2 className="Header">Shortcuts</h2>
          <div className="Items">
            <h5 className="SubHeader">General</h5>
            <div className="Item">
              <div className="Title">Pan Camera</div>
              <div className="Description">
                <span className="Key">W</span>
                <span className="Key">A</span>
                <span className="Key">S</span>
                <span className="Key">D</span>
              </div>
            </div>
            <div className="Item">
              <div className="Title">Rotate Camera</div>
              <div className="Description">
                <span className="Key">Left Mouse Button</span>+<span className="Key">Drag</span>
              </div>
            </div>
            <div className="Item">
              <div className="Title">Select Multiple Items</div>
              <div className="Description">
                Hold<span className="Key">ctrl</span>and click
              </div>
            </div>
            <div className="Item">
              <div className="Title">Save</div>
              <div className="Description">
                <span className="Key">ctrl</span>+<span className="Key">S</span>
              </div>
            </div>
            <div className="Item">
              <div className="Title">Undo</div>
              <div className="Description">
                <span className="Key">ctrl</span>+<span className="Key">Z</span>
              </div>
            </div>
            <div className="Item">
              <div className="Title">Redo</div>
              <div className="Description">
                <span className="Key">ctrl</span>+<span className="Key">Y</span>
              </div>
            </div>
            <div className="Item">
              <div className="Title">Copy</div>
              <div className="Description">
                <span className="Key">ctrl</span>+<span className="Key">C</span>
              </div>
            </div>
            <div className="Item">
              <div className="Title">Paste</div>
              <div className="Description">
                <span className="Key">ctrl</span>+<span className="Key">V</span>
              </div>
            </div>
            <div className="Item">
              <div className="Title">Reset Camera</div>
              <div className="Description">
                <span className="Key">space</span>
              </div>
            </div>
          </div>
          <div className="Items">
            <h5 className="SubHeader">Item Selected</h5>
            <div className="Item">
              <div className="Title">Snap to Grid</div>
              <div className="Description">
                Hold<span className="Key">shift</span>
              </div>
            </div>
            <div className="Item">
              <div className="Title">Toggle Positioning</div>
              <div className="Description">
                <span className="Key">M</span>
              </div>
            </div>
            <div className="Item">
              <div className="Title">Toggle Rotating</div>
              <div className="Description">
                <span className="Key">R</span>
              </div>
            </div>
            <div className="Item">
              <div className="Title">Toggle Scaling</div>
              <div className="Description">
                <span className="Key">X</span>
              </div>
            </div>
            <div className="Item">
              <div className="Title">Duplicate</div>
              <div className="Description">
                <span className="Key">ctrl</span>+<span className="Key">D</span>
              </div>
            </div>
            <div className="Item">
              <div className="Title">Delete</div>
              <div className="Description">
                <span className="Key">del</span>or
                <span className="Key">backspace</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default React.memo(Shortcuts)
