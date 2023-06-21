import { Loader } from 'decentraland-ui/dist/components/Loader/Loader'
import { Dimmer } from 'decentraland-ui/dist/components/Dimmer/Dimmer'

import { Props } from './types'

export function Loading({ dimmer = true }: Props) {
  return (
    <div className="loading">
      <Loader active />
      <Dimmer active={dimmer} />
    </div>
  )
}
