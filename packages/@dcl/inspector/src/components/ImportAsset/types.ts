export type FileAsset = {
  blob: File;
  name: string;
  extension: string;
  error?: string;
  thumbnail?: string;
};

export type GltfAsset = FileAsset & {
  buffers: FileAsset[];
  images: FileAsset[];
};

export type Asset = GltfAsset | FileAsset;
export type Uri = { uri: string };
export type GltfFile = { buffers: Uri[]; images: Uri[] };

export type ValidationError = string | undefined
/*
  Severity codes are Error (0), Warning (1), Information (2), Hint (3).
  https://github.com/KhronosGroup/glTF-Validator/blob/main/lib/src/errors.dart
*/
export type BabylonValidationIssue = {
  severity: number
  code: string
  message: string
  pointer: string
}

export const isGltfAsset = (asset: Asset): asset is GltfAsset => {
  const _asset = asset as any
  return _asset.buffers && _asset.images
}
