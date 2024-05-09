import { chunkCoords, getAxisLengths, getLargestAxis } from "./utils";
import { Props } from "./types";

import './Grid.css'
import { useCallback } from "react";

function Grid({
  coords,
  maxTileSize = 50,
  minTileSize = 3,
  visualThreshold = 10,
  isTileDisabled,
  handleTileClick,
}: Props) {
  const largestAxis = getLargestAxis(coords)
  const tileSize = Math.max(maxTileSize / largestAxis, minTileSize) // % of parent's size to use for max/min tile size
  const visualRatio = largestAxis >= visualThreshold ? 1 : 2 // if number of rows is large, lower borders/margins/etc

  const gridStyles = {
    width: `${tileSize}%`,
    aspectRatio: '1/1',
    border: `${visualRatio}px solid var(--base-10)`,
    margin: `${visualRatio}px`,
  }

  const numberOfRows = coords.length / getAxisLengths(coords).y
  // actually chunking the array is not necessary
  // we could just use the `numberOfRows` to render the grid
  // but it's easier to read/use `[].map` than a for-loop in React...
  const chunks = chunkCoords(coords, numberOfRows)

  return (
    <div className="Grid">
      {chunks.map((row) =>
        <Row
          key={`row-${row[0].y}`}
          row={row}
          tileStyles={gridStyles}
          isTileDisabled={isTileDisabled}
          onTileClick={handleTileClick}
        />
      )}
    </div>
  )
}

type Row = {
  row: Props['coords'],
  tileStyles: React.CSSProperties
  isTileDisabled?: Props['isTileDisabled']
  onTileClick?: Props['handleTileClick']
}
function Row({ row, tileStyles,isTileDisabled, onTileClick }: Row) {
  return (
    <div className={`row y-${row[0].y}`}>
      {row.map((col) => (
        <Tile
          key={`${col.x}-${col.y}`}
          x={col.x}
          y={col.y}
          style={tileStyles}
          isTileDisabled={isTileDisabled}
          onTileClick={onTileClick}
        />
      ))}
    </div>
  );
}

type Tile = {
  x: number,
  y: number,
  style: React.CSSProperties
  isTileDisabled?: Props['isTileDisabled']
  onTileClick?: Props['handleTileClick']
}
function Tile({ x, y, style, isTileDisabled, onTileClick }: Tile) {
  const isDisabled = isTileDisabled && isTileDisabled({ x, y })
  const handleClick = useCallback(() => {
    onTileClick && onTileClick({ x, y })
  }, [x, y])

  const styles = { ...style, border: isDisabled ? 0 : style.border }

  return (
    <div className={`tile x-${x}`} style={styles} onClick={handleClick}>
      {`${x},${y}`}
    </div>
  );
}

export default Grid
