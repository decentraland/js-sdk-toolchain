import { PBAudioStream } from '@dcl/ecs'

import {
  fromAudioStream,
  toAudioStream,
  volumeFromAudioStream,
  volumeToAudioStream,
  isValidInput,
  isValidVolume
} from './utils'

describe('AudioStreamUtils', () => {
  describe('fromAudioStream', () => {
    it('converts PBAudioStream to AudioStreamInput', () => {
      const audioStream: PBAudioStream = { url: 'audio.mp3', playing: false, volume: 0.5 }
      const result = fromAudioStream(audioStream)
      expect(result).toEqual({ url: 'audio.mp3', playing: false, volume: '50' })
    })
  })

  describe('toAudioStream', () => {
    it('converts AudioStreamInput to PBAudioStream', () => {
      const audioStreamInput = { url: 'audio.mp3', playing: false, volume: '50' }
      const result = toAudioStream(audioStreamInput)
      expect(result).toEqual({ url: 'audio.mp3', playing: false, volume: 0.5 })
    })
  })

  describe('volumeFromAudioStream', () => {
    it('converts volume from AudioStream to string', () => {
      const result = volumeFromAudioStream(0.75)
      expect(result).toBe('75')
    })
  })

  describe('volumeToAudioStream', () => {
    it('converts volume from string to AudioStream', () => {
      const result = volumeToAudioStream('50')
      expect(result).toBe(0.5)
    })
  })

  describe('isValidInput', () => {
    it('returns true for a valid input', () => {
      const result = isValidInput('https://example.com/audio.mp3')
      expect(result).toBe(true)
    })

    it('returns false for an invalid input', () => {
      const result = isValidInput('invalid')
      expect(result).toBe(false)
    })
  })

  describe('isValidVolume', () => {
    it('returns true for a valid volume', () => {
      const result = isValidVolume('50')
      expect(result).toBe(true)
    })

    it('returns false for an invalid volume', () => {
      const result = isValidVolume('invalid')
      expect(result).toBe(false)
    })
  })
})
