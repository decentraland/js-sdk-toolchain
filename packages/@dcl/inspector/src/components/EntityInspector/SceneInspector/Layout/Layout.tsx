import { areConnected } from '@dcl/ecs'
import { useCallback, useMemo, useState } from 'react'
import { AiOutlineInfoCircle as InfoIcon } from 'react-icons/ai'

import { Dropdown } from '../../../ui'
import { Block } from '../../../Block'
import { Button } from '../../../Button'
import { Grid, Props as GridProps } from './Grid'

import {
  coordToStr,
  getMinMaxFromOrderedCoords,
  getOption,
  stringifyGridError,
  getLayoutInfoFromString,
  strToCoord,
  transformCoordsToString,
  getEnabledCoords,
  hasCoord,
  getGridInfo,
  isCoord,
  generateGridFrom
} from './utils'
import { getAxisLengths } from './Grid/utils'
import { ModeAdvanced } from './ModeAdvanced'
import { GridError, MAX_AXIS_PARCELS, Mode, Props, TILE_OPTIONS } from './types'
import { Value as ModeAdvancedValue } from './ModeAdvanced/types'

import './Layout.css'

type Coords = GridProps['coords'][0]

function Layout({ value, onChange }: Props) {
  const { grid: _grid } = useMemo(() => getGridInfo(value.parcels), [value.parcels])
  const [grid, setGrid] = useState(_grid)
  const [mode, setMode] = useState<Mode>(Mode.GRID)
  const [base, setBase] = useState(value.base)

  const [gridMin, gridMax] = useMemo(() => getMinMaxFromOrderedCoords(grid), [grid])
  const axisLengths = useMemo(() => getAxisLengths(grid), [grid])
  const enabledCoords = useMemo(() => getEnabledCoords(grid), [grid])
  const numberOfCoords = enabledCoords.length

  const handleGridChange = useCallback(
    (type: keyof Coords) => (e: React.ChangeEvent<HTMLSelectElement>) => {
      const num = Number(e.target.value)
      const axisLength = axisLengths[type]
      const diff = Math.abs(axisLength - num)
      const value = num > axisLength ? gridMax[type] + diff : gridMax[type] - diff
      const newMax: Coords = { ...gridMax, [type]: value }
      setGrid(generateGridFrom(grid, gridMin, newMax))
    },
    [grid, gridMin, gridMax, axisLengths]
  )

  const isTileDisabled = useCallback((coord: Coords) => !hasCoord(enabledCoords, coord), [enabledCoords])

  const isBaseTile = useCallback((coord: Coords) => coord.x === base.x && coord.y === base.y, [base])

  const handleTileClick = useCallback((coord: Coords) => {
    setGrid((prevGrid) => prevGrid.map(($) => (isCoord($, coord) ? { ...$, disabled: !$.disabled } : $)))
  }, [])

  const handleAdvancedConfirm = useCallback(
    (value: ModeAdvancedValue) => {
      const { min, max, length } = getLayoutInfoFromString(value.coords)
      const clampMax = {
        x: length.x > MAX_AXIS_PARCELS ? min.x + Math.min(MAX_AXIS_PARCELS, max.x) : max.x,
        y: length.y > MAX_AXIS_PARCELS ? min.y + Math.min(MAX_AXIS_PARCELS, max.y) : max.y
      }
      setGrid(generateGridFrom(grid, min, clampMax))
      setBase(strToCoord(value.base) || min)
    },
    [grid]
  )

  const applyCurrentState = useCallback(() => {
    onChange({ parcels: enabledCoords, base })
  }, [enabledCoords, base])

  const handleModeChange = useCallback((mode: Mode) => () => setMode(mode), [])

  const gridError = useMemo((): GridError | null => {
    if (numberOfCoords <= 0) return GridError.NUMBER_OF_PARCELS
    if (!areConnected(enabledCoords)) return GridError.NOT_CONNECTED
    if (!hasCoord(enabledCoords, base)) return GridError.MISSING_BASE_PARCEL
    return null
  }, [numberOfCoords, enabledCoords, base])

  const title = useMemo(() => {
    if (mode === Mode.ADVANCED) return 'Set Coordinates'
    return `${numberOfCoords} Parcel${numberOfCoords === 1 ? '' : 's'}`
  }, [numberOfCoords, mode])

  const instruction = useMemo(() => {
    if (mode === Mode.ADVANCED) return 'Type in the layout coordinates you want to deploy'
    return 'Click individual tiles to exclude/include them from the layout'
  }, [mode])

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
        <span className="error">{gridError && stringifyGridError(gridError)}</span>
      </div>

      {mode === Mode.ADVANCED ? (
        <ModeAdvanced
          value={{
            coords: transformCoordsToString(enabledCoords),
            base: coordToStr(base)
          }}
          disabled={!!gridError}
          onSubmit={handleAdvancedConfirm}
          onGoBack={handleModeChange(Mode.GRID)}
        />
      ) : (
        <>
          <Block label="Grid Size" className="grid">
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
            <Button type="dark" onClick={handleModeChange(Mode.ADVANCED)}>
              Set Coordinates (Advanced)
            </Button>
            <Button type="blue" size="big" onClick={applyCurrentState} disabled={!!gridError}>
              Apply Layout
            </Button>
          </Block>
          <Block className="limitations">
            <span>About Scene Limitations</span>
            <a href="https://docs.decentraland.org/creator/development-guide/sdk7/scene-limitations/" target="_blank">
              <InfoIcon size={16} />
            </a>
          </Block>
        </>
      )}
    </div>
  )
}

export default Layout
