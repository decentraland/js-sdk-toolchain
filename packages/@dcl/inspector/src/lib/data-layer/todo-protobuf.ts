/* eslint-disable */
import _m0 from "protobufjs/minimal";

export const protobufPackage = "decentraland.sdk.editor";

export interface StreamReqRes {
  data: Uint8Array;
}

export interface UndoReq {
}

export interface UndoResp {
}


function createBaseStreamReqRes(): StreamReqRes {
  return { data: new Uint8Array() };
}

export const StreamReqRes = {
  encode(message: StreamReqRes, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.data.length !== 0) {
      writer.uint32(10).bytes(message.data);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): StreamReqRes {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseStreamReqRes();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.data = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): StreamReqRes {
    return { data: isSet(object.data) ? bytesFromBase64(object.data) : new Uint8Array() };
  },

  toJSON(message: StreamReqRes): unknown {
    const obj: any = {};
    message.data !== undefined &&
      (obj.data = base64FromBytes(message.data !== undefined ? message.data : new Uint8Array()));
    return obj;
  },

  create<I extends Exact<DeepPartial<StreamReqRes>, I>>(base?: I): StreamReqRes {
    return StreamReqRes.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<StreamReqRes>, I>>(object: I): StreamReqRes {
    const message = createBaseStreamReqRes();
    message.data = object.data ?? new Uint8Array();
    return message;
  },
};

function createBaseUndoReq(): UndoReq {
  return {};
}

export const UndoReq = {
  encode(_: UndoReq, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): UndoReq {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUndoReq();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(_: any): UndoReq {
    return {};
  },

  toJSON(_: UndoReq): unknown {
    const obj: any = {};
    return obj;
  },

  create<I extends Exact<DeepPartial<UndoReq>, I>>(base?: I): UndoReq {
    return UndoReq.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<UndoReq>, I>>(_: I): UndoReq {
    const message = createBaseUndoReq();
    return message;
  },
};

function createBaseUndoResp(): UndoResp {
  return {};
}

export const UndoResp = {
  encode(_: UndoResp, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): UndoResp {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUndoResp();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(_: any): UndoResp {
    return {};
  },

  toJSON(_: UndoResp): unknown {
    const obj: any = {};
    return obj;
  },

  create<I extends Exact<DeepPartial<UndoResp>, I>>(base?: I): UndoResp {
    return UndoResp.fromPartial(base ?? {});
  },

  fromPartial<I extends Exact<DeepPartial<UndoResp>, I>>(_: I): UndoResp {
    const message = createBaseUndoResp();
    return message;
  },
};

export type DataServiceDefinition = typeof DataServiceDefinition;
export const DataServiceDefinition = {
  name: "DataService",
  fullName: "decentraland.sdk.editor.DataService",
  methods: {
    stream: {
      name: "Stream",
      requestType: StreamReqRes,
      requestStream: true,
      responseType: StreamReqRes,
      responseStream: true,
      options: {},
    },
    undo: {
      name: "Undo",
      requestType: UndoReq,
      requestStream: false,
      responseType: UndoResp,
      responseStream: false,
      options: {},
    },
  },
} as const;

declare var self: any | undefined;
declare var window: any | undefined;
declare var global: any | undefined;
var tsProtoGlobalThis: any = (() => {
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

export type DeepPartial<T> = T extends Builtin ? T
  : T extends Array<infer U> ? Array<DeepPartial<U>> : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>>
  : T extends { $case: string } ? { [K in keyof Omit<T, "$case">]?: DeepPartial<T[K]> } & { $case: T["$case"] }
  : T extends {} ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

type KeysOfUnion<T> = T extends T ? keyof T : never;
export type Exact<P, I extends P> = P extends Builtin ? P
  : P & { [K in keyof P]: Exact<P[K], I[K]> } & { [K in Exclude<keyof I, KeysOfUnion<P>>]: never };

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}
