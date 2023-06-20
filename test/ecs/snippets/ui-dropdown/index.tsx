import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { UiEntity, Label, ReactEcsRenderer, Dropdown } from '@dcl/sdk/react-ecs'

const colorList = ['Red', 'Green', 'Blue', 'Black', 'White', 'Purple', 'Magenta', 'Yellow', 'Gray', 'Teal', 'Clear']

let selectedColorIndex = 0

function selectOption(index: number) {
  selectedColorIndex = index
}

export const ui = () => {
  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '3000px',
        flexDirection: 'column'
      }}
      uiBackground={{ color: (Color4 as any)[colorList[selectedColorIndex]]() }}
    >
      <Label value="Select a color" fontSize={29} />
      <Dropdown options={colorList} onChange={selectOption} />
    </UiEntity>
  )
}

ReactEcsRenderer.setUiRenderer(ui)
