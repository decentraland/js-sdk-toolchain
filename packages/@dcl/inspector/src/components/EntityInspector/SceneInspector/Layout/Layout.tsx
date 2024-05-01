import { useCallback, useState } from 'react'

import { Dropdown } from '../../../ui'
import { Block } from '../../../Block'
import { Button } from '../../../Button'
import { Grid, Props as GridProps } from './Grid'

import { Props, TILE_OPTIONS } from './types'

import './Layout.css'

function Layout(props: Props) {
  const [grid, setGrid] = useState<GridProps['grid']>({ rows: 2, columns: 2 })
  const numberOfParcels = grid.rows * grid.columns

  const handleTileChange = useCallback((type: 'rows' | 'columns') => (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = Number(e.target.value)
    switch (type) {
      case 'rows': return setGrid({ ...grid, rows: value })
      case 'columns': return setGrid({ ...grid, columns: value })
    }
  }, [grid.rows, grid.columns])

  return (
    <div className="SceneLayout">
      <div className="display">
        <h2>{numberOfParcels} parcels</h2>
        <span>Click individual tiles to exclude/include them from the layout</span>

        <Grid grid={grid} maxTileSize={50} minTileSize={3} visualThreshold={10} />
      </div>

      <Block label="Max. Grid Size" className="underlined">
        <Dropdown label="Rows" value={grid.rows} options={TILE_OPTIONS} onChange={handleTileChange('rows')} />
        <Dropdown label="Columns" value={grid.columns} options={TILE_OPTIONS} onChange={handleTileChange('columns')} />
        <Button className="set-coordinates" onClick={() => null}>Set coordinates (advanced)</Button>
        <Button className="apply" onClick={() => null}>Apply layout</Button>
        <span>About scene limitations</span>
      </Block>
    </div>
  )
}

export default Layout
