/* eslint-disable */
import _m0 from "protobufjs/minimal";

const protobufPackageSarasa = "";

/**
 * @public
 */
export interface Empty {
}

/** TODO: Maybe when we implement the list of undo/redo available we dont need this. */
/**
 * @public
 */
export interface UndoRedoResponse {
  type: string;
}

/**
 * @public
 */
export interface CrdtStreamMessage {
  data: Uint8Array;
}

/**
 * @public
 */
export interface AssetData {
  data: Uint8Array;
}

/**
 * @public
 */
export interface GetFilesRequest {
  path: string;
  ignore: string[];
}

/**
 * @public
 */
export interface GetFilesResponse {
  files: GetFilesResponse_File[];
}

/**
 * @public
 */
export interface GetFilesResponse_File {
  path: string;
  content: Uint8Array;
}

/**
 * @public
 */
export interface SaveFileRequest {
  path: string;
  content: Uint8Array;
}

/**
 * @public
 */
export interface Asset {
  path: string;
}

/**
 * @public
 */
export interface AssetCatalogResponse {
  basePath: string;
  assets: Asset[];
}

/**
 * @public
 */
export interface ImportAssetRequest {
  basePath: string;
  assetPackageName: string;
  content: Map<string, Uint8Array>;
}

/**
 * @public
 */
export interface ImportAssetRequest_ContentEntry {
  key: string;
  value: Uint8Array;
}

/**
 * @public
 */
export interface InspectorPreferencesMessage {
  freeCameraInvertRotation: boolean;
  autosaveEnabled: boolean;
}

/**
 * @public
 */
export interface CopyFileRequest {
  fromPath: string;
  toPath: string;
}

/**
 * @public
 */
export interface GetFileRequest {
  path: string;
}

/**
 * @public
 */
export interface GetFileResponse {
  content: Uint8Array;
}

/**
 * @public
 */
export interface CreateCustomAssetRequest {
  name: string;
  composite: Uint8Array;
  resources: string[];
  thumbnail?: Uint8Array | undefined;
}

/**
 * @public
 */
export interface CreateCustomAssetResponse {
  asset: AssetData | undefined;
}

/**
 * @public
 */
export interface GetCustomAssetsResponse {
  assets: AssetData[];
}

/**
 * @public
 */
export interface DeleteCustomAssetRequest {
  assetId: string;
}

/**
 * @public
 */
export interface RenameCustomAssetRequest {
  assetId: string;
  newName: string;
}

function createBaseEmpty(): Empty {
  return {};
}

/**
 * @public
 */
export namespace Empty {
  export function encode(_: Empty, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    return writer;
  }

  export function decode(input: _m0.Reader | Uint8Array, length?: number): Empty {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEmpty();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  }

  export function fromJSON(_: any): Empty {
    return {};
  }

  export function toJSON(_: Empty): unknown {
    const obj: any = {};
    return obj;
  }

  export function create<I extends Exact<DeepPartial<Empty>, I>>(base?: I): Empty {
    return Empty.fromPartial(base ?? {});
  }

  export function fromPartial<I extends Exact<DeepPartial<Empty>, I>>(_: I): Empty {
    const message = createBaseEmpty();
    return message;
  }
}

function createBaseUndoRedoResponse(): UndoRedoResponse {
  return { type: "" };
}

/**
 * @public
 */
export namespace UndoRedoResponse {
  export function encode(message: UndoRedoResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.type !== "") {
      writer.uint32(10).string(message.type);
    }
    return writer;
  }

  export function decode(input: _m0.Reader | Uint8Array, length?: number): UndoRedoResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUndoRedoResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.type = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  }

  export function fromJSON(object: any): UndoRedoResponse {
    return { type: isSet(object.type) ? String(object.type) : "" };
  }

  export function toJSON(message: UndoRedoResponse): unknown {
    const obj: any = {};
    message.type !== undefined && (obj.type = message.type);
    return obj;
  }

  export function create<I extends Exact<DeepPartial<UndoRedoResponse>, I>>(base?: I): UndoRedoResponse {
    return UndoRedoResponse.fromPartial(base ?? {});
  }

  export function fromPartial<I extends Exact<DeepPartial<UndoRedoResponse>, I>>(object: I): UndoRedoResponse {
    const message = createBaseUndoRedoResponse();
    message.type = object.type ?? "";
    return message;
  }
}

function createBaseCrdtStreamMessage(): CrdtStreamMessage {
  return { data: new Uint8Array(0) };
}

/**
 * @public
 */
