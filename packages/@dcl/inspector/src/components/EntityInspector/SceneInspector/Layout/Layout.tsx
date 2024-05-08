import { useCallback, useState } from 'react'

import { Dropdown, InfoTooltip } from '../../../ui'
import { Block } from '../../../Block'
import { Button } from '../../../Button'
import { Grid, Props as GridProps } from './Grid'

import { getCoordinates, getMinMaxFromOrderedCoords, getOption, getSceneParcelInfo } from './utils'
import { getAxisLengths } from './Grid/utils'
import { Props, TILE_OPTIONS } from './types'

import './Layout.css'

type Coords = GridProps['coords'][0]

function Layout(props: Props) {
  const currentLayout = getSceneParcelInfo(props.value as string)
  const coordinates = getCoordinates(currentLayout.min, currentLayout.max)

  const [grid, setGrid] = useState<Coords[]>(coordinates)
  const [gridMin, gridMax] = getMinMaxFromOrderedCoords(grid)
  const axisLengths = getAxisLengths(grid)
  const numberOfParcels = grid.length

  const handleTileChange = (type: keyof Coords) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    // all this uglyness so we can handle negative coords in parcels...
    const num = Number(e.target.value)
    const grixMaxAxis = gridMax[type]
    const axisLength = axisLengths[type]
    const sign = Math.sign(grixMaxAxis) || 1
    const diff = Math.abs(axisLength - (num * sign))
    const value = grixMaxAxis > num ? grixMaxAxis - diff : grixMaxAxis + diff
    const newMax: Coords = { ...gridMax, [type]: value }
    return setGrid(getCoordinates(gridMin, newMax))
  }

  const isTileDisabled = useCallback((coord: Coords) => {
    // TODO: disable grid coordinates that are not on the current parcels...
    return false
  }, [currentLayout])

  const handleTileClick = useCallback((coord: Coords) => {
    // TODO: add/remove coord to the current parcels list...
  }, [])

  return (
    <div className="SceneLayout">
      <div className="display">
        <h2>{numberOfParcels} parcels</h2>
        <span>Click individual tiles to exclude/include them from the layout</span>

        <Grid
          coords={grid}
          isTileDisabled={isTileDisabled}
          handleTileClick={handleTileClick}
          maxTileSize={50}
          minTileSize={3}
          visualThreshold={10}
        />
      </div>

      <Block label="Max. Grid Size">
        <Block>
          <Dropdown label="Rows" value={getOption(axisLengths.y)} options={TILE_OPTIONS} onChange={handleTileChange('y')} />
          <Dropdown label="Columns" value={getOption(axisLengths.x)} options={TILE_OPTIONS} onChange={handleTileChange('x')} />
        </Block>
        <Button type="dark" onClick={() => null}>Set coordinates (advanced)</Button>
        <Button type="blue" size="big" onClick={() => null}>Apply layout</Button>
        <Block className="limitations">
          <span>About scene limitations</span>
          <InfoTooltip text="Some text" type="help" />
        </Block>
      </Block>
    </div>
  )
}

export default Layout
