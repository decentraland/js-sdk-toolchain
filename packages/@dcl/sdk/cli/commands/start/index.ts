import os from 'os'
import { resolve } from 'path'
import open from 'open'

import { CliComponents } from '../../components'
import { main as build } from '../build'
import { main as preview } from '../preview'
import { previewPort } from '../preview/port'
import { getArgs } from '../../utils/args'
import { main as handler } from '../../utils/handler'
interface Options {
  args: typeof args
  components: Pick<CliComponents, 'fetch' | 'fs'>
}

export const args = getArgs({
  '--dir': String,
  '--help': Boolean,
  '--port': String,
  '--no-debug': Boolean,
  '--no-browser': Boolean,
  '--no-watch': Boolean,
  '--ci': Boolean,
  '--skip-install': Boolean,
  '--web3': Boolean,
  '-h': '--help',
  '-p': '--port',
  '-d': '--no-debug',
  '-b': '--no-browser',
  '-w': '--no-watch',
  '--skip-build': Boolean,
  '--desktop-client': Boolean
})

export function help() {
  return `
  Usage: dcl start [options]

    Options:

      -h, --help                Displays complete help
      -p, --port        [port]  Select a custom port for the development server
      -d, --no-debug            Disable debugging panel
      -b, --no-browser          Do not open a new browser window
      -w, --no-watch            Do not open watch for filesystem changes
      -c, --ci                  Run the parcel previewer on a remote unix server
      --web3                    Connects preview to browser wallet to use the associated avatar and account
      --skip-build              Skip build and only serve the files in preview mode
      --desktop-client          Show URL to launch preview in the desktop client (BETA)

    Examples:

    - Start a local development server for a Decentraland Scene at port 3500

      $ dcl start -p 3500

    - Start a local development server for a Decentraland Scene at a docker container

      $ dcl start --ci
`
}

export const main = handler(async function main(options: Options) {
  const dir = resolve(process.cwd(), options.args['--dir'] || '.')
  const isCi = args['--ci'] || process.env.CI || false
  const debug = !args['--no-debug'] && !isCi
  const openBrowser = !args['--no-browser'] && !isCi
  const skipBuild = args['--skip-build']
  const watch = !args['--no-watch'] && !isCi && !skipBuild
  const enableWeb3 = args['--web3']
  const port = parseInt(args['--port']!, 10) || (await previewPort())
  const baseCoords = { x: 0, y: 0 }
  const hasPortableExperience = false

  const comps = { components: options.components }
  if (!skipBuild) {
    await build({ args: { '--dir': dir, '--watch': watch }, ...comps })
  }
  await preview({ args: { '--dir': dir, '--port': port }, ...comps })

  const ifaces = os.networkInterfaces()
  const availableURLs: string[] = []

  console.log(`\nPreview server is now running!`)
  console.log('Available on:\n')

  Object.keys(ifaces).forEach((dev) => {
    ;(ifaces[dev] || []).forEach((details) => {
      if (details.family === 'IPv4') {
        let addr = `http://${details.address}:${port}?position=${baseCoords.x}%2C${baseCoords.y}&ENABLE_ECS7`
        if (debug) {
          addr = `${addr}&SCENE_DEBUG_PANEL`
        }
        if (enableWeb3 || hasPortableExperience) {
          addr = `${addr}&ENABLE_WEB3`
        }

        availableURLs.push(addr)
      }
    })
  })

  // Push localhost and 127.0.0.1 at top
  const sortedURLs = availableURLs.sort((a, _b) => {
    return a.toLowerCase().includes('localhost') || a.includes('127.0.0.1') || a.includes('0.0.0.0') ? -1 : 1
  })

  for (const addr of sortedURLs) {
    console.log(`    ${addr}`)
  }

  if (args['--desktop-client']) {
    console.log('\n  Desktop client:\n')
    for (const addr of sortedURLs) {
      const searchParams = new URLSearchParams()
      searchParams.append('PREVIEW-MODE', addr)
      console.log(`    dcl://${searchParams.toString()}&`)
    }
  }

  console.log('\n  Details:\n')
  console.log('\nPress CTRL+C to exit\n')

  // Open preferably localhost/127.0.0.1
  if (openBrowser && sortedURLs.length && !args['--desktop-client']) {
    try {
      await open(sortedURLs[0])
    } catch (_) {
      console.log('Unable to open browser automatically.')
    }
  }
})