export namespace CrdtStreamMessage {
  export function encode(message: CrdtStreamMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.data.length !== 0) {
      writer.uint32(10).bytes(message.data);
    }
    return writer;
  }

  export function decode(input: _m0.Reader | Uint8Array, length?: number): CrdtStreamMessage {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseCrdtStreamMessage();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.data = reader.bytes();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  }

  export function fromJSON(object: any): CrdtStreamMessage {
    return { data: isSet(object.data) ? bytesFromBase64(object.data) : new Uint8Array(0) };
  }

  export function toJSON(message: CrdtStreamMessage): unknown {
    const obj: any = {};
    message.data !== undefined &&
      (obj.data = base64FromBytes(message.data !== undefined ? message.data : new Uint8Array(0)));
    return obj;
  }

  export function create<I extends Exact<DeepPartial<CrdtStreamMessage>, I>>(base?: I): CrdtStreamMessage {
    return CrdtStreamMessage.fromPartial(base ?? {});
  }

  export function fromPartial<I extends Exact<DeepPartial<CrdtStreamMessage>, I>>(object: I): CrdtStreamMessage {
    const message = createBaseCrdtStreamMessage();
    message.data = object.data ?? new Uint8Array(0);
    return message;
  }
}

function createBaseAssetData(): AssetData {
  return { data: new Uint8Array(0) };
}

/**
 * @public
 */
export namespace AssetData {
  export function encode(message: AssetData, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.data.length !== 0) {
      writer.uint32(10).bytes(message.data);
    }
    return writer;
  }

  export function decode(input: _m0.Reader | Uint8Array, length?: number): AssetData {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAssetData();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.data = reader.bytes();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  }

  export function fromJSON(object: any): AssetData {
    return { data: isSet(object.data) ? bytesFromBase64(object.data) : new Uint8Array(0) };
  }

  export function toJSON(message: AssetData): unknown {
    const obj: any = {};
    message.data !== undefined &&
      (obj.data = base64FromBytes(message.data !== undefined ? message.data : new Uint8Array(0)));
    return obj;
  }

  export function create<I extends Exact<DeepPartial<AssetData>, I>>(base?: I): AssetData {
    return AssetData.fromPartial(base ?? {});
  }

  export function fromPartial<I extends Exact<DeepPartial<AssetData>, I>>(object: I): AssetData {
    const message = createBaseAssetData();
    message.data = object.data ?? new Uint8Array(0);
    return message;
  }
}

function createBaseGetFilesRequest(): GetFilesRequest {
  return { path: "", ignore: [] };
}

/**
 * @public
 */
export namespace GetFilesRequest {
  export function encode(message: GetFilesRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.path !== "") {
      writer.uint32(10).string(message.path);
    }
    for (const v of message.ignore) {
      writer.uint32(18).string(v!);
    }
    return writer;
  }

  export function decode(input: _m0.Reader | Uint8Array, length?: number): GetFilesRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGetFilesRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.path = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.ignore.push(reader.string());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  }

  export function fromJSON(object: any): GetFilesRequest {
    return {
      path: isSet(object.path) ? String(object.path) : "",
      ignore: Array.isArray(object?.ignore) ? object.ignore.map((e: any) => String(e)) : [],
    };
  }

  export function toJSON(message: GetFilesRequest): unknown {
    const obj: any = {};
    message.path !== undefined && (obj.path = message.path);
    if (message.ignore) {
      obj.ignore = message.ignore.map((e) => e);
    } else {
      obj.ignore = [];
    }
    return obj;
  }

  export function create<I extends Exact<DeepPartial<GetFilesRequest>, I>>(base?: I): GetFilesRequest {
    return GetFilesRequest.fromPartial(base ?? {});
  }

  export function fromPartial<I extends Exact<DeepPartial<GetFilesRequest>, I>>(object: I): GetFilesRequest {
    const message = createBaseGetFilesRequest();
    message.path = object.path ?? "";
    message.ignore = object.ignore?.map((e) => e) || [];
    return message;
  }
}

function createBaseGetFilesResponse(): GetFilesResponse {
  return { files: [] };
}

/**
 * @public
 */
export namespace GetFilesResponse {
  export function encode(message: GetFilesResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.files) {
      GetFilesResponse_File.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  }

  export function decode(input: _m0.Reader | Uint8Array, length?: number): GetFilesResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGetFilesResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.files.push(GetFilesResponse_File.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  }

  export function fromJSON(object: any): GetFilesResponse {
    return {
      files: Array.isArray(object?.files) ? object.files.map((e: any) => GetFilesResponse_File.fromJSON(e)) : [],
    };
  }

  export function toJSON(message: GetFilesResponse): unknown {
    const obj: any = {};
    if (message.files) {
      obj.files = message.files.map((e) => e ? GetFilesResponse_File.toJSON(e) : undefined);
    } else {
      obj.files = [];
    }
    return obj;
  }

  export function create<I extends Exact<DeepPartial<GetFilesResponse>, I>>(base?: I): GetFilesResponse {
    return GetFilesResponse.fromPartial(base ?? {});
  }

  export function fromPartial<I extends Exact<DeepPartial<GetFilesResponse>, I>>(object: I): GetFilesResponse {
    const message = createBaseGetFilesResponse();
    message.files = object.files?.map((e) => GetFilesResponse_File.fromPartial(e)) || [];
    return message;
  }
}

function createBaseGetFilesResponse_File(): GetFilesResponse_File {
  return { path: "", content: new Uint8Array(0) };
}

/**
 * @public
 */
