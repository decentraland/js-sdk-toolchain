import { BoundingBox } from 'puppeteer'

export type Position = 'after' | 'inside'
export type Positions = { x: Position; y: Position }

export async function dragAndDrop(
  sourceSelector: string,
  destinationSelector: string,
  destPosition: Positions = {
    x: 'inside',
    y: 'inside'
  }
) {
  const sourceElement = await page.waitForSelector(sourceSelector)
  const destinationElement = await page.waitForSelector(destinationSelector)

  const sourceBox = await sourceElement!.boundingBox()
  const destinationBox = await destinationElement!.boundingBox()

  await page.evaluate(
    (ss: string, ds: string, sb: BoundingBox, db: BoundingBox, dPos: Positions) => {
      const source = document.querySelector(ss)
      const destination = document.querySelector(ds)
      const midX = (bb: BoundingBox) => bb.x + bb.width / 2
      const midY = (bb: BoundingBox) => bb.y + bb.height / 2
      const afterX = (bb: BoundingBox) => midX(bb) + bb.width / 4
      const afterY = (bb: BoundingBox) => midY(bb) + bb.height / 4

      const sourceX = midX(sb)
      const sourceY = midY(sb)
      const destinationX = dPos.x === 'after' ? afterX(db) : midX(db)
      const destinationY = dPos.y === 'after' ? afterY(db) : midY(db)

      source!.dispatchEvent(
        new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true,
          screenX: sourceX,
          screenY: sourceY,
          clientX: sourceX,
          clientY: sourceY
        })
      )

      const dataTransfer = new DataTransfer()
      dataTransfer.effectAllowed = 'all'
      dataTransfer.dropEffect = 'move'

      destination!.dispatchEvent(
        new MouseEvent('pointerdown', {
          bubbles: true,
          cancelable: true,
          screenX: destinationX,
          screenY: destinationY,
          clientX: destinationX,
          clientY: destinationY
        })
      )

      source!.dispatchEvent(
        new DragEvent('dragstart', {
          bubbles: true,
          cancelable: true
        })
      )

      destination!.dispatchEvent(
        new MouseEvent('mousemove', {
          bubbles: true,
          cancelable: true,
          screenX: destinationX,
          screenY: destinationY,
          clientX: destinationX,
          clientY: destinationY
        })
      )

      destination!.dispatchEvent(
        new MouseEvent('mouseenter', {
          bubbles: true,
          cancelable: true,
          screenX: destinationX,
          screenY: destinationY,
          clientX: destinationX,
          clientY: destinationY
        })
      )

      destination!.dispatchEvent(
        new MouseEvent('mouseover', {
          bubbles: true,
          cancelable: true,
          screenX: destinationX,
          screenY: destinationY,
          clientX: destinationX,
          clientY: destinationY
        })
      )

      destination!.dispatchEvent(
        new DragEvent('dragenter', {
          bubbles: true,
          cancelable: true,
          screenX: destinationX,
          screenY: destinationY,
          clientX: destinationX,
          clientY: destinationY,
          dataTransfer
        })
      )

      destination!.dispatchEvent(
        new DragEvent('dragover', {
          bubbles: true,
          cancelable: true,
          screenX: destinationX,
          screenY: destinationY,
          clientX: destinationX,
          clientY: destinationY,
          dataTransfer
        })
      )

      destination!.dispatchEvent(
        new DragEvent('drop', {
          bubbles: true,
          cancelable: true,
          screenX: destinationX,
          screenY: destinationY,
          clientX: destinationX,
          clientY: destinationY,
          dataTransfer
        })
      )

      destination!.dispatchEvent(
        new DragEvent('dragleave', {
          bubbles: true,
          cancelable: true,
          screenX: destinationX,
          screenY: destinationY,
          clientX: destinationX,
          clientY: destinationY,
          dataTransfer
        })
      )

      destination!.dispatchEvent(
        new MouseEvent('mouseup', {
          bubbles: true,
          cancelable: true,
          screenX: destinationX,
          screenY: destinationY,
          clientX: destinationX,
          clientY: destinationY
        })
      )

      destination!.dispatchEvent(
        new MouseEvent('mouseleave', {
          bubbles: true,
          cancelable: true,
          screenX: destinationX,
          screenY: destinationY,
          clientX: destinationX,
          clientY: destinationY
        })
      )

      source!.dispatchEvent(
        new DragEvent('dragend', {
          bubbles: true,
          cancelable: true,
          screenX: destinationX,
          screenY: destinationY,
          clientX: destinationX,
          clientY: destinationY
        })
      )
    },
    sourceSelector,
    destinationSelector,
    sourceBox! as any,
    destinationBox! as any,
    destPosition
  )
}
