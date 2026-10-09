import { Observable, ObserverEventState } from '../../packages/@dcl/sdk/src/internal/Observable'

describe('Observable.notifyObserversWithPromise', () => {
  describe('when an asynchronous observer skips the remaining observers', () => {
    let observable: Observable<number>
    let calls: string[]
    let firstCallback: jest.Mock<Promise<void>, [number, ObserverEventState]>
    let secondCallback: jest.Mock<Promise<void>, [number, ObserverEventState]>

    beforeEach(() => {
      observable = new Observable<number>()
      calls = []
      firstCallback = jest.fn(async (_value: number, state: ObserverEventState) => {
        calls.push('first')
        state.skipNextObservers = true
      })
      secondCallback = jest.fn(async (_value: number, _state: ObserverEventState) => {
        calls.push('second')
      })
      observable.add(firstCallback)
      observable.add(secondCallback)
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should stop before invoking the next observer', async () => {
      await observable.notifyObserversWithPromise(1)

      expect(calls).toEqual(['first'])
    })
  })
})
