class AppPageObject {
  async isReady() {
    return (await page.$('.App.is-ready')) !== null
  }

  async waitUntilReady() {
    await page.waitForSelector('.App.is-ready')
  }
}

export const App = new AppPageObject()
