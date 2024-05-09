import { useCallback, useEffect, useState } from 'react'

import { Dropdown, InfoTooltip, TextField } from '../../../ui'
import { Block } from '../../../Block'
import { Button } from '../../../Button'
import { Grid, Props as GridProps } from './Grid'

import { coordToStr, getCoordinates, getMinMaxFromOrderedCoords, getOption, getLayoutInfo, transformCoordsToValue, stringifyGridError } from './utils'
import { getAxisLengths } from './Grid/utils'
import { GridError, Mode, Props, TILE_OPTIONS } from './types'

import './Layout.css'
import { areConnected } from '@dcl/ecs'

type Coords = GridProps['coords'][0]

function Layout(props: Props) {
  const currentLayout = getLayoutInfo(props.value as string)
  const coordinates = getCoordinates(currentLayout.min, currentLayout.max)

  const [grid, setGrid] = useState<Coords[]>(coordinates)
  const [disabled, setDisabled] = useState(new Set<string>())
  const [mode, setMode] = useState<Mode>(Mode.GRID)

  const [gridMin, gridMax] = getMinMaxFromOrderedCoords(grid)
  const axisLengths = getAxisLengths(grid)
  const numberOfCoords = grid.length - disabled.size

  const handleGridChange = (type: keyof Coords) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    // this should also work for negative parcels...
    const num = Number(e.target.value)
    const grixMaxAxis = gridMax[type]
    const axisLength = axisLengths[type]
    const diff = Math.abs(axisLength - num)
    const value = num > axisLength ? grixMaxAxis + diff : grixMaxAxis - diff
    const newMax: Coords = { ...gridMax, [type]: value }
    return setGrid(getCoordinates(gridMin, newMax))
  }

  const handleManualChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((event) => {
    const { min, max } = getLayoutInfo(event.target.value)
    setGrid(getCoordinates(min, max))
  }, [])

  const isTileDisabled = useCallback((coord: Coords) => {
    const str = coordToStr(coord)
    return disabled.has(str)
  }, [grid])

  const handleTileClick = useCallback((coord: Coords) => {
    const str = coordToStr(coord)
    if (disabled.has(str)) {
      disabled.delete(str)
    } else {
      disabled.add(str)
    }
    setDisabled(new Set(disabled))
  }, [])

  const handleApplyClick = useCallback(() => {
    if (props.onChange) {
      const value = transformCoordsToValue(grid, disabled)
      props.onChange({ target: { value } } as React.ChangeEvent<HTMLInputElement>)
    }
  }, [grid, disabled])

  const handleModeChange = useCallback((mode: Mode) => () => {
    setMode(mode)
  }, [])

  const getGridError = useCallback((): GridError | null => {
    if (numberOfCoords <= 0) return GridError.NUMBER_OF_PARCELS
    if (!areConnected(grid.filter(($) => !disabled.has(coordToStr($))))) return GridError.NOT_CONNECTED
    return null
  }, [grid, disabled])

  const getTitle = useCallback(() => {
    if (mode === Mode.MANUAL) return 'Set Coordinates'
    return `${numberOfCoords} parcels`
  }, [mode])

  const getInstruction = useCallback((() => {
    if (mode === Mode.MANUAL) return 'Type in the layout coordinates that you want to deploy'
    return 'Click individual tiles to exclude/include them from the layout'
  }), [mode])

  const title = getTitle()
  const instruction = getInstruction()
  const gridError = getGridError()

  return (
    <div className="SceneLayout">
      <div className="display">
        <h2>{title}</h2>
        <span>{instruction}</span>
        <Grid
          coords={grid}
          isTileDisabled={isTileDisabled}
          handleTileClick={handleTileClick}
          maxTileSize={50}
          minTileSize={3}
          visualThreshold={6}
        />
        <span className="error">{gridError !== null && stringifyGridError(gridError)}</span>
      </div>

      {
        mode === Mode.MANUAL ?
        <Block className="manual">
          <TextField label="Custom coordinates" value={transformCoordsToValue(grid, disabled)} onChange={handleManualChange} />
          <Block>
            <Button type="dark" onClick={handleModeChange(Mode.GRID)}>Back</Button>
            <Button type="blue" onClick={handleApplyClick}>Confirm</Button>
          </Block>
        </Block> :
        <Block label="Max. Grid Size" className="grid">
          <Dropdown label="Rows" value={getOption(axisLengths.y)} options={TILE_OPTIONS} onChange={handleGridChange('y')} />
          <Dropdown label="Columns" value={getOption(axisLengths.x)} options={TILE_OPTIONS} onChange={handleGridChange('x')} />
          <Button type="dark" onClick={handleModeChange(Mode.MANUAL)}>Set coordinates (advanced)</Button>
          <Button type="blue" size="big" onClick={handleApplyClick} disabled={!!gridError}>Apply layout</Button>
        </Block>
      }
      <Block className="limitations">
        <span>About scene limitations</span>
        <InfoTooltip text="Some text" type="help" />
      </Block>
    </div>
  )
}

export default Layout
