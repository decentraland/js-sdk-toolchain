import { RollupOptions } from 'rollup'
import replace from '@rollup/plugin-replace'
import analyze from 'rollup-plugin-analyzer'
import libConfig from './libs.config'

const PROD = !!process.env.CI || process.env.NODE_ENV === 'production'

export const config: RollupOptions = {
  ...libConfig,
  plugins: [
    ...libConfig.plugins!,
    replace({
      'process.env.NODE_ENV': JSON.stringify(
        PROD ? 'production' : 'development'
      )
    }),
    analyze({
      hideDeps: true,
      summaryOnly: true
    })
  ]
}
export default config
