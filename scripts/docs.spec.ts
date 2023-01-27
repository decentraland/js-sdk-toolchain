import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

import { flow } from './common'
import { itExecutes } from './helpers'

flow('build docs site', () => {
  const SDK_TOOLCHAIN_PATH = resolve(process.cwd())

  itExecutes('./node_modules/.bin/typedoc', SDK_TOOLCHAIN_PATH)

  it('fix html page', async () => {
    const cssPath = resolve(SDK_TOOLCHAIN_PATH, 'generated-docs/assets/style.css')
    const cssContent = readFileSync(cssPath).toString()
    const customCss = `
.tsd-kind-namespace {
  display: none;
}
.tsd-navigation.settings {
  display: none;
}
.tsd-index-heading.uppercase {
  display: none
}
`
    writeFileSync(cssPath, customCss + cssContent)
  })
})
