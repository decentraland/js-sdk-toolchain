import { pathToFileURL } from 'url';

export function dynamicImport<T>(path: string): Promise<T extends object ? T : any> {
  const fileUrl = pathToFileURL(path).href;
  return import(fileUrl);
}
