#!/usr/bin/env node
import { build } from 'esbuild'

const WATCH = process.argv.includes('--watch') || process.argv.includes('-w')

// @deprecated
async function compile() {
  const CWD = process.cwd()

  const buildProcess = await build({
    absWorkingDir: CWD,
    // TODO: use package.json mainFile
    entryPoints: ['src/game.ts'],
    outdir: 'dist',
    watch: WATCH,
    treeShaking: true,
    platform: 'browser',
    bundle: true
  })
  console.log(buildProcess)
}

compile().catch((e) => console.log(e))
