import ora, { Ora } from 'ora'

import { log } from './log'

function initSpinner(): typeof log | Ora {
  if (!process.stdout.isTTY && process.env.DEBUG) {
    return log
  }

  return ora()
}

const spinner = initSpinner()

export function start(message: string) {
  spinner.text = message
  spinner.start()
}

export function stop() {
  spinner.stop()
}

export function fail(message: string) {
  spinner.fail(message)
}

export function warn(message: string) {
  spinner.warn(message)
}

export function info(message: string) {
  spinner.info(message)
}

export function succeed(message: string) {
  spinner.succeed(message)
}
