import type { Metafile } from 'esbuild'
import { detectMultiplayerUsage } from '../../../packages/@dcl/sdk-commands/src/logic/bundle'

type Input = { bytes?: number; imports?: Array<{ path: string; external?: boolean }> }

function metafile(inputs: Record<string, Input>): Metafile {
  return {
    inputs: Object.fromEntries(
      Object.entries(inputs).map(([p, i]) => [
        p,
        { bytes: 1, imports: (i.imports ?? []).map((imp) => ({ kind: 'import-statement', ...imp })) }
      ])
    ),
    outputs: {
      'bin/index.js': {
        bytes: 1,
        imports: [],
        exports: [],
        inputs: Object.fromEntries(Object.entries(inputs).map(([p, i]) => [p, { bytesInOutput: i.bytes ?? 10 }]))
      }
    }
  } as Metafile
}

const NETWORK = 'node_modules/@dcl/sdk/network/index.js'

describe('detectMultiplayerUsage', () => {
  it('should not need a server when no network module is bundled', () => {
    const result = detectMultiplayerUsage(metafile({ 'src/index.ts': {} }))

    expect(result).toEqual({ authoritativeMultiplayer: false, reasons: [] })
  })

  it('should need a server and name the importer when the network module is bundled', () => {
    const result = detectMultiplayerUsage(metafile({ 'src/index.ts': { imports: [{ path: NETWORK }] }, [NETWORK]: {} }))

    expect(result).toEqual({ authoritativeMultiplayer: true, reasons: ['src/index.ts → @dcl/sdk/network'] })
  })

  it('should not need a server when the network module was tree-shaken away', () => {
    const result = detectMultiplayerUsage(
      metafile({ 'src/index.ts': { imports: [{ path: NETWORK }] }, [NETWORK]: { bytes: 0 } })
    )

    expect(result.authoritativeMultiplayer).toBe(false)
  })

  it('should need a server when scene code calls comms directly', () => {
    const result = detectMultiplayerUsage(
      metafile({ 'src/index.ts': { imports: [{ path: '~system/CommunicationsController', external: true }] } })
    )

    expect(result).toEqual({
      authoritativeMultiplayer: true,
      reasons: ['src/index.ts → ~system/CommunicationsController']
    })
  })

  it('should label the asset-packs boot and shorten dependency paths', () => {
    const result = detectMultiplayerUsage(
      metafile({
        'sdk-scripts:script-utils': { imports: [{ path: NETWORK }] },
        '../../node_modules/@dcl/asset-packs/dist/x.js': {
          imports: [{ path: 'node_modules/@dcl/sdk/message-bus.js' }]
        },
        'node_modules/@dcl/sdk/message-bus.js': {},
        [NETWORK]: {}
      })
    )

    expect(result.reasons).toEqual([
      'asset-packs (synced entities or Admin Toolkit) → @dcl/sdk/network',
      '@dcl/asset-packs/dist/x.js → @dcl/sdk/message-bus'
    ])
  })
})
