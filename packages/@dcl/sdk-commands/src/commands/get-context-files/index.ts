import { CliComponents } from '../../components'
import { declareArgs } from '../../logic/args'

import { Result } from 'arg'

export interface Options {
  args: Result<typeof args>
  components: Pick<CliComponents, 'logger'>
}

export const args = declareArgs({
  '--help': Boolean,
  '-h': '--help'
})

const DEPRECATION_MESSAGE = `
  'sdk-commands get-context-files' is deprecated and no longer downloads anything.

  The AI context files it used to download are superseded by the official
  Decentraland SDK Skills, which are actively maintained and far more complete.

  If you are using an AI coding assistant (or you are one), install the skills instead:

    npx skills add decentraland/sdk-skills --all

  Skills source: https://github.com/decentraland/sdk-skills
  AI-assisted creation guide: https://docs.decentraland.org/creator/scenes-sdk7/getting-started/vibe-coding

  If your project contains a 'dclcontext' folder from a previous run, you can safely delete it.
`

export function help(options: Options) {
  options.components.logger.log(DEPRECATION_MESSAGE)
}

export async function main(options: Options) {
  options.components.logger.log(DEPRECATION_MESSAGE)
}
