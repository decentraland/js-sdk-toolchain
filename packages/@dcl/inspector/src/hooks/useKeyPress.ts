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
export const ZOOM_IN = `=`
export const ZOOM_IN_ALT = '+'
export const ZOOM_OUT = `-`
export const ZOOM_OUT_ALT = `_`

/**
 * Hook that listens for key presses and triggers a callback function when the specified keys are pressed.
 *
 * @param keys - An array of strings representing the keys to listen for.
 * @param callback - The callback function to be executed when the specified keys are pressed.
 * @param node - The target DOM node to attach the event listener to. If not provided, the listener will be attached to the entire document.
 */
export const useKeyPress = (keys: string | string[], callback: KeyHandler, node: any = null) => {
  const callbackRef = useRef(callback)
  useLayoutEffect(() => {
    callbackRef.current = callback
  })

  useEffect(() => {
    const targetDocument = node ?? document
    const formattedKeys = Array.isArray(keys) ? keys.join(',') : keys

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

    return () => {
      hotkeys.unbind(formattedKeys)
    }
  }, [node])
}
