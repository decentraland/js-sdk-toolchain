/* eslint-disable no-console */
import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { UiEntity, Label, Input, Dropdown, Button } from '@dcl/sdk/react-ecs'

export const uiComponent = () => (
  <UiEntity
    uiTransform={{
      width: 700,
      height: 400,
      margin: { top: '35px', left: '500px' }
    }}
    uiBackground={{ color: Color4.create(0.5, 0.8, 0.1, 0.6) }}
  >
    <UiEntity
      onMouseDown={() => {}}
      uiTransform={{
        width: '100%',
        height: '20%',
        justifyContent: 'center',
        alignItems: 'center',
        display: 'flex'
      }}
    >
      <Dropdown
        uiBackground={{
          color: Color4.Blue()
        }}
        color={Color4.Red()}
        options={['BOEDO', 'CASLA']}
        uiTransform={{ width: 200, height: 36 }}
        onChange={(e) => {
          console.log(e)
        }}
      />
      <Input
        placeholder={'SARASA'}
        onChange={(value) => {
          console.log({ value })
        }}
        uiBackground={{
          color: Color4.Red()
        }}
        uiTransform={{ width: 200, height: 36 }}
      />
      <Label value={'SDK 7'} fontSize={80} uiBackground={{ color: Color4.fromHexString('#fbf0f0') }} />
    </UiEntity>
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '20%',
        justifyContent: 'center',
        alignItems: 'center',
        display: 'flex'
      }}
    >
      <Label value={`Counter:`} fontSize={60} uiBackground={{ color: Color4.fromHexString('#fbf0f0') }} />
    </UiEntity>
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '100px',
        justifyContent: 'center',
        alignItems: 'center',
        display: 'flex'
      }}
    >
      <Label value={`Player:`} fontSize={40} uiBackground={{ color: Color4.fromHexString('#fbf0f0') }} />
    </UiEntity>
    <Input onChange={() => {}} />
    <Button value="some value" onMouseDown={() => {}} onMouseUp={() => {}} />
  </UiEntity>
)
