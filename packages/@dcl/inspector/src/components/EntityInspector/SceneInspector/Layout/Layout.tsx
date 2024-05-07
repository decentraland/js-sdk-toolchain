import { useCallback, useState } from 'react'

import { Dropdown, InfoTooltip } from '../../../ui'
import { Block } from '../../../Block'
import { Button } from '../../../Button'
import { Grid, Props as GridProps } from './Grid'

import { getCoordinatesBetweenPoints, getCoordinatesInGridOrder, getOption, getSceneParcelInfo } from './utils'
import { Props, TILE_OPTIONS } from './types'

import './Layout.css'
import { getAxisLength } from './Grid/utils'

function Layout(props: Props) {
  const currentLayout = getSceneParcelInfo(props.value as string)
  const coordinates = getCoordinatesBetweenPoints(currentLayout.min, currentLayout.max)
  const orderedCoordinates = getCoordinatesInGridOrder(coordinates)
  const axisLength = getAxisLength(orderedCoordinates)
  const [grid, setGrid] = useState<GridProps['coords']>(orderedCoordinates)
  const numberOfParcels = coordinates.length

  const handleTileChange = useCallback((type: 'rows' | 'columns') => (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = Number(e.target.value)
    // switch (type) {
    //   case 'rows': return setGrid({ ...grid, rows: value })
    //   case 'columns': return setGrid({ ...grid, columns: value })
    // }
  }, [])

  const isTileDisabled = useCallback((coord: GridProps['coords'][0]) => {
    // TODO: disable grid coordinates that are not on the current parcels...
    return false
  }, [currentLayout])

  const handleTileClick = useCallback((coord: GridProps['coords'][0]) => {
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
          <Dropdown label="Rows" value={getOption(axisLength.y)} options={TILE_OPTIONS} onChange={handleTileChange('rows')} />
          <Dropdown label="Columns" value={getOption(axisLength.x)} options={TILE_OPTIONS} onChange={handleTileChange('columns')} />
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