export namespace GetFilesResponse_File {
  export function encode(message: GetFilesResponse_File, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.path !== "") {
      writer.uint32(10).string(message.path);
    }
    if (message.content.length !== 0) {
      writer.uint32(18).bytes(message.content);
    }
    return writer;
  }

  export function decode(input: _m0.Reader | Uint8Array, length?: number): GetFilesResponse_File {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGetFilesResponse_File();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.path = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.content = reader.bytes();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  }

  export function fromJSON(object: any): GetFilesResponse_File {
    return {
      path: isSet(object.path) ? String(object.path) : "",
      content: isSet(object.content) ? bytesFromBase64(object.content) : new Uint8Array(0),
    };
  }

  export function toJSON(message: GetFilesResponse_File): unknown {
    const obj: any = {};
    message.path !== undefined && (obj.path = message.path);
    message.content !== undefined &&
      (obj.content = base64FromBytes(message.content !== undefined ? message.content : new Uint8Array(0)));
    return obj;
  }

  export function create<I extends Exact<DeepPartial<GetFilesResponse_File>, I>>(base?: I): GetFilesResponse_File {
    return GetFilesResponse_File.fromPartial(base ?? {});
  }

  export function fromPartial<I extends Exact<DeepPartial<GetFilesResponse_File>, I>>(
    object: I,
  ): GetFilesResponse_File {
    const message = createBaseGetFilesResponse_File();
    message.path = object.path ?? "";
    message.content = object.content ?? new Uint8Array(0);
    return message;
  }
}

function createBaseSaveFileRequest(): SaveFileRequest {
  return { path: "", content: new Uint8Array(0) };
}

/**
 * @public
 */
export namespace SaveFileRequest {
  export function encode(message: SaveFileRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.path !== "") {
      writer.uint32(10).string(message.path);
    }
    if (message.content.length !== 0) {
      writer.uint32(18).bytes(message.content);
    }
    return writer;
  }

  export function decode(input: _m0.Reader | Uint8Array, length?: number): SaveFileRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSaveFileRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.path = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.content = reader.bytes();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  }

  export function fromJSON(object: any): SaveFileRequest {
    return {
      path: isSet(object.path) ? String(object.path) : "",
      content: isSet(object.content) ? bytesFromBase64(object.content) : new Uint8Array(0),
    };
  }

  export function toJSON(message: SaveFileRequest): unknown {
    const obj: any = {};
    message.path !== undefined && (obj.path = message.path);
    message.content !== undefined &&
      (obj.content = base64FromBytes(message.content !== undefined ? message.content : new Uint8Array(0)));
    return obj;
  }

  export function create<I extends Exact<DeepPartial<SaveFileRequest>, I>>(base?: I): SaveFileRequest {
    return SaveFileRequest.fromPartial(base ?? {});
  }

  export function fromPartial<I extends Exact<DeepPartial<SaveFileRequest>, I>>(object: I): SaveFileRequest {
    const message = createBaseSaveFileRequest();
    message.path = object.path ?? "";
    message.content = object.content ?? new Uint8Array(0);
    return message;
  }
}

function createBaseAsset(): Asset {
  return { path: "" };
}

/**
 * @public
 */
export namespace Asset {
  export function encode(message: Asset, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.path !== "") {
      writer.uint32(10).string(message.path);
    }
    return writer;
  }

  export function decode(input: _m0.Reader | Uint8Array, length?: number): Asset {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAsset();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.path = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  }

  export function fromJSON(object: any): Asset {
    return { path: isSet(object.path) ? String(object.path) : "" };
  }

  export function toJSON(message: Asset): unknown {
    const obj: any = {};
    message.path !== undefined && (obj.path = message.path);
    return obj;
  }

  export function create<I extends Exact<DeepPartial<Asset>, I>>(base?: I): Asset {
    return Asset.fromPartial(base ?? {});
  }

  export function fromPartial<I extends Exact<DeepPartial<Asset>, I>>(object: I): Asset {
    const message = createBaseAsset();
    message.path = object.path ?? "";
    return message;
  }
}

function createBaseAssetCatalogResponse(): AssetCatalogResponse {
  return { basePath: "", assets: [] };
}

/**
 * @public
 */
export namespace AssetCatalogResponse {
  export function encode(message: AssetCatalogResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.basePath !== "") {
      writer.uint32(10).string(message.basePath);
    }
    for (const v of message.assets) {
      Asset.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  }

  export function decode(input: _m0.Reader | Uint8Array, length?: number): AssetCatalogResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAssetCatalogResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.basePath = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.assets.push(Asset.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  }

  export function fromJSON(object: any): AssetCatalogResponse {
    return {
      basePath: isSet(object.basePath) ? String(object.basePath) : "",
      assets: Array.isArray(object?.assets) ? object.assets.map((e: any) => Asset.fromJSON(e)) : [],
    };
  }

  export function toJSON(message: AssetCatalogResponse): unknown {
    const obj: any = {};
    message.basePath !== undefined && (obj.basePath = message.basePath);
    if (message.assets) {
      obj.assets = message.assets.map((e) => e ? Asset.toJSON(e) : undefined);
    } else {
      obj.assets = [];
    }
    return obj;
  }

