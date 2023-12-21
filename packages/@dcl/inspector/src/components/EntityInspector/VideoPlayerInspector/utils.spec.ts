import { TreeNode } from '../../ProjectAssetExplorer/ProjectView'
import {
  fromVideoPlayer,
  toVideoPlayer,
  volumeFromVideoPlayer,
  volumeToVideoPlayer,
  isValidInput,
  isVideoFile,
  isVideo,
  isValidVolume
} from './utils'

describe('VideoPlayerUtils', () => {
  const base = '/base/path'
  const assetCatalogResponse = {
    basePath: '/base/path',
    assets: [{ path: '/base/path/video.mp4' }, { path: '/base/path/audio.mp3' }, { path: '/base/path/image.jpg' }]
  }

  describe('fromVideoPlayer', () => {
    it('converts PBVideoPlayer to VideoPlayerInput', () => {
      const videoPlayer = { src: '/base/path/video.mp4', loop: true, playing: false, volume: 0.5 }
      const result = fromVideoPlayer(base)(videoPlayer)
      expect(result).toEqual({ src: 'video.mp4', loop: true, playing: false, volume: '50' })
    })
  })

  describe('toVideoPlayer', () => {
    it('converts VideoPlayerInput to PBVideoPlayer', () => {
      const videoPlayerInput = { src: 'video.mp4', loop: true, playing: false, volume: '50' }
      const result = toVideoPlayer(base)(videoPlayerInput)
      expect(result).toEqual({ src: '/base/path/video.mp4', loop: true, playing: false, volume: 0.5 })
    })
  })

  describe('volumeFromVideoPlayer', () => {
    it('converts volume from VideoPlayer to string', () => {
      const result = volumeFromVideoPlayer(0.75)
      expect(result).toBe('75')
    })
  })

  describe('volumeToVideoPlayer', () => {
    it('converts volume from string to VideoPlayer', () => {
      const result = volumeToVideoPlayer('50')
      expect(result).toBe(0.5)
    })
  })

  describe('isValidInput', () => {
    it('returns true for a valid input', () => {
      const result = isValidInput(assetCatalogResponse, 'video.mp4')
      expect(result).toBe(true)
    })

    it('returns false for an invalid input', () => {
      const result = isValidInput(assetCatalogResponse, 'invalid.mp4')
      expect(result).toBe(false)
    })
  })

  describe('isVideoFile', () => {
    it('returns true for an video file', () => {
      const result = isVideoFile('video.mp4')
      expect(result).toBe(true)
    })

    it('returns false for a non-video file', () => {
      const result = isVideoFile('image.jpg')
      expect(result).toBe(false)
    })
  })

  describe('isVideo', () => {
    it('returns true for an video node', () => {
      const videoNode = { type: 'asset', name: 'video.mp4' } as TreeNode
      const result = isVideo(videoNode)
      expect(result).toBe(true)
    })

    it('returns false for a non-video node', () => {
      const imageNode = { type: 'asset', name: 'image.jpg' } as TreeNode
      const result = isVideo(imageNode)
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
