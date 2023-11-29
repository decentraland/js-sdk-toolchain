import { engine, Entity, PointerEvents, Transform } from '@dcl/sdk/ecs'
import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { Button, Label, ReactEcsRenderer, UiEntity } from '@dcl/sdk/react-ecs'
import { Bird, BirdKilled } from './hummingBird'
import { GameStatus } from '.'
import { createCircle, createTriangle } from './create-cube'

let scoreBoard: [string, number][] = []
let scoreInterval = 0
export let gamePaused = false
let gameStatusEntity: Entity

// System used to avoid checking this info on every tick.
// Instead we do all this logic every 1s
engine.addSystem((dt: number) => {
  scoreInterval += dt
  if (scoreInterval <= 1) return
  scoreInterval = 0
  const internalScoreBoard = new Map<string, number>()

  // Game status info
  gameStatusEntity = gameStatusEntity ?? (Array.from(engine.getEntitiesWith(GameStatus))[0] || [])[0]
  gamePaused = GameStatus.getOrNull(gameStatusEntity)?.paused ?? false

  // Create the score board for the birds killed
  for (const [_, bird] of engine.getEntitiesWith(BirdKilled)) {
    internalScoreBoard.set(bird.userId, (internalScoreBoard.get(bird.userId) ?? 0) + 1)
  }
  scoreBoard = Array.from(internalScoreBoard.entries())
    .sort((a, b) => (a[1] < b[1] ? 1 : -1))
    .slice(0, 5)
})

export const ADMIN_USERS = new Set(['0xB8c4df381C6C305758F806c3aA71F37AaBbcBD92'.toLocaleLowerCase()])

export function setupUi(userId: string) {
  const isAdmin = ADMIN_USERS.has(userId.toLocaleLowerCase())

  ReactEcsRenderer.setUiRenderer(() => {
    return [
      !!isAdmin && (
        <UiEntity
          key="admin-pannel"
          uiBackground={{ color: Color4.fromHexString(gamePaused ? '#94909045' : '#00000000') }}
          uiTransform={{ width: 100, height: '100%' }}
        >
          <Button
            uiTransform={{ width: 100, height: 30, position: { top: '50%' } }}
            onMouseDown={() => {
              const mutableGame = GameStatus.getMutableOrNull(gameStatusEntity)
              if (!mutableGame) return
              mutableGame.paused = !gamePaused
            }}
            value={gamePaused ? 'RESUME GAME' : 'STOP GAME'}
            variant="primary"
          />
        </UiEntity>
      ),
      gamePaused && (
        <UiEntity
          key="paused-modal"
          uiTransform={{ width: '100%', height: '100%' }}
          uiBackground={{ color: Color4.fromHexString('#94909045') }}
        >
          <Label value="Game Paused" fontSize={24} uiTransform={{ width: '100%', height: '100%' }} />
        </UiEntity>
      ),
      <UiEntity
        key="scoreboard"
        uiTransform={{
          width: 300,
          height: 530,
          margin: '16px 0 8px 270px',
          padding: 4,
          position: { right: 10 },
          positionType: 'absolute'
        }}
        uiBackground={{ color: Color4.create(0.5, 0.8, 0.1, 0.6) }}
      >
        <UiEntity
          uiTransform={{
            width: '100%',
            height: '100%',
            flexDirection: 'column',
            alignItems: 'center'
          }}
          uiBackground={{ color: Color4.fromHexString('#70ac76ff') }}
        >
          <Label
            value={`# Birds Killed: ${[...engine.getEntitiesWith(BirdKilled)].length} / ${
              [...engine.getEntitiesWith(Bird, PointerEvents)].length
            }`}
            fontSize={18}
            uiTransform={{ width: '100%', height: 40 }}
          />
          <Button
            value="Create Sync (Triangle)"
            fontSize={18}
            uiTransform={{ width: '100%', height: 40 }}
            onMouseDown={handleCreateTriangle}
          />
          <Button
            value="Create Local (Circle)"
            fontSize={18}
            uiTransform={{ width: '100%', height: 40 }}
            onMouseDown={() => {
              const { x, y, z } = Transform.get(engine.PlayerEntity).position
              createCircle(x, y, z, false)
            }}
          />
          {scoreBoard.map(($) => (
            <Label
              value={`${formatAddress($[0])}  #${$[1]}`}
              fontSize={18}
              uiTransform={{ width: '100%', height: 40 }}
            />
          ))}
          <Label value={getPlayerPosition()} fontSize={18} uiTransform={{ width: '100%', height: 40 }} />
        </UiEntity>
      </UiEntity>
    ]
  })
}

function handleCreateTriangle() {
  const { x, y, z } = Transform.get(engine.PlayerEntity).position
  createTriangle(x, y, z)
}

export function formatAddress(address: string) {
  if (!address.startsWith('0x')) return address
  const prefix = address.slice(0, 5)
  const body = address.slice(-4)
  const formattedAddress = `${prefix}...${body}`
  return formattedAddress
}

export function getPlayerPosition() {
  const playerPosition = Transform.getOrNull(engine.PlayerEntity)
  if (!playerPosition) return ' no data yet'
  const { x, y, z } = playerPosition.position
  return `{X: ${x.toFixed(2)}, Y: ${y.toFixed(2)}, z: ${z.toFixed(2)} }`
}
