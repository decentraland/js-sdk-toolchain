import { FreeCamera, NullEngine, Scene, Vector3, ScreenshotTools } from '@babylonjs/core'
import { InMemoryTransport } from '@dcl/mini-rpc'
import { CameraClient } from './client'
import { CameraServer } from './server'

describe('CameraRPC', () => {
  const parent = new InMemoryTransport()
  const iframe = new InMemoryTransport()

  parent.connect(iframe)
  iframe.connect(parent)

  const engine = new NullEngine()
  const scene = new Scene(engine)
  const camera = new FreeCamera('camera', new Vector3(0, 0, 0), scene)

  const client = new CameraClient(parent)
  const _server = new CameraServer(iframe, engine, camera)

  describe('When using the takeScreenshot method of the client', () => {
    it('should generate a screenshot on the server and relay it back to the client', async () => {
      const image = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==`
      const spy = jest.spyOn(ScreenshotTools, 'CreateScreenshotAsync')
      spy.mockResolvedValue(image)
      await expect(client.takeScreenshot(1024, 1024)).resolves.toBe(image)
      expect(spy).toHaveBeenCalledWith(engine, camera, expect.objectContaining({ width: 1024, height: 1024 }))
      spy.mockRestore()
    })
  })
  describe('When using the setPosition method of the client', () => {
    it('should set the position of the camera in the server', async () => {
      const spy = jest.spyOn(camera.position, 'set')
      await expect(client.setPosition(8, 0, 8)).resolves.toBe(undefined)
      expect(spy).toHaveBeenCalledWith(8, 0, 8)
      spy.mockRestore()
    })
  })
  describe('When using the setTarget method of the client', () => {
    it('should set the target of the camera in the server', async () => {
      const spy = jest.spyOn(camera, 'setTarget')
      await expect(client.setTarget(8, 0, 8)).resolves.toBe(undefined)
      expect(spy).toHaveBeenCalledWith(new Vector3(8, 0, 8))
      spy.mockRestore()
    })
  })
})
