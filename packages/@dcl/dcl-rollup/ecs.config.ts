import { createEcsConfig } from './configs'

const PROD = !!process.env.CI || process.env.NODE_ENV === 'production'

export default createEcsConfig({ PROD })
