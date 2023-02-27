#!/usr/bin/env node
const esbuild = require('esbuild')

const WATCH_MODE = process.argv.includes('--watch')
const PRODUCTION = process.argv.includes('--production')

async function main() {
  const context = await esbuild.context({
    entryPoints: ['src/index.tsx'],
    bundle: true,
    platform: 'browser',
    outfile: 'public/bundle.js',
    sourcemap: 'linked',
    minify: PRODUCTION
  })

  if (WATCH_MODE) {
    let { host, port } = await context.serve({
      servedir: 'public',
    })
    console.log(`> Serving on http://${host}:${port}`)
  } else {
    console.time(`> Building static files`)
    await context.rebuild()
    await context.dispose()
    console.timeEnd(`> Building static files`)
  }
}

main().catch(err => {
  process.exitCode = 1
  console.error(err)
})