  export function create<I extends Exact<DeepPartial<AssetCatalogResponse>, I>>(base?: I): AssetCatalogResponse {
    return AssetCatalogResponse.fromPartial(base ?? {});
  }

  export function fromPartial<I extends Exact<DeepPartial<AssetCatalogResponse>, I>>(object: I): AssetCatalogResponse {
    const message = createBaseAssetCatalogResponse();
    message.basePath = object.basePath ?? "";
    message.assets = object.assets?.map((e) => Asset.fromPartial(e)) || [];
    return message;
  }
}

function createBaseImportAssetRequest(): ImportAssetRequest {
  return { basePath: "", assetPackageName: "", content: new Map() };
}

/**
 * @public
 */
export namespace ImportAssetRequest {
  export function encode(message: ImportAssetRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.basePath !== "") {
      writer.uint32(10).string(message.basePath);
    }
    if (message.assetPackageName !== "") {
      writer.uint32(18).string(message.assetPackageName);
    }
    message.content.forEach((value, key) => {
      ImportAssetRequest_ContentEntry.encode({ key: key as any, value }, writer.uint32(26).fork()).ldelim();
    });
    return writer;
  }

  export function decode(input: _m0.Reader | Uint8Array, length?: number): ImportAssetRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseImportAssetRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.basePath = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.assetPackageName = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          const entry3 = ImportAssetRequest_ContentEntry.decode(reader, reader.uint32());
          if (entry3.value !== undefined) {
            message.content.set(entry3.key, entry3.value);
          }
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  }

  export function fromJSON(object: any): ImportAssetRequest {
    return {
      basePath: isSet(object.basePath) ? String(object.basePath) : "",
      assetPackageName: isSet(object.assetPackageName) ? String(object.assetPackageName) : "",
      content: isObject(object.content)
        ? Object.entries(object.content).reduce<Map<string, Uint8Array>>((acc, [key, value]) => {
          acc.set(key, bytesFromBase64(value as string));
          return acc;
        }, new Map())
        : new Map(),
    };
  }

  export function toJSON(message: ImportAssetRequest): unknown {
    const obj: any = {};
    message.basePath !== undefined && (obj.basePath = message.basePath);
    message.assetPackageName !== undefined && (obj.assetPackageName = message.assetPackageName);
    obj.content = {};
    if (message.content) {
      message.content.forEach((v, k) => {
        obj.content[k] = base64FromBytes(v);
      });
    }
    return obj;
  }

  export function create<I extends Exact<DeepPartial<ImportAssetRequest>, I>>(base?: I): ImportAssetRequest {
    return ImportAssetRequest.fromPartial(base ?? {});
  }

  export function fromPartial<I extends Exact<DeepPartial<ImportAssetRequest>, I>>(object: I): ImportAssetRequest {
    const message = createBaseImportAssetRequest();
    message.basePath = object.basePath ?? "";
    message.assetPackageName = object.assetPackageName ?? "";
    message.content = (() => {
      const m = new Map();
      (object.content as Map<string, Uint8Array> ?? new Map()).forEach((value, key) => {
        if (value !== undefined) {
          m.set(key, value);
        }
      });
      return m;
    })();
    return message;
  }
}

function createBaseImportAssetRequest_ContentEntry(): ImportAssetRequest_ContentEntry {
  return { key: "", value: new Uint8Array(0) };
}

/**
 * @public
 */
export namespace ImportAssetRequest_ContentEntry {
  export function encode(
    message: ImportAssetRequest_ContentEntry,
    writer: _m0.Writer = _m0.Writer.create(),
  ): _m0.Writer {
    if (message.key !== "") {
      writer.uint32(10).string(message.key);
    }
    if (message.value.length !== 0) {
      writer.uint32(18).bytes(message.value);
    }
    return writer;
  }

  export function decode(input: _m0.Reader | Uint8Array, length?: number): ImportAssetRequest_ContentEntry {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseImportAssetRequest_ContentEntry();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.key = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.value = reader.bytes();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  }

  export function fromJSON(object: any): ImportAssetRequest_ContentEntry {
    return {
      key: isSet(object.key) ? String(object.key) : "",
      value: isSet(object.value) ? bytesFromBase64(object.value) : new Uint8Array(0),
    };
  }

  export function toJSON(message: ImportAssetRequest_ContentEntry): unknown {
    const obj: any = {};
    message.key !== undefined && (obj.key = message.key);
    message.value !== undefined &&
      (obj.value = base64FromBytes(message.value !== undefined ? message.value : new Uint8Array(0)));
    return obj;
  }

  export function create<I extends Exact<DeepPartial<ImportAssetRequest_ContentEntry>, I>>(
    base?: I,
  ): ImportAssetRequest_ContentEntry {
    return ImportAssetRequest_ContentEntry.fromPartial(base ?? {});
  }

  export function fromPartial<I extends Exact<DeepPartial<ImportAssetRequest_ContentEntry>, I>>(
    object: I,
  ): ImportAssetRequest_ContentEntry {
    const message = createBaseImportAssetRequest_ContentEntry();
    message.key = object.key ?? "";
    message.value = object.value ?? new Uint8Array(0);
    return message;
  }
}

