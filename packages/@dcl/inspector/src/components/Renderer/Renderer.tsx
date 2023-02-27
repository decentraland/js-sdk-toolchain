import React, { useEffect, useRef } from 'react'
import './Renderer.css'

import { initEngine } from '../../lib/babylon/setup/index'

type Props = {
  //
}

const Renderer: React.FC<Props> = (_props) => {
  const reactCanvas = useRef(null)

  // set up basic engine and scene
  useEffect(() => {
    const { current: canvas } = reactCanvas

    if (!canvas) return

    const { dispose } = initEngine(canvas)

    return dispose
  }, [])

  return <canvas ref={reactCanvas} />
}

export default React.memo(Renderer)
