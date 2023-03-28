import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

import { flow } from './common'
import { itExecutes } from './helpers'

flow('build docs site', () => {
  const SDK_TOOLCHAIN_PATH = process.cwd()
  itExecutes('./node_modules/.bin/typedoc', SDK_TOOLCHAIN_PATH)

  it('fix html page', async () => {
    const cssPath = resolve(SDK_TOOLCHAIN_PATH, 'api-docs/assets/style.css')
    const cssContent = readFileSync(cssPath).toString()
    const replaceCss = cssContent.replace(/1024px/g, '860px')
    const customCss = `
.tsd-kind-namespace {
  display: none;
}
.tsd-index-heading.uppercase {
  display: none
}
`
    writeFileSync(cssPath, customCss + replaceCss)
  })
})
