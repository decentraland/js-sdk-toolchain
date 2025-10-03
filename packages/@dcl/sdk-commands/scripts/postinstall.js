#!/usr/bin/env node

if (process.cwd().includes('node_modules')) {
  const path = require('path')
  const { exec } = require('child_process')

  const scenePath = path.resolve(process.cwd(), '../../..')

  exec('npx @dcl/sdk-commands get-context-files', { cwd: scenePath }, (e, stdout, stderr) => {
    if (e) {
      console.log('stderr:', stderr)
    } else {
      console.log(stdout)
    }
  })
} else {
  console.log('Not executing postinstall')
}
