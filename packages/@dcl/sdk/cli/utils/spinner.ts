import ora, { Ora } from 'ora'

import log from './log'

class Spinner {
  spinner: Ora | typeof log

  constructor() {
    if (!process.stdout.isTTY && process.env.DEBUG) {
      this.spinner = log
      return
    }

    this.spinner = ora()
  }

  private log(method: keyof Ora, message: string) {
    const fn = (this.spinner as any)[method] || log.raw
    fn(message)
  }

  start(message: string) {
    this.log('start', message)
  }
  stop() {
    this.log('stop', '')
  }
  fail(message: string) {
    this.log('fail', message)
  }
  warn(message: string) {
    this.log('warn', message)
  }
  info(message: string) {
    this.log('info', message)
  }
  succeed(message: string) {
    this.log('succeed', message)
  }
}

const spinner = new Spinner()

export default spinner
