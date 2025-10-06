#!/usr/bin/env node

if (process.cwd().includes('node_modules')) {
  const { exec } = require('child_process')

  //exec script on the root scene
  const scenePath = process.cwd().split('/node_modules')[0]
  exec('npx @dcl/sdk-commands get-context-files', { cwd: scenePath }, (e, stdout, stderr) => {
    if (e) {
      console.log('Error: not able to execute get-context-files', stderr)
    } else {
      console.log(stdout)
    }
  })
} else {
  console.log('Not executing postinstall from this directory')
}