function createBaseInspectorPreferencesMessage(): InspectorPreferencesMessage {
  return { freeCameraInvertRotation: false, autosaveEnabled: false };
}

/**
 * @public
 */
export namespace InspectorPreferencesMessage {
  export function encode(message: InspectorPreferencesMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.freeCameraInvertRotation === true) {
      writer.uint32(8).bool(message.freeCameraInvertRotation);
    }
    if (message.autosaveEnabled === true) {
      writer.uint32(16).bool(message.autosaveEnabled);
    }
    return writer;
  }

  export function decode(input: _m0.Reader | Uint8Array, length?: number): InspectorPreferencesMessage {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseInspectorPreferencesMessage();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.freeCameraInvertRotation = reader.bool();
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.autosaveEnabled = reader.bool();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  }

  export function fromJSON(object: any): InspectorPreferencesMessage {
    return {
      freeCameraInvertRotation: isSet(object.freeCameraInvertRotation)
        ? Boolean(object.freeCameraInvertRotation)
        : false,
      autosaveEnabled: isSet(object.autosaveEnabled) ? Boolean(object.autosaveEnabled) : false,
    };
  }

  export function toJSON(message: InspectorPreferencesMessage): unknown {
    const obj: any = {};
    message.freeCameraInvertRotation !== undefined && (obj.freeCameraInvertRotation = message.freeCameraInvertRotation);
    message.autosaveEnabled !== undefined && (obj.autosaveEnabled = message.autosaveEnabled);
    return obj;
  }

  export function create<I extends Exact<DeepPartial<InspectorPreferencesMessage>, I>>(
    base?: I,
  ): InspectorPreferencesMessage {
    return InspectorPreferencesMessage.fromPartial(base ?? {});
  }

  export function fromPartial<I extends Exact<DeepPartial<InspectorPreferencesMessage>, I>>(
    object: I,
  ): InspectorPreferencesMessage {
    const message = createBaseInspectorPreferencesMessage();
    message.freeCameraInvertRotation = object.freeCameraInvertRotation ?? false;
    message.autosaveEnabled = object.autosaveEnabled ?? false;
    return message;
  }
}

function createBaseCopyFileRequest(): CopyFileRequest {
  return { fromPath: "", toPath: "" };
}

/**
 * @public
 */
export namespace CopyFileRequest {
  export function encode(message: CopyFileRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.fromPath !== "") {
      writer.uint32(10).string(message.fromPath);
    }
    if (message.toPath !== "") {
      writer.uint32(18).string(message.toPath);
    }
    return writer;
  }

  export function decode(input: _m0.Reader | Uint8Array, length?: number): CopyFileRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseCopyFileRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.fromPath = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.toPath = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  }

  export function fromJSON(object: any): CopyFileRequest {
    return {
      fromPath: isSet(object.fromPath) ? String(object.fromPath) : "",
      toPath: isSet(object.toPath) ? String(object.toPath) : "",
    };
  }

  export function toJSON(message: CopyFileRequest): unknown {
    const obj: any = {};
    message.fromPath !== undefined && (obj.fromPath = message.fromPath);
    message.toPath !== undefined && (obj.toPath = message.toPath);
    return obj;
  }

  export function create<I extends Exact<DeepPartial<CopyFileRequest>, I>>(base?: I): CopyFileRequest {
    return CopyFileRequest.fromPartial(base ?? {});
  }

  export function fromPartial<I extends Exact<DeepPartial<CopyFileRequest>, I>>(object: I): CopyFileRequest {
    const message = createBaseCopyFileRequest();
    message.fromPath = object.fromPath ?? "";
    message.toPath = object.toPath ?? "";
    return message;
  }
}

function createBaseGetFileRequest(): GetFileRequest {
  return { path: "" };
}

/**
 * @public
 */
export namespace GetFileRequest {
  export function encode(message: GetFileRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.path !== "") {
      writer.uint32(10).string(message.path);
    }
    return writer;
  }

  export function decode(input: _m0.Reader | Uint8Array, length?: number): GetFileRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGetFileRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.path = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  }

  export function fromJSON(object: any): GetFileRequest {
    return { path: isSet(object.path) ? String(object.path) : "" };
  }

  export function toJSON(message: GetFileRequest): unknown {
    const obj: any = {};
    message.path !== undefined && (obj.path = message.path);
    return obj;
  }

  export function create<I extends Exact<DeepPartial<GetFileRequest>, I>>(base?: I): GetFileRequest {
    return GetFileRequest.fromPartial(base ?? {});
  }

  export function fromPartial<I extends Exact<DeepPartial<GetFileRequest>, I>>(object: I): GetFileRequest {
    const message = createBaseGetFileRequest();
    message.path = object.path ?? "";
    return message;
  }
}

function createBaseGetFileResponse(): GetFileResponse {
  return { content: new Uint8Array(0) };
}

/**
 * @public
 */
