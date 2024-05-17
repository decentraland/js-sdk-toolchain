import { areConnected } from '@dcl/ecs'
import { useCallback, useState } from 'react'
import { AiOutlineInfoCircle as InfoIcon } from 'react-icons/ai'

import { Dropdown } from '../../../ui'
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
import { ModeAdvanced } from './ModeAdvanced'
import { GridError, MAX_AXIS_PARCELS, Mode, Props, TILE_OPTIONS } from './types'
import { Value as ModeAdvancedValue } from './ModeAdvanced/types'

import './Layout.css'

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
  const enabledCoords = getEnabledCoords(grid, disabled)
  const numberOfCoords = enabledCoords.length

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

  const isTileDisabled = useCallback(
    (coord: Coords) => {
      const str = coordToStr(coord)
      return disabled.has(str)
    },
    [grid, disabled]
  )

  // const isTileDisconnected = useCallback((coord: Coords) => {}, [grid, disabled])

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
    [grid, disabled]
  )

  const handleAdvancedConfirm = useCallback(
    (value: ModeAdvancedValue) => {
      const { min, max, length } = getLayoutInfoFromString(value.coords)
      const clampMax = {
        x: length.x > MAX_AXIS_PARCELS ? min.x + Math.min(MAX_AXIS_PARCELS, max.x) : max.x,
        y: length.y > MAX_AXIS_PARCELS ? min.y + Math.min(MAX_AXIS_PARCELS, max.y) : max.y
      }
      const parcels = getCoordinates(min, clampMax)
      const base = strToCoord(value.base) || min
      setGrid(parcels)
      setBase(base)
    },
    [grid, base, disabled]
  )

  const applyCurrentState = useCallback(() => {
    onChange({ parcels: enabledCoords, base })
  }, [grid, base, disabled])

  const handleModeChange = useCallback(
    (mode: Mode) => () => {
      setMode(mode)
    },
    [mode]
  )

  const getGridError = useCallback((): GridError | null => {
    if (numberOfCoords <= 0) return GridError.NUMBER_OF_PARCELS
    if (!areConnected(enabledCoords)) return GridError.NOT_CONNECTED
    if (!hasCoord(enabledCoords, base)) return GridError.MISSING_BASE_PARCEL
    return null
  }, [grid, base, disabled])

  const getTitle = useCallback(() => {
    if (mode === Mode.ADVANCED) return 'Set Coordinates'
    return `${numberOfCoords} Parcel${numberOfCoords === 1 ? '' : 's'}`
  }, [grid, mode, disabled])

  const getInstruction = useCallback(() => {
    if (mode === Mode.ADVANCED) return 'Type in the layout coordinates you want to deploy'
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
        <span className="error">{gridError && stringifyGridError(gridError)}</span>
      </div>

      {mode === Mode.ADVANCED ? (
        <ModeAdvanced
          value={{
            coords: transformCoordsToString(grid, disabled),
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
