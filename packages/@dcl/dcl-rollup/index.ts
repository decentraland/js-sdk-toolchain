#!/usr/bin/env node

import arg from 'arg'
import future from 'fp-future'
import { compile, handleRollupError } from './compile'

const args = arg({
  '--watch': Boolean,
  '-w': '--watch',
  '--single': String,
  '--production': Boolean,
  '--project': String,
  '-p': '--project'
})

const WATCH = !!args['--watch']

// PRODUCTION === true : makes the compiler to prefer .min.js files while importing and produces a minified output
const PRODUCTION = !WATCH && (args['--production'] || process.env.NODE_ENV === 'production')

const watchingFuture = future<any>()

// Start the watcher
compile({
  production: PRODUCTION,
  watch: !!args['--watch'],
  single: args['--single'],
  project: args['--project'],
  watchingFuture
})
  .then(async (_watcher) => {
    // wait for the build to finish
    await watchingFuture

    process.exit()
  })
  .catch((e) => {
    handleRollupError(e)
    process.exit(1)
  })
