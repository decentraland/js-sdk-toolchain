import { useCallback, useState } from 'react'

import { Dropdown, InfoTooltip, TextField } from '../../../ui'
import { Block } from '../../../Block'
import { Button } from '../../../Button'
import { Grid, Props as GridProps } from './Grid'

import {
  coordToStr,
  getCoordinates,
  getMinMaxFromOrderedCoords,
  getOption,
  getLayoutInfo,
  stringifyGridError,
  getLayoutInfoFromString,
  strToCoord,
  transformCoordsToString,
  getEnabledCoords,
  hasCoord
} from './utils'
import { getAxisLengths } from './Grid/utils'
import { GridError, Mode, Props, TILE_OPTIONS } from './types'

import './Layout.css'
import { areConnected } from '@dcl/ecs'

type Coords = GridProps['coords'][0]

function Layout({ value, onChange }: Props) {
  const currentLayout = getLayoutInfo(value.parcels)
  const coordinates = getCoordinates(currentLayout.min, currentLayout.max)

  const [grid, setGrid] = useState<Coords[]>(coordinates)
  const [disabled, setDisabled] = useState(new Set<string>())
  const [mode, setMode] = useState<Mode>(Mode.GRID)
  const [base, setBase] = useState(value.base)

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

  const handleManualCoordsChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      const { min, max } = getLayoutInfoFromString(event.target.value)
      setGrid(getCoordinates(min, max))
    },
    [grid]
  )

  const handleBaseParcelChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      const coord = strToCoord(event.target.value)
      if (coord) setBase(coord)
    },
    [grid, base]
  )

  const isTileDisabled = useCallback(
    (coord: Coords) => {
      const str = coordToStr(coord)
      return disabled.has(str)
    },
    [disabled]
  )

  const isTileWithError = useCallback((coord: Coords) => {}, [grid, disabled])

  const isBaseTile = useCallback(
    (coord: Coords) => {
      return coord.x === base.x && coord.y === base.y
    },
    [base]
  )

  const handleTileClick = useCallback(
    (coord: Coords) => {
      const str = coordToStr(coord)
      if (disabled.has(str)) {
        disabled.delete(str)
      } else {
        disabled.add(str)
      }
      setDisabled(new Set(disabled))
    },
    [disabled]
  )

  const handleApplyClick = useCallback(() => {
    const parcels = grid.filter(($) => !disabled.has(coordToStr($)))
    onChange({ parcels, base })
  }, [grid, disabled, base])

  const handleModeChange = useCallback(
    (mode: Mode) => () => {
      setMode(mode)
    },
    [mode]
  )

  const getGridError = useCallback((): GridError | null => {
    if (numberOfCoords <= 0) return GridError.NUMBER_OF_PARCELS

    const coords = getEnabledCoords(grid, disabled)
    if (!areConnected(coords)) return GridError.NOT_CONNECTED
    if (!hasCoord(coords, base)) return GridError.MISSING_BASE_PARCEL
    return null
  }, [grid, base, disabled])

  const getTitle = useCallback(() => {
    if (mode === Mode.MANUAL) return 'Set Coordinates'
    return `${numberOfCoords} parcels`
  }, [grid, mode, disabled])

  const getInstruction = useCallback(() => {
    if (mode === Mode.MANUAL) return 'Type in the layout coordinates that you want to deploy'
    return 'Click individual tiles to exclude/include them from the layout'
  }, [mode])

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
          isBaseTile={isBaseTile}
          maxTileSize={50}
          minTileSize={3}
          visualThreshold={6}
        />
        <span className="error">{gridError !== null && stringifyGridError(gridError)}</span>
      </div>

      {mode === Mode.MANUAL ? (
        <Block className="manual">
          <TextField
            label="Custom coordinates"
            value={transformCoordsToString(grid, disabled)}
            onChange={handleManualCoordsChange}
          />
          <TextField label="Base parcel" value={coordToStr(base)} onChange={handleBaseParcelChange} />
          <Block>
            <Button type="dark" onClick={handleModeChange(Mode.GRID)}>
              Back
            </Button>
            <Button type="blue" onClick={handleApplyClick} disabled={!!gridError}>
              Confirm
            </Button>
          </Block>
        </Block>
      ) : (
        <>
          <Block label="Max. Grid Size" className="grid">
            <Dropdown
              label="Rows"
              value={getOption(axisLengths.y)}
              options={TILE_OPTIONS}
              onChange={handleGridChange('y')}
            />
            <Dropdown
              label="Columns"
              value={getOption(axisLengths.x)}
              options={TILE_OPTIONS}
              onChange={handleGridChange('x')}
            />
            <Button type="dark" onClick={handleModeChange(Mode.MANUAL)}>
              Set coordinates (advanced)
            </Button>
            <Button type="blue" size="big" onClick={handleApplyClick} disabled={!!gridError}>
              Apply layout
            </Button>
          </Block>
          <Block className="limitations">
            <span>About scene limitations</span>
            <InfoTooltip
              text=""
              link="https://docs.decentraland.org/creator/development-guide/sdk7/scene-limitations/"
              type="help"
            />
          </Block>
        </>
      )}
    </div>
  )
}

export default Layout
