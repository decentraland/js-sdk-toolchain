import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Scene } from '@dcl/schemas';

import { initializeWorkspace } from '../../src/modules/workspace';
import { getScenesPath } from '../../src/modules/settings';
import { getScene } from '../../src/modules/scene';
import { NEW_SCENE_NAME, EMPTY_SCENE_TEMPLATE_REPO } from '../../src/modules/constants';

import { getMockServices } from './services';

vi.mock('../../src/modules/scene');
vi.mock('../../src/modules/settings');

describe('initializeWorkspace', () => {
  const services = getMockServices();

  const mockAppHome = '/user/home/scenes';
  const mockScene = {
    display: {
      title: '',
    },
    worldConfiguration: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(getScenesPath).mockResolvedValue(mockAppHome);
    vi.mocked(getScene).mockResolvedValue({ ...mockScene } as Scene);
  });

  describe('getPath', () => {
    it('should return the app home path if it exists', async () => {
      services.fs.stat.mockResolvedValue({} as any);

      const workspace = initializeWorkspace(services);
      const result = await workspace.getPath();

      expect(getScenesPath).toHaveBeenCalled();
      expect(services.fs.stat).toHaveBeenCalledWith(mockAppHome);
      expect(services.fs.mkdir).not.toHaveBeenCalled();
      expect(result).toBe(mockAppHome);
    });

    it('should create the app home directory if it does not exist', async () => {
      services.fs.stat.mockRejectedValue(new Error('Directory not found'));

      const workspace = initializeWorkspace(services);
      const result = await workspace.getPath();

      expect(getScenesPath).toHaveBeenCalled();
      expect(services.fs.stat).toHaveBeenCalledWith(mockAppHome);
      expect(services.fs.mkdir).toHaveBeenCalledWith(mockAppHome);
      expect(result).toBe(mockAppHome);
    });
  });

  describe('getAvailable', () => {
    it('should return the default name and path if available', async () => {
      services.fs.exists.mockResolvedValue(false);

      const workspace = initializeWorkspace(services);
      const result = await workspace.getAvailable();

      expect(services.path.join).toHaveBeenCalledWith(mockAppHome, NEW_SCENE_NAME);
      expect(services.fs.exists).toHaveBeenCalledWith(`${mockAppHome}/${NEW_SCENE_NAME}`);
      expect(result).toEqual({
        name: NEW_SCENE_NAME,
        path: `${mockAppHome}/${NEW_SCENE_NAME}`,
      });
    });

    it('should increment the name counter if the default name is taken', async () => {
      services.fs.exists.mockImplementation(async path => {
        return (
          path === `${mockAppHome}/${NEW_SCENE_NAME}` ||
          path === `${mockAppHome}/${NEW_SCENE_NAME} 2`
        );
      });

      const workspace = initializeWorkspace(services);
      const result = await workspace.getAvailable();

      expect(services.fs.exists).toHaveBeenCalledTimes(3);
      expect(result).toEqual({
        name: `${NEW_SCENE_NAME} 3`,
        path: `${mockAppHome}/${NEW_SCENE_NAME} 3`,
      });
    });

    it('should use the provided name if given', async () => {
      const customName = 'My Custom Scene';
      services.fs.exists.mockResolvedValue(false);

      const workspace = initializeWorkspace(services);
      const result = await workspace.getAvailable(customName);

      expect(services.path.join).toHaveBeenCalledWith(mockAppHome, customName);
      expect(result).toEqual({
        name: customName,
        path: `${mockAppHome}/${customName}`,
      });
    });
  });

  describe('createProject', () => {
    it('should create a project with default settings', async () => {
      services.fs.exists.mockResolvedValue(false);

      const workspace = initializeWorkspace(services);
      const result = await workspace.createProject();

      expect(services.fs.mkdir).toHaveBeenCalledWith(`${mockAppHome}/${NEW_SCENE_NAME}`, {
        recursive: true,
      });
      expect(services.ipc.invoke).toHaveBeenCalledWith(
        'cli.init',
        `${mockAppHome}/${NEW_SCENE_NAME}`,
        EMPTY_SCENE_TEMPLATE_REPO,
      );
      expect(getScene).toHaveBeenCalledWith(`${mockAppHome}/${NEW_SCENE_NAME}`);
      expect(services.fs.writeFile).toHaveBeenCalledWith(
        `${mockAppHome}/${NEW_SCENE_NAME}/scene.json`,
        JSON.stringify({ display: { title: NEW_SCENE_NAME }, worldConfiguration: {} }, null, 2),
      );
      expect(services.config.setConfig).toHaveBeenCalled();
      expect(result).toEqual({
        path: `${mockAppHome}/${NEW_SCENE_NAME}`,
      });
    });

    it('should create a project with custom name and path', async () => {
      const customName = 'My Custom Project';
      const customPath = '/custom/path';
      const fullName = services.path.join(customPath, customName);

      const workspace = initializeWorkspace(services);
      const result = await workspace.createProject({
        name: customName,
        path: customPath,
      });

      expect(services.fs.mkdir).toHaveBeenCalledWith(fullName, {
        recursive: true,
      });
      expect(services.ipc.invoke).toHaveBeenCalledWith(
        'cli.init',
        fullName,
        EMPTY_SCENE_TEMPLATE_REPO,
      );
      expect(getScene).toHaveBeenCalledWith(fullName);
      expect(services.fs.writeFile).toHaveBeenCalledWith(
        services.path.join(fullName, 'scene.json'),
        JSON.stringify({ display: { title: customName }, worldConfiguration: {} }, null, 2),
      );
      expect(result).toEqual({
        path: fullName,
      });
    });

    it('should create a project with a custom template repo', async () => {
      const customRepo = 'https://github.com/user/custom-template';
      services.fs.exists.mockResolvedValue(false);
      const scene = { ...mockScene, worldConfiguration: {} } as Scene;
      vi.mocked(getScene).mockResolvedValue(scene);

      const workspace = initializeWorkspace(services);
      const _ = await workspace.createProject({
        repo: customRepo,
      });

      expect(services.ipc.invoke).toHaveBeenCalledWith(
        'cli.init',
        `${mockAppHome}/${NEW_SCENE_NAME}`,
        customRepo,
      );
      expect(services.fs.writeFile).toHaveBeenCalledWith(
        `${mockAppHome}/${NEW_SCENE_NAME}/scene.json`,
        JSON.stringify({ display: { title: NEW_SCENE_NAME } }, null, 2),
      );
      expect(scene.worldConfiguration).toBeUndefined();
    });

    it('should throw an error when project creation fails', async () => {
      const errorMessage = 'Failed to initialize project';
      services.ipc.invoke.mockRejectedValue(new Error(errorMessage));

      const workspace = initializeWorkspace(services);
      await expect(workspace.createProject()).rejects.toThrow(
        `Failed to create project "${NEW_SCENE_NAME}": ${errorMessage}`,
      );
    });
  });
});
