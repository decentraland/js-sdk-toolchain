import { MessageTransport } from '@dcl/mini-rpc';

import { debounceByKey } from '/shared/utils';
import { CameraRPC } from './camera';

import { type Project } from '/shared/types/projects';

import { UiRPC } from './ui';
import { type Method, type Params, type Result, StorageRPC } from './storage';
import { fs, custom } from '#preload';

export type RPCInfo = {
  iframe: HTMLIFrameElement;
  project: Project;
  storage: StorageRPC;
  camera: CameraRPC;
};

interface Callbacks {
  writeFile?: (
    rpcInfo: RPCInfo,
    fnParams: Params[Method.WRITE_FILE],
  ) => Promise<Result[Method.WRITE_FILE]>;
}

const getPath = async (filePath: string, project: Project) => {
  let basePath = project.path;
  const normalizedPath = filePath.replace(/\\/g, '/');
  if (normalizedPath === 'custom' || normalizedPath.startsWith('custom/')) {
    basePath = await custom.getPath();
    filePath =
      normalizedPath === 'custom' ? '' : normalizedPath.substring(normalizedPath.indexOf('/') + 1);
  }
  const resolvedPath = await fs.resolve(basePath, filePath);
  return resolvedPath;
};

export function initRpc(iframe: HTMLIFrameElement, project: Project, cbs: Partial<Callbacks> = {}) {
  const transport = new MessageTransport(window, iframe.contentWindow!);
  const camera = new CameraRPC(transport);
  const ui = new UiRPC(transport);
  const storage = new StorageRPC(transport);
  const params = { iframe, project, storage, camera };

  storage.handle('read_file', async ({ path }) => {
    const file = await fs.readFile(await getPath(path, project));
    return file;
  });

  // Common write function
  const writeFile = async ({ path, content }: Params[Method.WRITE_FILE]) => {
    await fs.writeFile(await getPath(path, project), content as any);
    await cbs.writeFile?.(params, { path, content });
  };

  // Create a debounced version of the write operation for crdt/composite files, separate for each file path
  const debouncedWrite = debounceByKey(writeFile, 1000, ({ path }) => path);

  storage.handle('write_file', async params => {
    // Check if the file is a .crdt or .composite file
    const isCrdtOrComposite = params.path.endsWith('.crdt') || params.path.endsWith('.composite');

    if (isCrdtOrComposite) {
      return debouncedWrite(params);
    } else {
      await writeFile(params);
    }
  });

  storage.handle('exists', async ({ path }) => {
    return fs.exists(await getPath(path, project));
  });
  storage.handle('delete', async ({ path }) => {
    await fs.rm(await getPath(path, project));
  });
  storage.handle('list', async ({ path }) => {
    const basePath = await getPath(path, project);
    const files = await fs.readdir(basePath);
    const list = [];
    for (const file of files) {
      const filePath = await fs.resolve(basePath, file);
      list.push({
        name: file,
        isDirectory: await fs.isDirectory(filePath),
      });
    }

    return list;
  });

  void Promise.all([ui.selectAssetsTab('AssetsPack'), ui.selectSceneInspectorTab('details')]).catch(
    console.error,
  );

  return {
    ...params,
    dispose: () => {
      storage.dispose();
    },
  };
}

export async function takeScreenshot(iframe: HTMLIFrameElement, camera?: CameraRPC) {
  // TODO:
  // 1. make the camera position/target relative to parcels rows & columns
  // 2. the CameraServer only allows to reposition the main camera, so repositioning it, will also
  //    reposition the content creator's view. We need a way to specify a different camera or a way to
  //    save the current position, move it for a screenshot, and restore it
  //
  // leaving the next line just for reference:
  // await Promise.all([camera.setPosition(x, y, z), camera.setTarget(x, y, z)]);
  const _camera = camera ?? new CameraRPC(new MessageTransport(window, iframe.contentWindow!));
  const screenshot = await _camera.takeScreenshot(+iframe.width, +iframe.height);
  return screenshot;
}
