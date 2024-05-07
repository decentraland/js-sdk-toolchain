import { chunkCoords, getAxisLength, getLargestAxis } from "./utils";
import { Props } from "./types";

import './Grid.css'

function Grid({ coords, maxTileSize = 50, minTileSize = 3, visualThreshold = 10 }: Props) {
  const largestAxis = getLargestAxis(coords)
  const tileSize = Math.max(maxTileSize / largestAxis, minTileSize) // % of parent's size to use for max/min tile size
  const visualRatio = largestAxis >= visualThreshold ? 1 : 2 // if number of rows is large, lower borders/margins/etc

  const gridStyles = {
    width: `${tileSize}%`,
    aspectRatio: '1/1',
    border: `${visualRatio}px solid var(--base-10)`,
    margin: `${visualRatio}px`,
  }

  const numberOfRows = getAxisLength(coords).y
  // actually chunking the array is not necessary
  // we could just use the `numberOfRows` to render the grid
  // but it's easier to read/use `[].map` than a for-loop in React...
  const chunks = chunkCoords(coords, numberOfRows)

  return (
    <div className="Grid">
      {chunks.map((row) => (
        <div key={`${row[0].y}`} className={`row #${row[0].y}`}>
          {row.map((col) => (
            <div key={`${col.x}-${col.y}`} className={`tile #${col.x}`} style={gridStyles}>
              {`${col.x},${col.y}`}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export default Grid
