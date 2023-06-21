import { renderHook, waitFor } from '@testing-library/react'
import { CATALOG_URL, useCatalog } from './useCatalog'

let fetchMock: jest.MockedFn<typeof global.fetch>

const realFetch = global.fetch

describe('useCatalog', () => {
  beforeEach(() => {
    fetchMock = jest.fn()
    global.fetch = fetchMock
  })
  afterEach(() => {
    global.fetch = realFetch
  })
  describe('When the fetching the catalog', () => {
    beforeEach(() => {
      fetchMock.mockResolvedValue({
        json: jest.fn().mockResolvedValue({
          ok: true,
          data: [
            {
              id: 'asset-pack-1',
              name: 'Some Assetpack',
              assets: [
                {
                  id: 'asset-1',
                  name: 'Some Asset',
                  model: 'some-model.glb'
                }
              ]
            }
          ]
        })
      } as unknown as Response)
    })
    afterEach(() => {
      fetchMock.mockReset()
    })
    it('should fetch the catalog from the builder server', () => {
      renderHook(() => useCatalog())
      expect(fetchMock).toHaveBeenCalledWith(CATALOG_URL)
    })
    it('should start with an empty catalog, null error and true isLoading', () => {
      const { result } = renderHook(() => useCatalog())
      const [catalog, error, isLoading] = result.current
      expect(catalog).toStrictEqual([])
      expect(error).toBe(null)
      expect(isLoading).toBe(true)
    })
    describe('and the catalog is fetched successfully', () => {
      it('should resolve to the catalog asset packs, have no error and set isLoading', async () => {
        const { result } = renderHook(() => useCatalog())
        await waitFor(() => {
          const [catalog, error, isLoading] = result.current
          expect(catalog).toHaveLength(1)
          expect(error).toBe(null)
          expect(isLoading).toBe(false)
        })
      })
    })
    describe('and the catalog is fetched with errors', () => {
      beforeEach(() => {
        fetchMock.mockResolvedValue({
          json: jest.fn().mockResolvedValue({
            ok: false,
            message: 'Something went wrong'
          })
        } as unknown as Response)
      })
      afterEach(() => {
        fetchMock.mockReset()
      })
      it('should set the catalog to an empty list, set the error and and set isLoading', async () => {
        const { result } = renderHook(() => useCatalog())
        await waitFor(() => {
          const [catalog, error, isLoading] = result.current
          expect(catalog).toEqual([])
          expect(error).toEqual(new Error('Something went wrong'))
          expect(isLoading).toBe(false)
        })
      })
    })
    describe('and the catalog is fetched with errors but no message', () => {
      beforeEach(() => {
        fetchMock.mockResolvedValue({
          json: jest.fn().mockResolvedValue({
            ok: false
          })
        } as unknown as Response)
      })
      afterEach(() => {
        fetchMock.mockReset()
      })
      it('should show a generic message', async () => {
        const { result } = renderHook(() => useCatalog())
        await waitFor(() => {
          const [catalog, error] = result.current
          expect(catalog).toEqual([])
          expect(error).toEqual(new Error('Could not load catalog'))
        })
      })
    })
    describe('and the fetch throws', () => {
      beforeEach(() => {
        fetchMock.mockRejectedValue(new Error('Something went wrong'))
      })
      afterEach(() => {
        fetchMock.mockReset()
      })
      it('should set an empty catalog and set the error', async () => {
        const { result } = renderHook(() => useCatalog())
        await waitFor(() => {
          const [catalog, error] = result.current
          expect(catalog).toEqual([])
          expect(error).toEqual(new Error('Something went wrong'))
        })
      })
      describe('and the reason is a string', () => {
        beforeEach(() => {
          fetchMock.mockRejectedValue('Something went wrong')
        })
        afterEach(() => {
          fetchMock.mockReset()
        })
        it('should set an empty catalog and set the error', async () => {
          const { result } = renderHook(() => useCatalog())
          await waitFor(() => {
            const [catalog, error] = result.current
            expect(catalog).toEqual([])
            expect(error).toEqual(new Error('Something went wrong'))
          })
        })
      })
      describe('and the reason is a unknown', () => {
        beforeEach(() => {
          fetchMock.mockRejectedValue({})
        })
        afterEach(() => {
          fetchMock.mockReset()
        })
        it('should set an empty catalog and set the error', async () => {
          const { result } = renderHook(() => useCatalog())
          await waitFor(() => {
            const [catalog, error] = result.current
            expect(catalog).toEqual([])
            expect(error).toEqual(new Error('Could not load catalog'))
          })
        })
      })
    })
  })
})
