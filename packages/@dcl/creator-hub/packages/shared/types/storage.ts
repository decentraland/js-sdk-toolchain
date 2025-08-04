import path from 'node:path';
import fs from 'node:fs/promises';

type StorageData = {
  [key: string]: unknown;
};

export type IFileSystemStorage<T extends StorageData> = Awaited<
  ReturnType<typeof _createFileSystemStorage<T>>
>;

async function _createFileSystemStorage<T extends StorageData>(storagePath: string) {
  const dir = path.dirname(storagePath);
  try {
    await fs.stat(dir);
  } catch (error) {
    await fs.mkdir(dir, { recursive: true });
  }

  try {
    await fs.stat(storagePath);
  } catch (error) {
    await fs.writeFile(storagePath, '{}', 'utf-8');
  }

  const read = async (): Promise<T> => {
    try {
      const content = await fs.readFile(storagePath, 'utf-8');
      return JSON.parse(content) as T;
    } catch (error) {
      console.error('Error reading config file:', error);
      return {} as T;
    }
  };

  const write = async (data: T): Promise<void> => {
    try {
      await fs.writeFile(storagePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error writing config file:', error);
    }
  };

  return {
    get: async <K extends keyof T>(key: K): Promise<T[K] | undefined> => {
      const data = await read();
      return data[key] as T[K] | undefined;
    },
    getAll: async (): Promise<T> => {
      const data = await read();
      return data as T;
    },
    set: async <K extends keyof T>(key: K, value: T[K]): Promise<void> => {
      const data = await read();
      data[key] = value;
      await write(data);
    },
    setAll: async (data: T): Promise<void> => {
      await write(data);
    },
    has: async <K extends keyof T>(key: K): Promise<boolean> => {
      const data = await read();
      return key in data;
    },
  };
}

// In-memory Map of storages
const storageMap = new Map<string, IFileSystemStorage<StorageData>>();

export const FileSystemStorage = {
  async create<T extends StorageData>(path: string): Promise<IFileSystemStorage<T>> {
    const storage = await _createFileSystemStorage<T>(path);
    storageMap.set(path, storage as any);
    return storage;
  },
  get<T extends StorageData>(path: string): IFileSystemStorage<T> | undefined {
    const storage = storageMap.get(path);
    if (!storage) return undefined;
    return storage as unknown as IFileSystemStorage<T>;
  },
  async getOrCreate<T extends StorageData>(path: string): Promise<IFileSystemStorage<T>> {
    const storage = storageMap.get(path) ?? (await this.create(path));
    return storage as unknown as IFileSystemStorage<T>;
  },
  async existsPath(path: string): Promise<boolean> {
    try {
      await fs.stat(path);
      return true;
    } catch (error) {
      return false;
    }
  },
  async deleteFile(path: string): Promise<void> {
    if (await this.existsPath(path)) {
      await fs.rm(path);
    }
  },
};
