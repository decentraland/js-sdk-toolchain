import { AuthChain, Authenticator, ValidationResult } from '@dcl/crypto'
import { AuthChainProvider, createSignatureRpcProvider } from '@dcl/crypto-middleware'
import { CliError } from '../../logic/error'

/** Select RPC from trusted CLI configuration, never from the wallet response. */
export function createInsightsProvider(target: string): AuthChainProvider {
  let provider: AuthChainProvider | undefined
  return {
    sendAsync(payload, callback, signal) {
      if (!provider) {
        const hostname = new URL(target).hostname
        const network =
          hostname === 'decentraland.zone' || hostname.endsWith('.decentraland.zone')
            ? 'sepolia'
            : hostname === 'decentraland.org' || hostname.endsWith('.decentraland.org')
              ? 'mainnet'
              : undefined
        const url = network
          ? `https://rpc.decentraland.org/${network}?project=sdk-commands`
          : process.env.DCL_SCENE_INSIGHTS_RPC_URL
        if (!url) {
          callback(
            new CliError(
              'SCENE_INSIGHTS_INVALID_ARGUMENT',
              'Set DCL_SCENE_INSIGHTS_RPC_URL for contract wallets on a custom Insights target'
            )
          )
          return
        }
        try {
          provider = createSignatureRpcProvider(url)
        } catch {
          callback(
            new CliError(
              'SCENE_INSIGHTS_INVALID_ARGUMENT',
              'DCL_SCENE_INSIGHTS_RPC_URL must be an HTTP(S) URL without user information'
            )
          )
          return
        }
      }
      provider.sendAsync(payload, callback, signal)
    }
  }
}

/** Validate a saved or newly signed delegation without unbounded RPC fallback work. */
export async function validateInsightsSignature(
  expected: string,
  chain: AuthChain,
  now: number = Date.now(),
  provider?: AuthChainProvider
): ReturnType<typeof Authenticator.validateSignature> {
  if (chain.length < 2 || chain.length > 10) return { ok: false, message: 'Invalid auth chain length' }
  const controller = new AbortController()
  let rejectValidation: (error: Error) => void = () => undefined
  let invalidate: (result: ValidationResult) => void = () => undefined
  const interrupted = new Promise<ValidationResult>((resolve, reject) => {
    invalidate = resolve
    rejectValidation = reject
  })
  const interrupt = (error: Error) => {
    if (!controller.signal.aborted) {
      rejectValidation(error)
      controller.abort()
    }
    return error
  }
  let calls = 0
  const bounded: AuthChainProvider | undefined = provider && {
    sendAsync(payload, callback) {
      if (controller.signal.aborted) {
        callback(new Error('Signature validation stopped'))
        return
      }
      if (++calls > 16) {
        const message = 'Signature validation exceeded its RPC budget'
        invalidate({ ok: false, message })
        controller.abort()
        callback(new Error(message))
        return
      }
      try {
        provider.sendAsync(
          payload,
          (error, response) => {
            if (error) {
              callback(
                interrupt(
                  error instanceof CliError
                    ? error
                    : new CliError(
                        'SCENE_INSIGHTS_UNAVAILABLE',
                        'Contract-wallet signature verification unavailable; retry shortly'
                      )
                )
              )
            } else {
              callback(null, response)
            }
          },
          controller.signal
        )
      } catch {
        callback(
          interrupt(
            new CliError(
              'SCENE_INSIGHTS_UNAVAILABLE',
              'Contract-wallet signature verification unavailable; retry shortly'
            )
          )
        )
      }
    }
  }
  const timer = setTimeout(
    () =>
      interrupt(
        new CliError('SCENE_INSIGHTS_UNAVAILABLE', 'Contract-wallet signature verification timed out; retry shortly')
      ),
    15_000
  )
  try {
    return await Promise.race([
      Authenticator.validateSignature(expected, chain, bounded ?? null, now, { service: 'insights' }),
      interrupted
    ])
  } finally {
    clearTimeout(timer)
    controller.abort()
  }
}
