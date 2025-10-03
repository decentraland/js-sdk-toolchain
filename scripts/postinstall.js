#!/usr/bin/env node
const path = require('path')
const { exec } = require('child_process')

if (__dirname.includes('node_modules')) {
  const repoRoot = path.resolve(__dirname, '..')

  exec('npx @dcl/sdk-commands get-context-files', { cwd: repoRoot }, (err, stdout, stderr) => {
    if (err) {
      console.error('Error ejecutando get-context-files:', err.message)
      return
    }
    console.log(stdout)
  })
}
