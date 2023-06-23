import { sleep } from '../utils/sleep'

class AppPageObject {
  async isReady() {
    return (await page.$('.App.is-ready')) !== null
  }

  async waitUntilReady() {
    while (!(await this.isReady())) {
      await sleep(100)
    }
  }
}

export const App = new AppPageObject()
