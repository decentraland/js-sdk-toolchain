import { propsChanged } from '../../packages/@dcl/react-ecs/src/reconciler/utils'

describe('reconciler propsChanged', () => {
  it('detects a key present only in nextProps (optional prop set for the first time)', () => {
    // Regression: the diff used to iterate only the keys present in prevProps, so a field
    // appearing for the first time (absent from prevProps, present in nextProps) was silently
    // dropped on its first change. This is what made e.g. the first scroll-to-target — and any
    // optional prop going from undefined to a value — never reach the engine.
    expect(propsChanged('uiTransform', {}, { width: 100 })).toEqual({
      type: 'put',
      component: 'uiTransform',
      props: { width: 100 }
    })
  })

  it('still detects a changed existing key', () => {
    expect(propsChanged('uiTransform', { width: 100 }, { width: 200 })).toEqual({
      type: 'put',
      component: 'uiTransform',
      props: { width: 200 }
    })
  })

  it('returns undefined when nothing changed', () => {
    expect(propsChanged('uiTransform', { width: 100 }, { width: 100 })).toBeUndefined()
  })
})
