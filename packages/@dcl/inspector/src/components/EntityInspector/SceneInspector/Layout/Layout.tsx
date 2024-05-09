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
  const [disabled, setDisabled] = useState(new Set<string>())

  const handleTileChange = (type: keyof Coords) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    // this should also work for negative parcels...
    const num = Number(e.target.value)
    const grixMaxAxis = gridMax[type]
    const axisLength = axisLengths[type]
    const diff = Math.abs(axisLength - num)
    const value = num > axisLength ? grixMaxAxis + diff : grixMaxAxis - diff
    const newMax: Coords = { ...gridMax, [type]: value }
    return setGrid(getCoordinates(gridMin, newMax))
  }

  const isTileDisabled = useCallback(({ x, y }: Coords) => {
    const str = `${x},${y}`
    return disabled.has(str)
  }, [currentLayout])

  const handleTileClick = useCallback(({ x, y }: Coords) => {
    const str = `${x},${y}`
    if (disabled.has(str)) {
      disabled.delete(str)
    } else {
      disabled.add(str)
    }
    setDisabled(new Set(disabled))
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
