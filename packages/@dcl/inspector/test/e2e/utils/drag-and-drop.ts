import { BoundingBox } from 'puppeteer'

export async function dragAndDrop(sourceSelector: string, destinationSelector: string) {
  const sourceElement = await page.waitForSelector(sourceSelector)
  const destinationElement = await page.waitForSelector(destinationSelector)

  const sourceBox = await sourceElement!.boundingBox()
  const destinationBox = await destinationElement!.boundingBox()

  await page.evaluate(
    (ss: string, ds: string, sb: BoundingBox, db: BoundingBox) => {
      const source = document.querySelector(ss)
      const destination = document.querySelector(ds)

      const sourceX = sb.x + sb.width / 2
      const sourceY = sb.y + sb.height / 2
      const destinationX = db.x + db.width / 2
      const destinationY = db.y + db.height / 2

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
        new MouseEvent('mouseup', {
          bubbles: true,
          cancelable: true,
          screenX: destinationX,
          screenY: destinationY,
          clientX: destinationX,
          clientY: destinationY
        })
      )

      const dataTransfer = new DataTransfer()
      dataTransfer.effectAllowed = 'all'
      dataTransfer.dropEffect = 'move'

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

      console.log('COCOCO')
    },
    sourceSelector,
    destinationSelector,
    sourceBox!,
    destinationBox!
  )
}
