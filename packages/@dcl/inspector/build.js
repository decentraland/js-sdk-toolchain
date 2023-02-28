#!/usr/bin/env node
const esbuild = require('esbuild')
const child_process = require('child_process')
const { future } = require('fp-future')

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

  await runTypeChecker()
}

main().catch(err => {
  process.exitCode = 1
  console.error(err)
})

function runTypeChecker() {
  const args = [require.resolve('typescript/lib/tsc'), '-p', 'tsconfig.json']
  if (WATCH_MODE) args.push('--watch')

  console.time('> Running typechecker')
  const ts = child_process.spawn('node', args, { env: process.env, cwd: process.cwd(), encoding: 'utf8' })
  const typeCheckerFuture = future()

  ts.on('close', (code) => {
    console.timeEnd('> Running typechecker')
    console.log('  Type checker exit code:', code)
    if (code !== 0) {
      typeCheckerFuture.reject(new Error(`Typechecker exited with code ${code}.`))
      return
    }

    typeCheckerFuture.resolve(code)
  })


  ts.stdout.pipe(process.stdout)
  ts.stderr.pipe(process.stderr)

  if (WATCH_MODE) {
    typeCheckerFuture.resolve()
  }

  return typeCheckerFuture
}