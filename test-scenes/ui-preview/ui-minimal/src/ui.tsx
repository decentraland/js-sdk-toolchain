// Minimal UI — this scene intentionally has NO ui-preview.tsx, to validate that
// `sdk-commands ui-preview` auto-scaffolds one and detects this setup function.
import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { Label, ReactEcsRenderer, UiEntity } from '@dcl/sdk/react-ecs'

const Hello = () => (
  <UiEntity uiTransform={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
    <UiEntity
      uiTransform={{ width: 420, height: 140, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', borderRadius: 16 }}
      uiBackground={{ color: Color4.create(0.1, 0.1, 0.16, 0.95) }}
    >
      <Label value="<b>ui-minimal</b>" fontSize={26} color={Color4.White()} />
      <Label value="scaffold-detection works" fontSize={15} color={Color4.create(0.4, 0.9, 0.6, 1)} />
    </UiEntity>
  </UiEntity>
)

export function setupUi() {
  ReactEcsRenderer.setUiRenderer(Hello)
}
