#!/usr/bin/env node
const esbuild = require('esbuild')
const child_process = require('child_process')
const { future } = require('fp-future')
const { builtinModules } = require('module')

const WATCH_MODE = process.argv.includes('--watch')
const PRODUCTION = process.argv.includes('--production')

// the following modules will not be embedded in the NodeJs bundle.
// we create a bundle because many dependencies are exported as ESM and Node
// is not ready yet to support them OOTB
const externalModulesArray = getNotBundledModules()

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
    console.time(`> Building browser bundle`)
    await context.rebuild()
    await context.dispose()
    console.timeEnd(`> Building browser bundle`)
  }

  await buildCommonJsDistributable()
  await runTypeChecker()
}

async function buildCommonJsDistributable() {
  const context = await esbuild.context({
    entryPoints: ['src/tooling-entrypoint.ts'],
    bundle: true,
    platform: 'node',
    outfile: 'dist/tooling-entrypoint.js',
    sourcemap: 'both',
    minify: PRODUCTION,
    external: externalModulesArray
  })

  if (WATCH_MODE) {
    await context.watch()
  } else {
    console.time(`> Building NodeJs bundle`)
    await context.rebuild()
    await context.dispose()
    console.timeEnd(`> Building NodeJs bundle`)
  }
}

main().catch(err => {
  process.exitCode = 1
  console.error(err)
  process.exit(1)
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

function getNotBundledModules() {
  const ret = JSON.parse(child_process.execSync("npm ls --all --json").toString())
  const externalModules = new Set()
  function traverseDependencies(obj) {
    if (obj.dependencies)
      for (let depName in obj.dependencies) {
        const dep = obj.dependencies[depName]
        externalModules.add(depName)
        traverseDependencies(dep)
      }
  }
  traverseDependencies(ret)

  // now remove the ESM dependencies
  const esmModulesToBundle = ['@dcl/sdk', '@dcl/ecs']
  return Array.from(externalModules).concat(builtinModules).filter($ => !esmModulesToBundle.includes($))
}