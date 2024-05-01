import { Props } from "./types";

import './Grid.css'

function Grid({ grid, maxTileSize = 50, minTileSize = 3, visualThreshold = 10 }: Props) {
  const biggerAxis = Math.max(grid.rows, grid.columns)
  const tileSize = Math.max(maxTileSize / biggerAxis, minTileSize) // % of parent's size to use for max/min tile size
  const visualRatio = biggerAxis >= visualThreshold ? 1 : 2 // if number of rows is large, lower borders/margins/etc

  const gridStyles = {
    width: `${tileSize}%`,
    aspectRatio: '1/1',
    border: `${visualRatio}px solid var(--base-10)`,
    margin: `${visualRatio}px`,
  }

  return (
    <div className="Grid">
        {Array.from(Array(grid.rows), (_, rowIndex) => (
          <div key={`${rowIndex}`} className={`row #${rowIndex}`}>
            {Array.from(Array(grid.columns), (_, columnIndex) => (
              <div key={`${rowIndex}-${columnIndex}`} className={`tile #${columnIndex}`} style={gridStyles}></div>
            ))}
          </div>
        ))}
      </div>
  )
}

export default Grid
