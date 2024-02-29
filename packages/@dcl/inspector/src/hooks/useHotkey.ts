import { useEffect, useLayoutEffect, useRef } from 'react'
import hotkeys, { KeyHandler } from 'hotkeys-js'

export const SHIFT = 'shift'
export const CTRL = 'ctrl'
export const ALT = 'alt'
export const COMMAND = 'command'
export const DELETE = 'delete'
export const BACKSPACE = 'backspace'
export const COPY = `${CTRL}+c`
export const COPY_ALT = `${COMMAND}+c`
export const PASTE = `${CTRL}+v`
export const PASTE_ALT = `${COMMAND}+v`
export const UNDO = `${CTRL}+z`
export const UNDO_ALT = `${COMMAND}+z`
export const REDO = `${CTRL}+${SHIFT}+z`
export const REDO_2 = `${CTRL}+y`
export const REDO_ALT = `${COMMAND}+${SHIFT}+z`
export const REDO_ALT_2 = `${COMMAND}+y`
export const ZOOM_IN = `=`
export const ZOOM_IN_ALT = '+'
export const ZOOM_OUT = `-`
export const ZOOM_OUT_ALT = `_`
export const RESET_CAMERA = 'space'
export const SAVE = `${CTRL}+s`
export const SAVE_ALT = `${COMMAND}+s`
export const DUPLICATE = `${CTRL}+d`
export const DUPLICATE_ALT = `${COMMAND}+d`

/**
 * Hook that listens for key presses and triggers a callback function when the specified keys are pressed.
 *
 * @param keys - An array of strings representing the keys to listen for.
 * @param callback - The callback function to be executed when the specified keys are pressed.
 * @param node - The target DOM node to attach the event listener to. If not provided, the listener will be attached to the entire document.
 */
export const useHotkey = (keys: string | string[], callback: KeyHandler | (() => void), node: any = undefined) => {
  const callbackRef = useRef(callback)
  useLayoutEffect(() => {
    callbackRef.current = callback
  })

  useEffect(() => {
    // Uses document when the node is undefined
    const targetDocument = node !== undefined ? node : document
    const formattedKeys = Array.isArray(keys) ? keys.join(',') : keys
    if (targetDocument) {
      hotkeys(
        formattedKeys,
        {
          element: targetDocument
        },
        (event, handler) => {
          event.preventDefault()
          callbackRef.current(event, handler)
        }
      )
    }
    return () => {
      if (targetDocument) {
        hotkeys.unbind(formattedKeys)
      }
    }
  }, [node])
}