export namespace GetFileResponse {
  export function encode(message: GetFileResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.content.length !== 0) {
      writer.uint32(10).bytes(message.content);
    }
    return writer;
  }

  export function decode(input: _m0.Reader | Uint8Array, length?: number): GetFileResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGetFileResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.content = reader.bytes();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  }

  export function fromJSON(object: any): GetFileResponse {
    return { content: isSet(object.content) ? bytesFromBase64(object.content) : new Uint8Array(0) };
  }

  export function toJSON(message: GetFileResponse): unknown {
    const obj: any = {};
    message.content !== undefined &&
      (obj.content = base64FromBytes(message.content !== undefined ? message.content : new Uint8Array(0)));
    return obj;
  }

  export function create<I extends Exact<DeepPartial<GetFileResponse>, I>>(base?: I): GetFileResponse {
    return GetFileResponse.fromPartial(base ?? {});
  }

  export function fromPartial<I extends Exact<DeepPartial<GetFileResponse>, I>>(object: I): GetFileResponse {
    const message = createBaseGetFileResponse();
    message.content = object.content ?? new Uint8Array(0);
    return message;
  }
}

function createBaseCreateCustomAssetRequest(): CreateCustomAssetRequest {
  return { name: "", composite: new Uint8Array(0), resources: [], thumbnail: undefined };
}

/**
 * @public
 */
export namespace CreateCustomAssetRequest {
  export function encode(message: CreateCustomAssetRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.name !== "") {
      writer.uint32(10).string(message.name);
    }
    if (message.composite.length !== 0) {
      writer.uint32(18).bytes(message.composite);
    }
    for (const v of message.resources) {
      writer.uint32(26).string(v!);
    }
    if (message.thumbnail !== undefined) {
      writer.uint32(34).bytes(message.thumbnail);
    }
    return writer;
  }

  export function decode(input: _m0.Reader | Uint8Array, length?: number): CreateCustomAssetRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseCreateCustomAssetRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.name = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.composite = reader.bytes();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.resources.push(reader.string());
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.thumbnail = reader.bytes();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  }

  export function fromJSON(object: any): CreateCustomAssetRequest {
    return {
      name: isSet(object.name) ? String(object.name) : "",
      composite: isSet(object.composite) ? bytesFromBase64(object.composite) : new Uint8Array(0),
      resources: Array.isArray(object?.resources) ? object.resources.map((e: any) => String(e)) : [],
      thumbnail: isSet(object.thumbnail) ? bytesFromBase64(object.thumbnail) : undefined,
    };
  }

  export function toJSON(message: CreateCustomAssetRequest): unknown {
    const obj: any = {};
    message.name !== undefined && (obj.name = message.name);
    message.composite !== undefined &&
      (obj.composite = base64FromBytes(message.composite !== undefined ? message.composite : new Uint8Array(0)));
    if (message.resources) {
      obj.resources = message.resources.map((e) => e);
    } else {
      obj.resources = [];
    }
    message.thumbnail !== undefined &&
      (obj.thumbnail = message.thumbnail !== undefined ? base64FromBytes(message.thumbnail) : undefined);
    return obj;
  }

  export function create<I extends Exact<DeepPartial<CreateCustomAssetRequest>, I>>(
    base?: I,
  ): CreateCustomAssetRequest {
    return CreateCustomAssetRequest.fromPartial(base ?? {});
  }

  export function fromPartial<I extends Exact<DeepPartial<CreateCustomAssetRequest>, I>>(
    object: I,
  ): CreateCustomAssetRequest {
    const message = createBaseCreateCustomAssetRequest();
    message.name = object.name ?? "";
    message.composite = object.composite ?? new Uint8Array(0);
    message.resources = object.resources?.map((e) => e) || [];
    message.thumbnail = object.thumbnail ?? undefined;
    return message;
  }
}

function createBaseCreateCustomAssetResponse(): CreateCustomAssetResponse {
  return { asset: undefined };
}

/**
 * @public
 */
export namespace CreateCustomAssetResponse {
  export function encode(message: CreateCustomAssetResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.asset !== undefined) {
      AssetData.encode(message.asset, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  }

  export function decode(input: _m0.Reader | Uint8Array, length?: number): CreateCustomAssetResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseCreateCustomAssetResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.asset = AssetData.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  }

  export function fromJSON(object: any): CreateCustomAssetResponse {
    return { asset: isSet(object.asset) ? AssetData.fromJSON(object.asset) : undefined };
  }

  export function toJSON(message: CreateCustomAssetResponse): unknown {
    const obj: any = {};
    message.asset !== undefined && (obj.asset = message.asset ? AssetData.toJSON(message.asset) : undefined);
    return obj;
  }

  export function create<I extends Exact<DeepPartial<CreateCustomAssetResponse>, I>>(
    base?: I,
  ): CreateCustomAssetResponse {
    return CreateCustomAssetResponse.fromPartial(base ?? {});
  }

  export function fromPartial<I extends Exact<DeepPartial<CreateCustomAssetResponse>, I>>(
    object: I,
  ): CreateCustomAssetResponse {
    const message = createBaseCreateCustomAssetResponse();
    message.asset = (object.asset !== undefined && object.asset !== null)
      ? AssetData.fromPartial(object.asset)
      : undefined;
    return message;
  }
}

