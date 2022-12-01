import { createSceneConfig } from './configs'

const PROD = !!process.env.CI || process.env.NODE_ENV === 'production'

export default createSceneConfig({ PROD })
