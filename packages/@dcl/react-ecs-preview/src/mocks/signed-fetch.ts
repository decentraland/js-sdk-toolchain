// Mock of ~system/SignedFetch. Returns an empty failed response.
export async function signedFetch(_body: unknown) {
  return { ok: false, status: 0, statusText: '', headers: {}, body: '' }
}