function createBaseGetCustomAssetsResponse(): GetCustomAssetsResponse {
  return { assets: [] };
}

/**
 * @public
 */
export namespace GetCustomAssetsResponse {
  export function encode(message: GetCustomAssetsResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.assets) {
      AssetData.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  }

  export function decode(input: _m0.Reader | Uint8Array, length?: number): GetCustomAssetsResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGetCustomAssetsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.assets.push(AssetData.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  }

  export function fromJSON(object: any): GetCustomAssetsResponse {
    return { assets: Array.isArray(object?.assets) ? object.assets.map((e: any) => AssetData.fromJSON(e)) : [] };
  }

  export function toJSON(message: GetCustomAssetsResponse): unknown {
    const obj: any = {};
    if (message.assets) {
      obj.assets = message.assets.map((e) => e ? AssetData.toJSON(e) : undefined);
    } else {
      obj.assets = [];
    }
    return obj;
  }

  export function create<I extends Exact<DeepPartial<GetCustomAssetsResponse>, I>>(base?: I): GetCustomAssetsResponse {
    return GetCustomAssetsResponse.fromPartial(base ?? {});
  }

  export function fromPartial<I extends Exact<DeepPartial<GetCustomAssetsResponse>, I>>(
    object: I,
  ): GetCustomAssetsResponse {
    const message = createBaseGetCustomAssetsResponse();
    message.assets = object.assets?.map((e) => AssetData.fromPartial(e)) || [];
    return message;
  }
}

function createBaseDeleteCustomAssetRequest(): DeleteCustomAssetRequest {
  return { assetId: "" };
}

/**
 * @public
 */
export namespace DeleteCustomAssetRequest {
  export function encode(message: DeleteCustomAssetRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.assetId !== "") {
      writer.uint32(10).string(message.assetId);
    }
    return writer;
  }

  export function decode(input: _m0.Reader | Uint8Array, length?: number): DeleteCustomAssetRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDeleteCustomAssetRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.assetId = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  }

  export function fromJSON(object: any): DeleteCustomAssetRequest {
    return { assetId: isSet(object.assetId) ? String(object.assetId) : "" };
  }

  export function toJSON(message: DeleteCustomAssetRequest): unknown {
    const obj: any = {};
    message.assetId !== undefined && (obj.assetId = message.assetId);
    return obj;
  }

  export function create<I extends Exact<DeepPartial<DeleteCustomAssetRequest>, I>>(
    base?: I,
  ): DeleteCustomAssetRequest {
    return DeleteCustomAssetRequest.fromPartial(base ?? {});
  }

  export function fromPartial<I extends Exact<DeepPartial<DeleteCustomAssetRequest>, I>>(
    object: I,
  ): DeleteCustomAssetRequest {
    const message = createBaseDeleteCustomAssetRequest();
    message.assetId = object.assetId ?? "";
    return message;
  }
}

function createBaseRenameCustomAssetRequest(): RenameCustomAssetRequest {
  return { assetId: "", newName: "" };
}

/**
 * @public
 */
export namespace RenameCustomAssetRequest {
  export function encode(message: RenameCustomAssetRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.assetId !== "") {
      writer.uint32(10).string(message.assetId);
    }
    if (message.newName !== "") {
      writer.uint32(18).string(message.newName);
    }
    return writer;
  }

  export function decode(input: _m0.Reader | Uint8Array, length?: number): RenameCustomAssetRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRenameCustomAssetRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.assetId = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.newName = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  }

  export function fromJSON(object: any): RenameCustomAssetRequest {
    return {
      assetId: isSet(object.assetId) ? String(object.assetId) : "",
      newName: isSet(object.newName) ? String(object.newName) : "",
    };
  }

  export function toJSON(message: RenameCustomAssetRequest): unknown {
    const obj: any = {};
    message.assetId !== undefined && (obj.assetId = message.assetId);
    message.newName !== undefined && (obj.newName = message.newName);
    return obj;
  }

  export function create<I extends Exact<DeepPartial<RenameCustomAssetRequest>, I>>(
    base?: I,
  ): RenameCustomAssetRequest {
    return RenameCustomAssetRequest.fromPartial(base ?? {});
  }

  export function fromPartial<I extends Exact<DeepPartial<RenameCustomAssetRequest>, I>>(
    object: I,
  ): RenameCustomAssetRequest {
    const message = createBaseRenameCustomAssetRequest();
    message.assetId = object.assetId ?? "";
    message.newName = object.newName ?? "";
    return message;
  }
}

/**
 * @public
 */
export type DataServiceDefinition = typeof DataServiceDefinition;
/**
 * @public
 */

/**
 * @internal
 */
