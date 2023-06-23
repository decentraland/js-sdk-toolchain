import { Hierarchy } from './pageObjects/Hierarchy'
import { installMouseHelper } from './utils/install-mouse-helper'

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

describe('Entity Inspector', () => {
  beforeAll(async () => {
    await installMouseHelper(page)
    await page.goto('http://localhost:8000')
    page.on('console', (msg) => {
      const txt = msg.text()
      if (txt.startsWith('AA')) {
        console.log(txt)
      }
      //for (let i = 0; i < msg.args.length; ++i) console.log(`${i}: ${(msg.args as unknown as Array<any>)[i]}`)
    })
    await page.waitForXPath("//div[contains(text(), 'Magic Cube')]", { visible: true })
  }, 100000)

  it('should drag and drop"', async () => {
    await Hierarchy.setParent(512, 513)
    await sleep(5000)
  }, 100000)
})
