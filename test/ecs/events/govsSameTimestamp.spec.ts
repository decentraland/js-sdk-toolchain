import {
  Engine,
  IEngine,
  Entity,
  components,
  PointerEventType,
  InputAction,
  VideoState,
  MediaState,
  LoadingState,
  TriggerAreaEventType,
  createVideoEventsSystem,
  createTriggerAreaEventsSystem,
  VideoEventsSystem
} from '../../../packages/@dcl/ecs/src'
import { Quaternion, Vector3 } from '../../../packages/@dcl/sdk/math'
import { createTestPointerDownCommand } from './utils'

describe('GrowOnlyValueSet same-timestamp behavior', () => {
  describe('PointerEventsResult', () => {
    let engine: IEngine
    let PointerEventsResult: ReturnType<typeof components.PointerEventsResult>

    beforeEach(() => {
      engine = Engine()
      PointerEventsResult = components.PointerEventsResult(engine)
    })

    it('should preserve all values when multiple appends share the same timestamp', () => {
      const entity = engine.addEntity()

      PointerEventsResult.addValue(entity, createTestPointerDownCommand(entity, 10, PointerEventType.PET_DOWN, InputAction.IA_POINTER))
      PointerEventsResult.addValue(entity, createTestPointerDownCommand(entity, 10, PointerEventType.PET_HOVER_ENTER, InputAction.IA_POINTER))
      PointerEventsResult.addValue(entity, createTestPointerDownCommand(entity, 10, PointerEventType.PET_DOWN, InputAction.IA_PRIMARY))

      const results = Array.from(PointerEventsResult.get(entity))
      expect(results).toHaveLength(3)
    })

    it('should maintain insertion order for elements with equal timestamps', () => {
      const entity = engine.addEntity()

      PointerEventsResult.addValue(entity, createTestPointerDownCommand(entity, 5, PointerEventType.PET_DOWN, InputAction.IA_POINTER))
      PointerEventsResult.addValue(entity, createTestPointerDownCommand(entity, 5, PointerEventType.PET_UP, InputAction.IA_POINTER))
      PointerEventsResult.addValue(entity, createTestPointerDownCommand(entity, 5, PointerEventType.PET_HOVER_ENTER, InputAction.IA_POINTER))

      const results = Array.from(PointerEventsResult.get(entity))
      expect(results).toHaveLength(3)

      expect(results[0].state).toBe(PointerEventType.PET_DOWN)
      expect(results[1].state).toBe(PointerEventType.PET_UP)
      expect(results[2].state).toBe(PointerEventType.PET_HOVER_ENTER)
    })
  })

  describe('VideoEvent', () => {
    let engine: IEngine
    let VideoEvent: ReturnType<typeof components.VideoEvent>

    beforeEach(() => {
      engine = Engine()
      VideoEvent = components.VideoEvent(engine)
    })

    it('should preserve all values when multiple video events share the same timestamp', () => {
      const entity = engine.addEntity()

      VideoEvent.addValue(entity, { state: VideoState.VS_LOADING, currentOffset: 0, videoLength: 10, timestamp: 5, tickNumber: 5 })
      VideoEvent.addValue(entity, { state: VideoState.VS_BUFFERING, currentOffset: 0, videoLength: 10, timestamp: 5, tickNumber: 5 })
      VideoEvent.addValue(entity, { state: VideoState.VS_PLAYING, currentOffset: 0, videoLength: 10, timestamp: 5, tickNumber: 5 })

      const results = Array.from(VideoEvent.get(entity))
      expect(results).toHaveLength(3)
    })

    it('should maintain insertion order for same-timestamp video events', () => {
      const entity = engine.addEntity()

      VideoEvent.addValue(entity, { state: VideoState.VS_LOADING, currentOffset: 0, videoLength: 10, timestamp: 5, tickNumber: 5 })
      VideoEvent.addValue(entity, { state: VideoState.VS_BUFFERING, currentOffset: 0, videoLength: 10, timestamp: 5, tickNumber: 5 })
      VideoEvent.addValue(entity, { state: VideoState.VS_PLAYING, currentOffset: 1, videoLength: 10, timestamp: 5, tickNumber: 5 })

      const results = Array.from(VideoEvent.get(entity))
      expect(results[0].state).toBe(VideoState.VS_LOADING)
      expect(results[1].state).toBe(VideoState.VS_BUFFERING)
      expect(results[2].state).toBe(VideoState.VS_PLAYING)
    })

    it('should report the latest state via VideoEventsSystem.getVideoState when same-timestamp events arrive', async () => {
      const videoEventsSystem: VideoEventsSystem = createVideoEventsSystem(engine)
      const VideoPlayer = components.VideoPlayer(engine)

      const entity = engine.addEntity()
      VideoPlayer.create(entity)

      VideoEvent.addValue(entity, { state: VideoState.VS_LOADING, currentOffset: 0, videoLength: 10, timestamp: 1, tickNumber: 1 })
      VideoEvent.addValue(entity, { state: VideoState.VS_PLAYING, currentOffset: 0, videoLength: 10, timestamp: 1, tickNumber: 1 })

      await engine.update(1)

      const state = videoEventsSystem.getVideoState(entity)
      expect(state).toBeDefined()
      expect(state!.state).toBe(VideoState.VS_PLAYING)
    })
  })

  describe('AvatarEmoteCommand', () => {
    let engine: IEngine
    let AvatarEmoteCommand: ReturnType<typeof components.AvatarEmoteCommand>

    beforeEach(() => {
      engine = Engine()
      AvatarEmoteCommand = components.AvatarEmoteCommand(engine)
    })

    it('should preserve all values when multiple emote commands share the same timestamp', () => {
      const entity = engine.addEntity()

      AvatarEmoteCommand.addValue(entity, { emoteUrn: 'wave', loop: false, timestamp: 10 })
      AvatarEmoteCommand.addValue(entity, { emoteUrn: 'dance', loop: true, timestamp: 10 })
      AvatarEmoteCommand.addValue(entity, { emoteUrn: 'clap', loop: false, timestamp: 10 })

      const results = Array.from(AvatarEmoteCommand.get(entity))
      expect(results).toHaveLength(3)
    })

    it('should maintain insertion order for same-timestamp emote commands', () => {
      const entity = engine.addEntity()

      AvatarEmoteCommand.addValue(entity, { emoteUrn: 'wave', loop: false, timestamp: 10 })
      AvatarEmoteCommand.addValue(entity, { emoteUrn: 'dance', loop: true, timestamp: 10 })
      AvatarEmoteCommand.addValue(entity, { emoteUrn: 'clap', loop: false, timestamp: 10 })

      const results = Array.from(AvatarEmoteCommand.get(entity))
      expect(results[0].emoteUrn).toBe('wave')
      expect(results[1].emoteUrn).toBe('dance')
      expect(results[2].emoteUrn).toBe('clap')
    })

    it('should correctly order mixed timestamps with equal-timestamp groups', () => {
      const entity = engine.addEntity()

      AvatarEmoteCommand.addValue(entity, { emoteUrn: 'wave', loop: false, timestamp: 1 })
      AvatarEmoteCommand.addValue(entity, { emoteUrn: 'dance', loop: true, timestamp: 2 })
      AvatarEmoteCommand.addValue(entity, { emoteUrn: 'clap', loop: false, timestamp: 2 })
      AvatarEmoteCommand.addValue(entity, { emoteUrn: 'salute', loop: false, timestamp: 3 })

      const results = Array.from(AvatarEmoteCommand.get(entity))
      expect(results).toHaveLength(4)
      expect(results.map((r) => r.emoteUrn)).toEqual(['wave', 'dance', 'clap', 'salute'])
    })
  })

  describe('AudioEvent', () => {
    let engine: IEngine
    let AudioEvent: ReturnType<typeof components.AudioEvent>

    beforeEach(() => {
      engine = Engine()
      AudioEvent = components.AudioEvent(engine)
    })

    it('should preserve all values when multiple audio events share the same timestamp', () => {
      const entity = engine.addEntity()

      AudioEvent.addValue(entity, { state: MediaState.MS_LOADING, timestamp: 7 })
      AudioEvent.addValue(entity, { state: MediaState.MS_PLAYING, timestamp: 7 })

      const results = Array.from(AudioEvent.get(entity))
      expect(results).toHaveLength(2)
    })

    it('should maintain insertion order for same-timestamp audio events', () => {
      const entity = engine.addEntity()

      AudioEvent.addValue(entity, { state: MediaState.MS_LOADING, timestamp: 7 })
      AudioEvent.addValue(entity, { state: MediaState.MS_PLAYING, timestamp: 7 })
      AudioEvent.addValue(entity, { state: MediaState.MS_PAUSED, timestamp: 7 })

      const results = Array.from(AudioEvent.get(entity))
      expect(results[0].state).toBe(MediaState.MS_LOADING)
      expect(results[1].state).toBe(MediaState.MS_PLAYING)
      expect(results[2].state).toBe(MediaState.MS_PAUSED)
    })

    it('should correctly order mixed timestamps with equal-timestamp groups', () => {
      const entity = engine.addEntity()

      AudioEvent.addValue(entity, { state: MediaState.MS_NONE, timestamp: 1 })
      AudioEvent.addValue(entity, { state: MediaState.MS_LOADING, timestamp: 2 })
      AudioEvent.addValue(entity, { state: MediaState.MS_READY, timestamp: 2 })
      AudioEvent.addValue(entity, { state: MediaState.MS_PLAYING, timestamp: 3 })

      const results = Array.from(AudioEvent.get(entity))
      expect(results).toHaveLength(4)
      expect(results.map((r) => r.state)).toEqual([
        MediaState.MS_NONE,
        MediaState.MS_LOADING,
        MediaState.MS_READY,
        MediaState.MS_PLAYING
      ])
    })
  })

  describe('TriggerAreaResult', () => {
    let engine: IEngine
    let triggerAreaEventsSystem: ReturnType<typeof createTriggerAreaEventsSystem>
    let TriggerAreaResult: ReturnType<typeof components.TriggerAreaResult>
    let TriggerArea: ReturnType<typeof components.TriggerArea>

    beforeEach(() => {
      engine = Engine()
      triggerAreaEventsSystem = createTriggerAreaEventsSystem(engine)
      TriggerAreaResult = components.TriggerAreaResult(engine)
      TriggerArea = components.TriggerArea(engine)
    })

    function addTriggerResult(
      entity: Entity,
      eventType: TriggerAreaEventType,
      timestamp: number,
      triggerEntity: Entity = engine.RootEntity
    ) {
      TriggerAreaResult.addValue(entity, {
        triggeredEntity: entity as number,
        triggeredEntityPosition: Vector3.Zero(),
        triggeredEntityRotation: Quaternion.Zero(),
        eventType,
        timestamp,
        trigger: {
          entity: triggerEntity as number,
          layers: 0,
          position: Vector3.Zero(),
          rotation: Quaternion.Zero(),
          scale: Vector3.One()
        }
      })
    }

    it('should fire all callbacks when multiple events share the same timestamp', async () => {
      const entity = engine.addEntity()
      TriggerArea.setBox(entity)

      const onEnter = jest.fn()
      const onStay = jest.fn()
      const onExit = jest.fn()
      triggerAreaEventsSystem.onTriggerEnter(entity, onEnter)
      triggerAreaEventsSystem.onTriggerStay(entity, onStay)
      triggerAreaEventsSystem.onTriggerExit(entity, onExit)

      addTriggerResult(entity, TriggerAreaEventType.TAET_ENTER, 1)
      addTriggerResult(entity, TriggerAreaEventType.TAET_STAY, 1)
      addTriggerResult(entity, TriggerAreaEventType.TAET_EXIT, 1)

      await engine.update(1)

      expect(onEnter).toHaveBeenCalledTimes(1)
      expect(onStay).toHaveBeenCalledTimes(1)
      expect(onExit).toHaveBeenCalledTimes(1)
    })

    it('should preserve insertion order for same-timestamp events', async () => {
      const entity = engine.addEntity()
      TriggerArea.setBox(entity)

      const callOrder: string[] = []
      triggerAreaEventsSystem.onTriggerEnter(entity, () => callOrder.push('enter'))
      triggerAreaEventsSystem.onTriggerStay(entity, () => callOrder.push('stay'))
      triggerAreaEventsSystem.onTriggerExit(entity, () => callOrder.push('exit'))

      addTriggerResult(entity, TriggerAreaEventType.TAET_ENTER, 5)
      addTriggerResult(entity, TriggerAreaEventType.TAET_STAY, 5)
      addTriggerResult(entity, TriggerAreaEventType.TAET_EXIT, 5)

      await engine.update(1)

      expect(callOrder).toEqual(['enter', 'stay', 'exit'])
    })

    it('should not re-fire callbacks for already-consumed same-timestamp events on the next tick', async () => {
      const entity = engine.addEntity()
      TriggerArea.setBox(entity)

      const onEnter = jest.fn()
      const onStay = jest.fn()
      triggerAreaEventsSystem.onTriggerEnter(entity, onEnter)
      triggerAreaEventsSystem.onTriggerStay(entity, onStay)

      addTriggerResult(entity, TriggerAreaEventType.TAET_ENTER, 10)
      addTriggerResult(entity, TriggerAreaEventType.TAET_STAY, 10)

      await engine.update(1)
      expect(onEnter).toHaveBeenCalledTimes(1)
      expect(onStay).toHaveBeenCalledTimes(1)

      await engine.update(1)
      expect(onEnter).toHaveBeenCalledTimes(1)
      expect(onStay).toHaveBeenCalledTimes(1)
    })

    it('should handle multiple same-timestamp enter events from different trigger entities', async () => {
      const areaEntity = engine.addEntity()
      TriggerArea.setBox(areaEntity)

      const triggerEntityA = engine.addEntity()
      const triggerEntityB = engine.addEntity()

      const results: number[] = []
      triggerAreaEventsSystem.onTriggerEnter(areaEntity, (result) => {
        results.push(result.trigger!.entity)
      })

      addTriggerResult(areaEntity, TriggerAreaEventType.TAET_ENTER, 1, triggerEntityA)
      addTriggerResult(areaEntity, TriggerAreaEventType.TAET_ENTER, 1, triggerEntityB)

      await engine.update(1)

      expect(results).toHaveLength(2)
      expect(results).toEqual([triggerEntityA as number, triggerEntityB as number])
    })
  })

  describe('AssetLoadLoadingState', () => {
    let engine: IEngine
    let AssetLoadLoadingState: ReturnType<typeof components.AssetLoadLoadingState>

    beforeEach(() => {
      engine = Engine()
      AssetLoadLoadingState = components.AssetLoadLoadingState(engine)
    })

    it('should preserve all values when multiple loading states share the same timestamp', () => {
      const entity = engine.addEntity()

      AssetLoadLoadingState.addValue(entity, { currentState: LoadingState.LOADING, asset: 'model.glb', timestamp: 3 })
      AssetLoadLoadingState.addValue(entity, { currentState: LoadingState.FINISHED, asset: 'texture.png', timestamp: 3 })

      const results = Array.from(AssetLoadLoadingState.get(entity))
      expect(results).toHaveLength(2)
    })

    it('should maintain insertion order for same-timestamp loading states', () => {
      const entity = engine.addEntity()

      AssetLoadLoadingState.addValue(entity, { currentState: LoadingState.LOADING, asset: 'model.glb', timestamp: 3 })
      AssetLoadLoadingState.addValue(entity, { currentState: LoadingState.FINISHED, asset: 'texture.png', timestamp: 3 })
      AssetLoadLoadingState.addValue(entity, { currentState: LoadingState.FINISHED_WITH_ERROR, asset: 'audio.mp3', timestamp: 3 })

      const results = Array.from(AssetLoadLoadingState.get(entity))
      expect(results[0].asset).toBe('model.glb')
      expect(results[1].asset).toBe('texture.png')
      expect(results[2].asset).toBe('audio.mp3')
    })

    it('should correctly order mixed timestamps with equal-timestamp groups', () => {
      const entity = engine.addEntity()

      AssetLoadLoadingState.addValue(entity, { currentState: LoadingState.UNKNOWN, asset: 'a.glb', timestamp: 1 })
      AssetLoadLoadingState.addValue(entity, { currentState: LoadingState.LOADING, asset: 'b.glb', timestamp: 2 })
      AssetLoadLoadingState.addValue(entity, { currentState: LoadingState.LOADING, asset: 'c.png', timestamp: 2 })
      AssetLoadLoadingState.addValue(entity, { currentState: LoadingState.FINISHED, asset: 'd.glb', timestamp: 3 })

      const results = Array.from(AssetLoadLoadingState.get(entity))
      expect(results).toHaveLength(4)
      expect(results.map((r) => r.asset)).toEqual(['a.glb', 'b.glb', 'c.png', 'd.glb'])
    })
  })
})