export const DataServiceDefinition = {
  name: "DataService",
  fullName: "DataService",
  methods: {
    crdtStream: {
      name: "CrdtStream",
      requestType: CrdtStreamMessage,
      requestStream: true,
      responseType: CrdtStreamMessage,
      responseStream: true,
      options: {},
    },
    undo: {
      name: "Undo",
      requestType: Empty,
      requestStream: false,
      responseType: UndoRedoResponse,
      responseStream: false,
      options: {},
    },
    redo: {
      name: "Redo",
      requestType: Empty,
      requestStream: false,
      responseType: UndoRedoResponse,
      responseStream: false,
      options: {},
    },
    getFiles: {
      name: "getFiles",
      requestType: GetFilesRequest,
      requestStream: false,
      responseType: GetFilesResponse,
      responseStream: false,
      options: {},
    },
    saveFile: {
      name: "saveFile",
      requestType: SaveFileRequest,
      requestStream: false,
      responseType: Empty,
      responseStream: false,
      options: {},
    },
    getAssetCatalog: {
      name: "GetAssetCatalog",
      requestType: Empty,
      requestStream: false,
      responseType: AssetCatalogResponse,
      responseStream: false,
      options: {},
    },
    getAssetData: {
      name: "GetAssetData",
      requestType: Asset,
      requestStream: false,
      responseType: AssetData,
      responseStream: false,
      options: {},
    },
    importAsset: {
      name: "ImportAsset",
      requestType: ImportAssetRequest,
      requestStream: false,
      responseType: Empty,
      responseStream: false,
      options: {},
    },
    removeAsset: {
      name: "RemoveAsset",
      requestType: Asset,
      requestStream: false,
      responseType: Empty,
      responseStream: false,
      options: {},
    },
    save: {
      name: "Save",
      requestType: Empty,
      requestStream: false,
      responseType: Empty,
      responseStream: false,
      options: {},
    },
    getInspectorPreferences: {
      name: "GetInspectorPreferences",
      requestType: Empty,
      requestStream: false,
      responseType: InspectorPreferencesMessage,
      responseStream: false,
      options: {},
    },
    setInspectorPreferences: {
      name: "SetInspectorPreferences",
      requestType: InspectorPreferencesMessage,
      requestStream: false,
      responseType: Empty,
      responseStream: false,
      options: {},
    },
    copyFile: {
      name: "CopyFile",
      requestType: CopyFileRequest,
      requestStream: false,
      responseType: Empty,
      responseStream: false,
      options: {},
    },
    getFile: {
      name: "GetFile",
      requestType: GetFileRequest,
      requestStream: false,
      responseType: GetFileResponse,
      responseStream: false,
      options: {},
    },
    createCustomAsset: {
      name: "CreateCustomAsset",
      requestType: CreateCustomAssetRequest,
      requestStream: false,
      responseType: CreateCustomAssetResponse,
      responseStream: false,
      options: {},
    },
    getCustomAssets: {
      name: "GetCustomAssets",
      requestType: Empty,
      requestStream: false,
      responseType: GetCustomAssetsResponse,
      responseStream: false,
      options: {},
    },
    deleteCustomAsset: {
      name: "DeleteCustomAsset",
      requestType: DeleteCustomAssetRequest,
      requestStream: false,
      responseType: Empty,
      responseStream: false,
      options: {},
    },
    renameCustomAsset: {
      name: "RenameCustomAsset",
      requestType: RenameCustomAssetRequest,
      requestStream: false,
      responseType: Empty,
      responseStream: false,
      options: {},
    },
  },
} as const;

declare const self: any | undefined;
declare const window: any | undefined;
declare const global: any | undefined;
const tsProtoGlobalThis: any = (() => {
  if (typeof globalThis !== "undefined") {
    return globalThis;
  }
  if (typeof self !== "undefined") {
    return self;
  }
  if (typeof window !== "undefined") {
    return window;
  }
  if (typeof global !== "undefined") {
    return global;
  }
  throw "Unable to locate global object";
})();

function bytesFromBase64(b64: string): Uint8Array {
  if (tsProtoGlobalThis.Buffer) {
    return Uint8Array.from(tsProtoGlobalThis.Buffer.from(b64, "base64"));
  } else {
    const bin = tsProtoGlobalThis.atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; ++i) {
      arr[i] = bin.charCodeAt(i);
    }
    return arr;
  }
}

function base64FromBytes(arr: Uint8Array): string {
  if (tsProtoGlobalThis.Buffer) {
    return tsProtoGlobalThis.Buffer.from(arr).toString("base64");
  } else {
    const bin: string[] = [];
    arr.forEach((byte) => {
      bin.push(String.fromCharCode(byte));
    });
    return tsProtoGlobalThis.btoa(bin.join(""));
  }
}

type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;

/**
 * @public
 */
export type DeepPartial<T> = T extends Builtin ? T
  : T extends Array<infer U> ? Array<DeepPartial<U>> : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>>
  : T extends { $case: string } ? { [K in keyof Omit<T, "$case">]?: DeepPartial<T[K]> } & { $case: T["$case"] }
  : T extends {} ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

type KeysOfUnion<T> = T extends T ? keyof T : never;
/**
 * @public
 */
export type Exact<P, I extends P> = P extends Builtin ? P
  : P & { [K in keyof P]: Exact<P[K], I[K]> } & { [K in Exclude<keyof I, KeysOfUnion<P>>]: never };

function isObject(value: any): boolean {
  return typeof value === "object" && value !== null;
}

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}
