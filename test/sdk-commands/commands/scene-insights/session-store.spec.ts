import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { AuthChain, Authenticator } from '../../../../packages/@dcl/sdk-commands/node_modules/@dcl/crypto'
import { ethSign } from '../../../../packages/@dcl/sdk-commands/node_modules/@dcl/crypto/dist/crypto'
import { hexToBytes } from '../../../../packages/@dcl/sdk-commands/node_modules/eth-connect'
import { createFsComponent } from '../../../../packages/@dcl/sdk-commands/src/components/fs'
import { IFileSystemComponent } from '../../../../packages/@dcl/sdk-commands/src/components/fs'
import {
  createEphemeralIdentity,
  delegationFromLinkerChain
} from '../../../../packages/@dcl/sdk-commands/src/commands/scene-insights/session'
import {
  deleteSession,
  loadSession,
  saveSession
} from '../../../../packages/@dcl/sdk-commands/src/commands/scene-insights/session-store'
import { getSession } from '../../../../packages/@dcl/sdk-commands/src/commands/scene-insights/sign-in'

type EphemeralIdentity = ReturnType<typeof createEphemeralIdentity>

/** A delegation like the one a browser signature produces: wallet → dApp key → our key. */
async function createDelegation(ephemeral: EphemeralIdentity, expiration: Date): Promise<AuthChain> {
  const wallet = createEphemeralIdentity()
  const dappIdentity = await Authenticator.initializeAuthChain(
    wallet.address,
    createEphemeralIdentity(),
    1000,
    async (message) => ethSign(hexToBytes(wallet.privateKey), message)
  )
  const message = Authenticator.getEphemeralMessage(ephemeral.address, expiration)
  return delegationFromLinkerChain(Authenticator.signPayload(dappIdentity, message), ephemeral.address, message)
}

describe('when saving and loading the session', () => {
  let directory: string
  let file: string
  let fs: IFileSystemComponent
  let ephemeral: EphemeralIdentity
  let expiration: Date
  let delegation: AuthChain

  beforeEach(async () => {
    directory = mkdtempSync(path.join(tmpdir(), 'scene-insights-'))
    file = path.join(directory, 'nested', 'session.json')
    fs = createFsComponent()
    ephemeral = createEphemeralIdentity()
    expiration = new Date(Date.now() + 60 * 60 * 1000)
    delegation = await createDelegation(ephemeral, expiration)
  })

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true })
  })

  describe('and a session was saved', () => {
    beforeEach(async () => {
      await saveSession({ fs }, file, ephemeral, expiration, delegation)
    })

    it('should write the file readable only by the user', () => {
      expect(statSync(file).mode & 0o777).toBe(0o600)
    })

    it('should create its directory accessible only by the user', () => {
      expect(statSync(path.dirname(file)).mode & 0o777).toBe(0o700)
    })

    it('should load a session that signs as the wallet until the saved expiration', async () => {
      const loaded = await loadSession({ fs }, file)
      expect({
        address: loaded?.session.address,
        expiration: loaded?.session.expiration.toISOString()
      }).toEqual({ address: Authenticator.ownerAddress(delegation), expiration: expiration.toISOString() })
    })

    describe('and it is loaded within a minute of its expiration', () => {
      it('should not load it', async () => {
        expect(await loadSession({ fs }, file, expiration.getTime() - 30 * 1000)).toBeUndefined()
      })
    })

    describe('and its delegation was changed to another key', () => {
      beforeEach(() => {
        const saved = JSON.parse(readFileSync(file, 'utf8'))
        saved.ephemeralIdentity = createEphemeralIdentity()
        writeFileSync(file, JSON.stringify(saved))
      })

      it('should not load it', async () => {
        expect(await loadSession({ fs }, file)).toBeUndefined()
      })
    })

    describe('and it is deleted', () => {
      let removed: boolean

      beforeEach(async () => {
        removed = await deleteSession({ fs }, file)
      })

      it('should report that it removed one and leave no session to load', async () => {
        expect({ removed, loaded: await loadSession({ fs }, file) }).toEqual({ removed: true, loaded: undefined })
      })
    })
  })

  describe('and the file is not JSON', () => {
    beforeEach(() => {
      writeFileSync(file.replace('nested/', ''), 'not json')
      file = file.replace('nested/', '')
    })

    it('should not load it', async () => {
      expect(await loadSession({ fs }, file)).toBeUndefined()
    })
  })

  describe('and there is no file to delete', () => {
    it('should report that there was nothing to remove', async () => {
      expect(await deleteSession({ fs }, file)).toBe(false)
    })
  })
})

describe('when getting a session to sign with', () => {
  let directory: string
  let file: string
  let fs: IFileSystemComponent
  let privateKey: string | undefined
  let components: Parameters<typeof getSession>[0]
  let options: Parameters<typeof getSession>[2]

  beforeEach(() => {
    privateKey = process.env.DCL_PRIVATE_KEY
    delete process.env.DCL_PRIVATE_KEY
    directory = mkdtempSync(path.join(tmpdir(), 'scene-insights-'))
    file = path.join(directory, 'session.json')
    fs = createFsComponent()
    components = {
      fs,
      logger: { log: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
    } as any
    options = {
      file,
      targetUrl: 'https://insights.example.com',
      linkOptions: { openBrowser: false, isHttps: false },
      interactive: false
    }
  })

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true })
    if (privateKey === undefined) delete process.env.DCL_PRIVATE_KEY
    else process.env.DCL_PRIVATE_KEY = privateKey
  })

  describe('and there is no saved session and nobody at a terminal', () => {
    it('should fail with a sign-in required error instead of opening the browser', async () => {
      await expect(getSession(components, { label: 'example' }, options)).rejects.toMatchObject({
        name: 'SCENE_INSIGHTS_SESSION_REQUIRED',
        message: expect.stringContaining('sdk-commands scene-insights login')
      })
    })
  })

  describe('and a valid session is saved', () => {
    let ephemeral: EphemeralIdentity
    let delegation: AuthChain

    beforeEach(async () => {
      ephemeral = createEphemeralIdentity()
      const expiration = new Date(Date.now() + 60 * 60 * 1000)
      delegation = await createDelegation(ephemeral, expiration)
      await saveSession({ fs }, file, ephemeral, expiration, delegation)
    })

    it('should use it without asking for a signature', async () => {
      const { session, source } = await getSession(components, { label: 'example' }, options)
      expect({ address: session.address, source }).toEqual({
        address: Authenticator.ownerAddress(delegation),
        source: 'saved'
      })
    })
  })

  describe('and DCL_PRIVATE_KEY is set', () => {
    let wallet: EphemeralIdentity

    beforeEach(() => {
      wallet = createEphemeralIdentity()
      process.env.DCL_PRIVATE_KEY = wallet.privateKey
    })

    it('should sign with the key and save nothing', async () => {
      const { session, source } = await getSession(components, { label: 'example' }, options)
      expect({ address: session.address.toLowerCase(), source, saved: await fs.fileExists(file) }).toEqual({
        address: wallet.address.toLowerCase(),
        source: 'private-key',
        saved: false
      })
    })
  })
})
