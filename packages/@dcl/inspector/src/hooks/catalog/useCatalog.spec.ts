import { act, renderHook, waitFor } from '@testing-library/react'
import { getConfig } from '../../lib/logic/config'
import { useCatalog } from './useCatalog'

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
          assetPacks: [
            {
              id: 'asset-pack-1',
              name: 'Some Assetpack',
              assets: [
                {
                  id: 'asset-1',
                  name: 'Some Asset'
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
      const config = getConfig()
      act(() => {
        renderHook(() => useCatalog())
      })
      expect(fetchMock).toHaveBeenCalledWith(config.catalogUrl + '/catalog.json')
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
