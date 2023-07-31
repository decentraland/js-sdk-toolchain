import { engine } from '@dcl/sdk/ecs'
import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { UiEntity, Label, ReactEcsRenderer, Dropdown } from '@dcl/sdk/react-ecs'

const src = 'images/rounded_alpha_square.png'
const centeredImage = 'images/ui_beam_up_bg.png'

let dt = 0
let userId: string | undefined

engine.addSystem((t) => {
  dt += t
})

let currentValue = 0
const options = [
  function StretchAndTint() {
    const tint2 = Color4.lerp(Color4.Red(), Color4.Blue(), 1 + Math.sin(dt + Math.cos(dt * 0.3)) * 0.5)
    return (
      <UiEntity
        uiTransform={{
          width: `${(1 + Math.sin(dt) * 0.5) * 50}%`,
          height: 244
        }}
        uiBackground={{
          color: tint2,
          textureMode: 'stretch',
          texture: {
            src
          }
        }}
      >
        <Label value="STRETCH + TINT\n(borders are deformed)" fontSize={29} />
      </UiEntity>
    )
  },
  function NineSlicesAndTint() {
    const tint = Color4.lerp(Color4.Red(), Color4.Blue(), 1 + Math.sin(dt + Math.cos(dt * 0.3)) * 0.5)
    return (
      <UiEntity
        uiTransform={{
          width: `${(1 + Math.sin(dt) * 0.5) * 50}%`,
          height: 128
        }}
        uiBackground={{
          color: tint,
          textureMode: 'nine-slices',
          texture: {
            src
          }
        }}
      >
        <Label value="NINE_SLICES + TINT" color={Color4.Black()} fontSize={29} />
      </UiEntity>
    )
  },
  function NineSlicesAndTint() {
    const tint = Color4.lerp(
      Color4.fromHexString('#336613ff'),
      Color4.fromHexString('#f099f3ff'),
      1 + Math.sin(dt) * 0.5
    )

    return (
      <UiEntity
        uiTransform={{
          width: 200,
          height: (1 + Math.sin(dt) * 0.5) * 200
        }}
        uiBackground={{
          color: tint,
          textureMode: 'nine-slices',
          texture: {
            src: centeredImage
          }
        }}
      >
        <Label value="NINE_SLICES + TINT" color={Color4.Red()} fontSize={29} />
      </UiEntity>
    )
  },
  function NineSlicesAndMargin() {
    const margin = (1 + Math.cos(dt * 0.3)) * 0.1

    return (
      <UiEntity
        uiTransform={{
          width: 256,
          height: 256
        }}
        uiBackground={{
          textureMode: 'nine-slices',
          texture: {
            src: centeredImage
          },
          textureSlices: {
            top: margin,
            bottom: margin,
            left: margin,
            right: margin
          }
        }}
      >
        <Label value={`NINE_SLICES (with margins ${margin.toFixed(2)})`} color={Color4.Red()} fontSize={29} />
      </UiEntity>
    )
  },
  function Center() {
    return (
      <UiEntity
        uiTransform={{
          width: 250 + Math.cos(dt) * 100,
          height: 128 + Math.sin(dt * 0.2) * 64
        }}
        uiBackground={{
          textureMode: 'center',
          texture: {
            src: centeredImage
          }
        }}
      >
        <Label value="CENTER" color={Color4.Green()} fontSize={29} />
      </UiEntity>
    )
  },
  function AvatarTexture() {
    return (
      <UiEntity
        uiTransform={{
          width: 250 + Math.cos(dt) * 100,
          height: 128 + Math.sin(dt * 0.2) * 64
        }}
        uiBackground={{
          textureMode: 'center',
          avatarTexture: {
            userId: userId ?? ''
          }
        }}
      >
        <Label value="CENTER" color={Color4.Green()} fontSize={29} />
      </UiEntity>
    )
  }
]

function selectOption(index: number) {
  currentValue = index
}

export const ui = () => {
  const Renderer = options[currentValue] || (() => null)

  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '50%',
        flexDirection: 'column',
        margin: { left: 300 }
      }}
      uiBackground={{ color: Color4.Black() }}
    >
      <Label value="Select an example from below" />
      <Dropdown options={options.map(($) => $.name)} onChange={selectOption} />
      <Renderer />
    </UiEntity>
  )
}

ReactEcsRenderer.setUiRenderer(ui)
