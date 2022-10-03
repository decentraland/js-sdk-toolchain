/// <reference types="@dcl/posix" />

declare const enum ActionButton {
    POINTER = 0,
    PRIMARY = 1,
    SECONDARY = 2,
    ANY = 3,
    FORWARD = 4,
    BACKWARD = 5,
    RIGHT = 6,
    LEFT = 7,
    JUMP = 8,
    WALK = 9,
    ACTION_3 = 10,
    ACTION_4 = 11,
    ACTION_5 = 12,
    ACTION_6 = 13,
    UNRECOGNIZED = -1
}

/** @public */
declare const Animator: ComponentDefinition<ISchema<PBAnimator>, PBAnimator>;

/** @public */
declare const AudioSource: ComponentDefinition<ISchema<PBAudioSource>, PBAudioSource>;

declare const enum AvatarAnchorPoint {
    POSITION = 0,
    NAME_TAG = 1,
    LEFT_HAND = 2,
    RIGHT_HAND = 3,
    UNRECOGNIZED = -1
}

/** @public */
declare const AvatarAttach: ComponentDefinition<ISchema<PBAvatarAttach>, PBAvatarAttach>;

declare const enum AvatarModifier {
    HIDE_AVATARS = 0,
    DISABLE_PASSPORTS = 1,
    UNRECOGNIZED = -1
}

/** @public */
declare const AvatarModifierArea: ComponentDefinition<ISchema<PBAvatarModifierArea>, PBAvatarModifierArea>;

/** @public */
declare const AvatarShape: ComponentDefinition<ISchema<PBAvatarShape>, PBAvatarShape>;

/** @public */
declare const Billboard: ComponentDefinition<ISchema<PBBillboard>, PBBillboard>;

/** @public */
declare const BoxShape: ComponentDefinition<ISchema<PBBoxShape>, PBBoxShape>;

/**
 * @public
 */
declare type ByteBuffer = ReturnType<typeof createByteBuffer>;

/** @public */
declare const CameraMode: ComponentDefinition<ISchema<PBCameraMode>, PBCameraMode>;

/** @public */
declare const CameraModeArea: ComponentDefinition<ISchema<PBCameraModeArea>, PBCameraModeArea>;

declare const enum CameraModeValue {
    FIRST_PERSON = 0,
    THIRD_PERSON = 1,
    UNRECOGNIZED = -1
}

declare interface Color3 {
    r: number;
    g: number;
    b: number;
}

declare interface Color4 {
    r: number;
    g: number;
    b: number;
    a: number;
}

/**
 * @public
 */
declare type ComponentDefinition<T extends ISchema = ISchema<any>, ConstructorType = ComponentType<T>> = {
    _id: number;
    /**
     * Return the default value of the current component
     */
    default(): DeepReadonly<ComponentType<T>>;
    /**
     * Get if the entity has this component
     * @param entity
     *
     * Example:
     * ```ts
     * const myEntity = engine.addEntity()
     * Transform.has(myEntity) // return false
     * Transform.create(myEntity)
     * Transform.has(myEntity) // return true
     * ```
     */
    has(entity: Entity): boolean;
    /**
     * Get the readonly component of the entity (to mutate it, use getMutable instead), throw an error if the entity doesn't have the component.
     * @param entity
     * @return
     * Example:
     * ```ts
     * const myEntity = engine.addEntity()
     * Transform.create(myEntity)
     * const transform = Transform.get(myEntity) // return true
     * log(transform.position.x === 0) // log 'true'
     *
     * transform.position.y = 10 // illegal statement, to mutate the component use getMutable
     * ```
     *
     * ```ts
     * const otherEntity = engine.addEntity()
     * Transform.get(otherEntity) // throw an error!!
     * ```
     */
    get(entity: Entity): DeepReadonly<ComponentType<T>>;
    /**
     * Get the readonly component of the entity (to mutate it, use getMutable instead), or null if the entity doesn't have the component.
     * @param entity
     * @return
     *
     * Example:
     * ```ts
     * const otherEntity = engine.addEntity()
     * log(Transform.get(otherEntity) === null) // log 'true'
     * ```
     */
    getOrNull(entity: Entity): DeepReadonly<ComponentType<T>> | null;
    /**
     * Add the current component to an entity, throw an error if the component already exists (use `createOrReplace` instead).
     * - Internal comment: This method adds the <entity,component> to the list to be reviewed next frame
     * @param entity
     * @param val The initial value
     *
     * Example:
     * ```ts
     * const myEntity = engine.addEntity()
     * Transform.create(myEntity, { ...Transform.default(), position: {x: 4, y: 0, z: 4} }) // ok!
     * Transform.create(myEntity) // throw an error, the `Transform` component already exists in `myEntity`
     * ````
     */
    create(entity: Entity, val?: ConstructorType): ComponentType<T>;
    /**
     * Add the current component to an entity or replace the content if the entity already has the component
     * - Internal comment: This method adds the <entity,component> to the list to be reviewed next frame
     * @param entity
     * @param val The initial or new value
     *
     * Example:
     * ```ts
     * const myEntity = engine.addEntity()
     * Transform.create(myEntity) // ok!
     * Transform.createOrReplace(myEntity, { ...Transform.default(), position: {x: 4, y: 0, z: 4} }) // ok!
     * ````
     */
    createOrReplace(entity: Entity, val?: ComponentType<T>): ComponentType<T>;
    /**
     * Delete the current component to an entity, return null if the entity doesn't have the current component.
     * - Internal comment: This method adds the <entity,component> to the list to be reviewed next frame
     * @param entity
     *
     * Example:
     * ```ts
     * const myEntity = engine.addEntity()
     * Transform.create(myEntity) // ok!
     * Transform.deleteFrom(myEntity) // return the component
     * Transform.deleteFrom(myEntity) // return null
     * ````
     */
    deleteFrom(entity: Entity): ComponentType<T> | null;
    /**
     * Get the mutable component of the entity, throw an error if the entity doesn't have the component.
     * - Internal comment: This method adds the <entity,component> to the list to be reviewed next frame
     * @param entity
     *
     * Example:
     * ```ts
     * const myEntity = engine.addEntity()
     * Transform.create(myEntity)
     * Transform.getMutable(myEntity).position = {x: 4, y: 0, z: 4}
     * ````
     */
    getMutable(entity: Entity): ComponentType<T>;
    /**
     * Get the mutable component of the entity, return null if the entity doesn't have the component.
     * - Internal comment: This method adds the <entity,component> to the list to be reviewed next frame
     * @param entity
     *
     * Example:
     * ```ts
     * const transform = Transform.getMutableOrNull(myEntity)
     * if (transform) {
     *   transform.position = {x: 4, y: 0, z: 4}
     * }
     * ````
     */
    getMutableOrNull(entity: Entity): ComponentType<T> | null;
    writeToByteBuffer(entity: Entity, buffer: ByteBuffer): void;
};

/** @public */
declare namespace Components {
    /** @public */
    const Transform: ComponentDefinition<ISchema<TransformType>, Partial<TransformType>>;
    /** @public */
    const Animator: ComponentDefinition<ISchema<PBAnimator>, PBAnimator>;
    /** @public */
    const AudioSource: ComponentDefinition<ISchema<PBAudioSource>, PBAudioSource>;
    /** @public */
    const AvatarAttach: ComponentDefinition<ISchema<PBAvatarAttach>, PBAvatarAttach>;
    /** @public */
    const AvatarModifierArea: ComponentDefinition<ISchema<PBAvatarModifierArea>, PBAvatarModifierArea>;
    /** @public */
    const AvatarShape: ComponentDefinition<ISchema<PBAvatarShape>, PBAvatarShape>;
    /** @public */
    const Billboard: ComponentDefinition<ISchema<PBBillboard>, PBBillboard>;
    /** @public */
    const BoxShape: ComponentDefinition<ISchema<PBBoxShape>, PBBoxShape>;
    /** @public */
    const CameraMode: ComponentDefinition<ISchema<PBCameraMode>, PBCameraMode>;
    /** @public */
    const CameraModeArea: ComponentDefinition<ISchema<PBCameraModeArea>, PBCameraModeArea>;
    /** @public */
    const CylinderShape: ComponentDefinition<ISchema<PBCylinderShape>, PBCylinderShape>;
    /** @public */
    const GltfContainer: ComponentDefinition<ISchema<PBGltfContainer>, PBGltfContainer>;
    /** @public */
    const Material: ComponentDefinition<ISchema<PBMaterial>, PBMaterial>;
    /** @public */
    const MeshCollider: ComponentDefinition<ISchema<PBMeshCollider>, Partial<PBMeshCollider>>;
    /** @public */
    const MeshRenderer: ComponentDefinition<ISchema<PBMeshRenderer>, Partial<PBMeshRenderer>>;
    /** @public */
    const NFTShape: ComponentDefinition<ISchema<PBNFTShape>, PBNFTShape>;
    /** @public */
    const OnPointerDown: ComponentDefinition<ISchema<PBOnPointerDown>, PBOnPointerDown>;
    /** @public */
    const OnPointerDownResult: ComponentDefinition<ISchema<PBOnPointerDownResult>, PBOnPointerDownResult>;
    /** @public */
    const OnPointerUp: ComponentDefinition<ISchema<PBOnPointerUp>, PBOnPointerUp>;
    /** @public */
    const OnPointerUpResult: ComponentDefinition<ISchema<PBOnPointerUpResult>, PBOnPointerUpResult>;
    /** @public */
    const PlaneShape: ComponentDefinition<ISchema<PBPlaneShape>, PBPlaneShape>;
    /** @public */
    const PointerEvents: ComponentDefinition<ISchema<PBPointerEvents>, PBPointerEvents>;
    /** @public */
    const PointerEventsResult: ComponentDefinition<ISchema<PBPointerEventsResult>, PBPointerEventsResult>;
    /** @public */
    const PointerLock: ComponentDefinition<ISchema<PBPointerLock>, PBPointerLock>;
    /** @public */
    const Raycast: ComponentDefinition<ISchema<PBRaycast>, PBRaycast>;
    /** @public */
    const RaycastResult: ComponentDefinition<ISchema<PBRaycastResult>, PBRaycastResult>;
    /** @public */
    const SphereShape: ComponentDefinition<ISchema<PBSphereShape>, PBSphereShape>;
    /** @public */
    const TextShape: ComponentDefinition<ISchema<PBTextShape>, PBTextShape>;
    /** @public */
    const UiStyles: ComponentDefinition<ISchema<PBUiStyles>, PBUiStyles>;
    /** @public */
    const UiText: ComponentDefinition<ISchema<PBUiText>, PBUiText>;
    /** @public */
    const UiTransform: ComponentDefinition<ISchema<PBUiTransform>, PBUiTransform>;
    /** @public */
    const VisibilityComponent: ComponentDefinition<ISchema<PBVisibilityComponent>, PBVisibilityComponent>;
}

/**
 * @public
 */
declare type ComponentSchema<T extends [ComponentDefinition, ...ComponentDefinition[]]> = {
    [K in keyof T]: T[K] extends ComponentDefinition ? ReturnType<T[K]['getMutable']> : never;
};

/**
 * @public
 */
declare type ComponentType<T extends ISchema> = EcsResult<T>;

/**
 * ByteBuffer is a wrapper of DataView which also adds a read and write offset.
 *  Also in a write operation it resizes the buffer is being used if it needs.
 *
 * - Use read and write function to generate or consume data.
 * - Use set and get only if you are sure that you're doing.
 */
declare function createByteBuffer(options?: CreateByteBufferOptions): {
    /**
     * @returns The entire current Uint8Array.
     *
     * WARNING: if the buffer grows, the view had changed itself,
     *  and the reference will be a invalid one.
     */
    buffer(): Uint8Array;
    /**
     * @returns The capacity of the current buffer
     */
    bufferLength(): number;
    /**
     * Resets byteBuffer to avoid creating a new one
     */
    resetBuffer(): void;
    /**
     * @returns The current read offset
     */
    currentReadOffset(): number;
    /**
     * @returns The current write offset
     */
    currentWriteOffset(): number;
    /**
     * Reading purpose
     * Returns the previuos offsset size before incrementing
     */
    incrementReadOffset(amount: number): number;
    /**
     * @returns How many bytes are available to read.
     */
    remainingBytes(): number;
    readFloat32(): number;
    readFloat64(): number;
    readInt8(): number;
    readInt16(): number;
    readInt32(): number;
    readInt64(): bigint;
    readUint8(): number;
    readUint16(): number;
    readUint32(): number;
    readUint64(): bigint;
    readBuffer(): Uint8Array;
    /**
     * Writing purpose
     */
    /**
     * Increment offset
     * @param amount - how many bytes
     * @returns The offset when this reserving starts.
     */
    incrementWriteOffset(amount: number): number;
    /**
     * @returns The total number of bytes writen in the buffer.
     */
    size(): number;
    /**
     * Take care using this function, if you modify the data after, the
     * returned subarray will change too. If you'll modify the content of the
     * bytebuffer, maybe you want to use toCopiedBinary()
     *
     * @returns The subarray from 0 to offset as reference.
     */
    toBinary(): Uint8Array;
    /**
     * Safe copied buffer of the current data of ByteBuffer
     *
     * @returns The subarray from 0 to offset.
     */
    toCopiedBinary(): Uint8Array;
    writeBuffer(value: Uint8Array, writeLength?: boolean): void;
    writeFloat32(value: number): void;
    writeFloat64(value: number): void;
    writeInt8(value: number): void;
    writeInt16(value: number): void;
    writeInt32(value: number): void;
    writeInt64(value: bigint): void;
    writeUint8(value: number): void;
    writeUint16(value: number): void;
    writeUint32(value: number): void;
    writeUint64(value: bigint): void;
    getFloat32(offset: number): number;
    getFloat64(offset: number): number;
    getInt8(offset: number): number;
    getInt16(offset: number): number;
    getInt32(offset: number): number;
    getInt64(offset: number): bigint;
    getUint8(offset: number): number;
    getUint16(offset: number): number;
    getUint32(offset: number): number;
    getUint64(offset: number): bigint;
    setFloat32(offset: number, value: number): void;
    setFloat64(offset: number, value: number): void;
    setInt8(offset: number, value: number): void;
    setInt16(offset: number, value: number): void;
    setInt32(offset: number, value: number): void;
    setInt64(offset: number, value: bigint): void;
    setUint8(offset: number, value: number): void;
    setUint16(offset: number, value: number): void;
    setUint32(offset: number, value: number): void;
    setUint64(offset: number, value: bigint): void;
};

/**
 * @param writing - writing option, see object specs.
 * @param reading - reading option, see object specs.
 * @param initialCapacity - Initial capacity of buffer to allocate, ignored if you use writing or reading options
 */
declare interface CreateByteBufferOptions {
    /**
     * @param buffer - a buffer already allocated to read from there.
     * @param currentOffset - set the cursor where begins to read. Default 0
     * @param length - delimite where the valid data ends. Default: buffer.length
     */
    reading?: {
        buffer: Uint8Array;
        length?: number;
        currentOffset: number;
    };
    /**
     * @param buffer - a buffer already allocated to write there.
     * @param currentOffset - set the cursor to not start writing from the begin of it. Default 0
     */
    writing?: {
        buffer: Uint8Array;
        currentOffset?: number;
    };
    initialCapacity?: number;
}

/**
 * Transform parenting: cyclic dependency checker
 * It checks only in modified Transforms
 *
 * Add this system with:
 * ```ts
 *  engine.addSystem(cyclicParentingChecker(engine))
 * ````
 * And then it will check every tick the parenting.
 *
 * @public
 *
 * @params engine
 * @returns a system
 */
declare function cyclicParentingChecker(engine: IEngine): () => void;

/** @public */
declare const CylinderShape: ComponentDefinition<ISchema<PBCylinderShape>, PBCylinderShape>;

/**
 * @public
 */
declare type DeepReadonly<T> = T extends ReadonlyPrimitive ? T : T extends Map<infer K, infer V> ? DeepReadonlyMap<K, V> : T extends Set<infer M> ? DeepReadonlySet<M> : DeepReadonlyObject<T>;

/**
 * @public
 */
declare type DeepReadonlyMap<K, V> = ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>;

/**
 * @public
 */
declare type DeepReadonlyObject<T> = {
    readonly [K in keyof T]: DeepReadonly<T[K]>;
};

/**
 * @public
 */
declare type DeepReadonlySet<T> = ReadonlySet<DeepReadonly<T>>;

declare function defineSdkComponents(engine: PreEngine): {
    Transform: ComponentDefinition<ISchema<TransformType>, Partial<TransformType>>;
    MeshRenderer: ComponentDefinition<ISchema<PBMeshRenderer>, Partial<PBMeshRenderer>>;
    MeshCollider: ComponentDefinition<ISchema<PBMeshCollider>, Partial<PBMeshCollider>>;
    Animator: ComponentDefinition<ISchema<PBAnimator>, PBAnimator>;
    AudioSource: ComponentDefinition<ISchema<PBAudioSource>, PBAudioSource>;
    AvatarAttach: ComponentDefinition<ISchema<PBAvatarAttach>, PBAvatarAttach>;
    AvatarModifierArea: ComponentDefinition<ISchema<PBAvatarModifierArea>, PBAvatarModifierArea>;
    AvatarShape: ComponentDefinition<ISchema<PBAvatarShape>, PBAvatarShape>;
    Billboard: ComponentDefinition<ISchema<PBBillboard>, PBBillboard>;
    BoxShape: ComponentDefinition<ISchema<PBBoxShape>, PBBoxShape>;
    CameraMode: ComponentDefinition<ISchema<PBCameraMode>, PBCameraMode>;
    CameraModeArea: ComponentDefinition<ISchema<PBCameraModeArea>, PBCameraModeArea>;
    CylinderShape: ComponentDefinition<ISchema<PBCylinderShape>, PBCylinderShape>;
    GltfContainer: ComponentDefinition<ISchema<PBGltfContainer>, PBGltfContainer>;
    Material: ComponentDefinition<ISchema<PBMaterial>, PBMaterial>;
    NFTShape: ComponentDefinition<ISchema<PBNFTShape>, PBNFTShape>;
    OnPointerDown: ComponentDefinition<ISchema<PBOnPointerDown>, PBOnPointerDown>;
    OnPointerDownResult: ComponentDefinition<ISchema<PBOnPointerDownResult>, PBOnPointerDownResult>;
    OnPointerUp: ComponentDefinition<ISchema<PBOnPointerUp>, PBOnPointerUp>;
    OnPointerUpResult: ComponentDefinition<ISchema<PBOnPointerUpResult>, PBOnPointerUpResult>;
    PlaneShape: ComponentDefinition<ISchema<PBPlaneShape>, PBPlaneShape>;
    PointerEvents: ComponentDefinition<ISchema<PBPointerEvents>, PBPointerEvents>;
    PointerEventsResult: ComponentDefinition<ISchema<PBPointerEventsResult>, PBPointerEventsResult>;
    PointerLock: ComponentDefinition<ISchema<PBPointerLock>, PBPointerLock>;
    Raycast: ComponentDefinition<ISchema<PBRaycast>, PBRaycast>;
    RaycastResult: ComponentDefinition<ISchema<PBRaycastResult>, PBRaycastResult>;
    SphereShape: ComponentDefinition<ISchema<PBSphereShape>, PBSphereShape>;
    TextShape: ComponentDefinition<ISchema<PBTextShape>, PBTextShape>;
    UiStyles: ComponentDefinition<ISchema<PBUiStyles>, PBUiStyles>;
    UiText: ComponentDefinition<ISchema<PBUiText>, PBUiText>;
    UiTransform: ComponentDefinition<ISchema<PBUiTransform>, PBUiTransform>;
    VisibilityComponent: ComponentDefinition<ISchema<PBVisibilityComponent>, PBVisibilityComponent>;
};

/**
 * Constant used to convert from Euler degrees to radians
 * @public
 */
declare const DEG2RAD: number;

/**
 * @public
 */
declare type EcsResult<T extends ISchema> = T extends ISchema ? ReturnType<T['deserialize']> : never;

/**
 * @public
 */
declare function Engine({ transports }?: IEngineParams): IEngine;

declare const engine: IEngine;

/**
 * @public
 */
declare type Entity = number & {
    [entitySymbol]: true;
};

declare const entitySymbol: unique symbol;

declare const error: (message: string | Error, data?: any) => void;

/** Excludes property keys from T where the property is assignable to U */
declare type ExcludeUndefined<T> = {
    [P in keyof T]: undefined extends T[P] ? never : P;
}[keyof T];

declare const enum FilterMode {
    Point = 0,
    Bilinear = 1,
    Trilinear = 2,
    UNRECOGNIZED = -1
}

/** @public */
declare type FloatArray = number[];

declare const enum Font {
    LiberationSans = 0,
    SansSerif = 1,
    UNRECOGNIZED = -1
}

/** @public */
declare const GltfContainer: ComponentDefinition<ISchema<PBGltfContainer>, PBGltfContainer>;

/**
 * @public
 */
declare function IArray<T>(type: ISchema<T>): ISchema<Array<T>>;

/**
 * @public
 */
declare type IEngine = {
    /**
     * Increment the used entity counter and return the next one.
     * @param dynamic
     * @return the next entity unused
     */
    addEntity(dynamic?: boolean): Entity;
    /**
     * An alias of engine.addEntity(true)
     */
    addDynamicEntity(): Entity;
    /**
     * Remove all components of an entity
     * @param entity
     */
    removeEntity(entity: Entity): void;
    /**
     * Add the system to the engine. It will be called every tick updated.
     * @param system function that receives the delta time between last tick and current one.
     * @param priority a number with the priority, big number are called before smaller ones
     * @param name optional: a unique name to identify it
     *
     * Example:
     * ```ts
     * function mySystem(dt: number) {
     *   const entitiesWithBoxShapes = engine.getEntitiesWith(BoxShape, Transform)
     *   for (const [entity, _boxShape, _transform] of engine.getEntitiesWith(BoxShape, Transform)) {
     *     // do stuffs
     *   }
     * }
     * engine.addSystem(mySystem, 10)
     * ```
     */
    addSystem(system: SystemFn, priority?: number, name?: string): void;
    /**
     * Remove a system from the engine.
     * @param selector the function or the unique name to identify
     * @returns if it was found and removed
     */
    removeSystem(selector: string | SystemFn): boolean;
    /**
     * Define a component and add it to the engine.
     * @param spec An object with schema fields
     * @param componentId unique id to identify the component, if the component id already exist, it will fail.
     * @param constructorDefault the initial value prefilled when a component is created without a value
     * @return The component definition
     *
     * ```ts
     * const DoorComponentId = 10017
     * const Door = engine.defineComponent({
     *   id: Schemas.Int,
     *   name: Schemas.String
     * }, DoorComponentId)
     *
     * ```
     */
    defineComponent<T extends Spec, ConstructorType = Partial<Result<T>>>(spec: T, componentId: number, constructorDefault?: ConstructorType): ComponentDefinition<ISchema<Result<T>>, Partial<Result<T>>>;
    /**
     * Define a component and add it to the engine.
     * @param spec An object with schema fields
     * @param componentId unique id to identify the component, if the component id already exist, it will fail.
     * @return The component definition
     *
     * ```ts
     * const StateComponentId = 10023
     * const StateComponent = engine.defineComponent(Schemas.Bool, VisibleComponentId)
     * ```
     */
    defineComponentFromSchema<T extends ISchema<Record<string, any>>, ConstructorType = ComponentType<T>>(spec: T, componentId: number, constructorDefault?: ConstructorType): ComponentDefinition<T, ConstructorType>;
    /**
     * Get the component definition from the component id.
     * @param componentId
     * @return the component definition, throw an error if it doesn't exist
     * ```ts
     * const StateComponentId = 10023
     * const StateComponent = engine.getComponent(StateComponentId)
     * ```
     */
    getComponent<T extends ISchema>(componentId: number): ComponentDefinition<T>;
    /**
     * Get a iterator of entities that has all the component requested.
     * @param components a list of component definitions
     * @return An iterator of an array with the [entity, component1, component2, ...]
     *
     * Example:
     * ```ts
     * for (const [entity, boxShape, transform] of engine.getEntitiesWith(BoxShape, Transform)) {
     *   // the properties of boxShape and transform are read only
     * }
     * ```
     */
    getEntitiesWith<T extends [ComponentDefinition, ...ComponentDefinition[]]>(...components: T): Iterable<[Entity, ...ReadonlyComponentSchema<T>]>;
    /**
     * @public
     * Refer to the root of the scene, all Transforms without a parent are parenting with RootEntity.
     */
    RootEntity: Entity;
    /**
     * @public
     * The current player entity
     */
    PlayerEntity: Entity;
    /**
     * @public
     * Camera entity of current player.
     */
    CameraEntity: Entity;
    baseComponents: SdkComponents;
};

/**
 * @public
 */
declare type IEngineParams = {
    transports?: Transport[];
};

/**
 * @public
 */
declare function IEnum<T>(type: ISchema<any>): ISchema<T>;

/**
 * @public
 */
declare function IMap<T extends Spec>(spec: T): ISchema<Result<T>>;

/** Include property keys from T where the property is assignable to U */
declare type IncludeUndefined<T> = {
    [P in keyof T]: undefined extends T[P] ? P : never;
}[keyof T];

/**
 * @public
 */
declare function IOptional<T>(spec: ISchema<T>): ISchema<T | undefined>;

/**
 * @public
 */
declare type ISchema<T = any> = {
    serialize(value: T, builder: ByteBuffer): void;
    deserialize(reader: ByteBuffer): T;
    create(): T;
};

/**
 * Check if a pointer event has been emited in the last tick-update.
 * @param entity the entity to query, for global clicks use `engine.RootEntity`
 * @param actionButton
 * @param pointerEventType
 * @returns
 */
declare function isPointerEventActive(entity: Entity, actionButton: ActionButton, pointerEventType: PointerEventType): boolean;

declare function isPointerEventActiveGenerator(engine: IEngine): (entity: Entity, actionButton: ActionButton, pointerEventType: PointerEventType) => boolean;

declare const log: (...a: any[]) => void;

/** @public */
declare const Material: ComponentDefinition<ISchema<PBMaterial>, PBMaterial>;

/**
 * Class used to store matrix data (4x4)
 * @public
 */
declare namespace Matrix {
    type Matrix4x4 = [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number
    ];
    type MutableMatrix = {
        /**
         * Gets the update flag of the matrix which is an unique number for the matrix.
         * It will be incremented every time the matrix data change.
         * You can use it to speed the comparison between two versions of the same matrix.
         */
        updateFlag: number;
        isIdentity: boolean;
        isIdentity3x2: boolean;
        _isIdentityDirty: boolean;
        _isIdentity3x2Dirty: boolean;
        _m: Matrix4x4;
    };
    type ReadonlyMatrix = {
        /**
         * Gets the update flag of the matrix which is an unique number for the matrix.
         * It will be incremented every time the matrix data change.
         * You can use it to speed the comparison between two versions of the same matrix.
         */
        readonly updateFlag: number;
        readonly isIdentity: boolean;
        readonly isIdentity3x2: boolean;
        readonly _isIdentityDirty: boolean;
        readonly _isIdentity3x2Dirty: boolean;
        readonly _m: Matrix4x4;
    };
    /**
     * Gets the internal data of the matrix
     */
    function m(self: MutableMatrix): Matrix4x4;
    /**
     * Gets an identity matrix that must not be updated
     */
    function IdentityReadOnly(): ReadonlyMatrix;
    /**
     * Creates an empty matrix (filled with zeros)
     */
    function create(): MutableMatrix;
    /**
     * Creates a matrix from an array
     * @param array - defines the source array
     * @param offset - defines an offset in the source array
     * @returns a new Matrix set from the starting index of the given array
     */
    function fromArray(array: Matrix4x4, offset?: number): MutableMatrix;
    /**
     * Copy the content of an array into a given matrix
     * @param array - defines the source array
     * @param offset - defines an offset in the source array
     * @param result - defines the target matrix
     */
    function fromArrayToRef(array: Matrix4x4, offset: number, result: MutableMatrix): void;
    /**
     * Stores an array into a matrix after having multiplied each component by a given factor
     * @param array - defines the source array
     * @param offset - defines the offset in the source array
     * @param scale - defines the scaling factor
     * @param result - defines the target matrix
     */
    function fromFloatArrayToRefScaled(array: FloatArray, offset: number, scale: number, result: MutableMatrix): void;
    /**
     * Stores a list of values (16) inside a given matrix
     * @param initialM11 - defines 1st value of 1st row
     * @param initialM12 - defines 2nd value of 1st row
     * @param initialM13 - defines 3rd value of 1st row
     * @param initialM14 - defines 4th value of 1st row
     * @param initialM21 - defines 1st value of 2nd row
     * @param initialM22 - defines 2nd value of 2nd row
     * @param initialM23 - defines 3rd value of 2nd row
     * @param initialM24 - defines 4th value of 2nd row
     * @param initialM31 - defines 1st value of 3rd row
     * @param initialM32 - defines 2nd value of 3rd row
     * @param initialM33 - defines 3rd value of 3rd row
     * @param initialM34 - defines 4th value of 3rd row
     * @param initialM41 - defines 1st value of 4th row
     * @param initialM42 - defines 2nd value of 4th row
     * @param initialM43 - defines 3rd value of 4th row
     * @param initialM44 - defines 4th value of 4th row
     * @param result - defines the target matrix
     */
    function fromValuesToRef(initialM11: number, initialM12: number, initialM13: number, initialM14: number, initialM21: number, initialM22: number, initialM23: number, initialM24: number, initialM31: number, initialM32: number, initialM33: number, initialM34: number, initialM41: number, initialM42: number, initialM43: number, initialM44: number, result: MutableMatrix): void;
    /**
     * Creates new matrix from a list of values (16)
     * @param initialM11 - defines 1st value of 1st row
     * @param initialM12 - defines 2nd value of 1st row
     * @param initialM13 - defines 3rd value of 1st row
     * @param initialM14 - defines 4th value of 1st row
     * @param initialM21 - defines 1st value of 2nd row
     * @param initialM22 - defines 2nd value of 2nd row
     * @param initialM23 - defines 3rd value of 2nd row
     * @param initialM24 - defines 4th value of 2nd row
     * @param initialM31 - defines 1st value of 3rd row
     * @param initialM32 - defines 2nd value of 3rd row
     * @param initialM33 - defines 3rd value of 3rd row
     * @param initialM34 - defines 4th value of 3rd row
     * @param initialM41 - defines 1st value of 4th row
     * @param initialM42 - defines 2nd value of 4th row
     * @param initialM43 - defines 3rd value of 4th row
     * @param initialM44 - defines 4th value of 4th row
     * @returns the new matrix
     */
    function fromValues(initialM11: number, initialM12: number, initialM13: number, initialM14: number, initialM21: number, initialM22: number, initialM23: number, initialM24: number, initialM31: number, initialM32: number, initialM33: number, initialM34: number, initialM41: number, initialM42: number, initialM43: number, initialM44: number): MutableMatrix;
    /**
     * Creates a new matrix composed by merging scale (vector3), rotation (quaternion) and translation (vector3)
     * @param scale - defines the scale vector3
     * @param rotation - defines the rotation quaternion
     * @param translation - defines the translation vector3
     * @returns a new matrix
     */
    function compose(scale: Vector3.ReadonlyVector3, rotation: Quaternion.ReadonlyQuaternion, translation: Vector3.ReadonlyVector3): MutableMatrix;
    /**
     * Sets a matrix to a value composed by merging scale (vector3), rotation (quaternion) and translation (vector3)
     * @param scale - defines the scale vector3
     * @param rotation - defines the rotation quaternion
     * @param translation - defines the translation vector3
     * @param result - defines the target matrix
     */
    function composeToRef(scale: Vector3.ReadonlyVector3, rotation: Quaternion.ReadonlyQuaternion, translation: Vector3.ReadonlyVector3, result: MutableMatrix): void;
    /**
     * Creates a new identity matrix
     * @returns a new identity matrix
     */
    function Identity(): MutableMatrix;
    /**
     * Creates a new identity matrix and stores the result in a given matrix
     * @param result - defines the target matrix
     */
    function IdentityToRef(result: MutableMatrix): void;
    /**
     * Creates a new zero matrix
     * @returns a new zero matrix
     */
    function Zero(): MutableMatrix;
    /**
     * Creates a new rotation matrix for "angle" radians around the X axis
     * @param angle - defines the angle (in radians) to use
     * @returns the new matrix
     */
    function RotationX(angle: number): MutableMatrix;
    /**
     * Creates a new rotation matrix for "angle" radians around the X axis and stores it in a given matrix
     * @param angle - defines the angle (in radians) to use
     * @param result - defines the target matrix
     */
    function rotationXToRef(angle: number, result: MutableMatrix): void;
    /**
     * Creates a new rotation matrix for "angle" radians around the Y axis
     * @param angle - defines the angle (in radians) to use
     * @returns the new matrix
     */
    function rotationY(angle: number): MutableMatrix;
    /**
     * Creates a new rotation matrix for "angle" radians around the Y axis and stores it in a given matrix
     * @param angle - defines the angle (in radians) to use
     * @param result - defines the target matrix
     */
    function rotationYToRef(angle: number, result: MutableMatrix): void;
    /**
     * Creates a new rotation matrix for "angle" radians around the Z axis
     * @param angle - defines the angle (in radians) to use
     * @returns the new matrix
     */
    function rotationZ(angle: number): MutableMatrix;
    /**
     * Creates a new rotation matrix for "angle" radians around the Z axis and stores it in a given matrix
     * @param angle - defines the angle (in radians) to use
     * @param result - defines the target matrix
     */
    function rotationZToRef(angle: number, result: MutableMatrix): void;
    /**
     * Creates a new rotation matrix for "angle" radians around the given axis
     * @param axis - defines the axis to use
     * @param angle - defines the angle (in radians) to use
     * @returns the new matrix
     */
    function rotationAxis(axis: Vector3.ReadonlyVector3, angle: number): MutableMatrix;
    /**
     * Creates a new rotation matrix for "angle" radians around the given axis and stores it in a given matrix
     * @param axis - defines the axis to use
     * @param angle - defines the angle (in radians) to use
     * @param result - defines the target matrix
     */
    function rotationAxisToRef(_axis: Vector3.ReadonlyVector3, angle: number, result: MutableMatrix): void;
    /**
     * Creates a rotation matrix
     * @param yaw - defines the yaw angle in radians (Y axis)
     * @param pitch - defines the pitch angle in radians (X axis)
     * @param roll - defines the roll angle in radians (X axis)
     * @returns the new rotation matrix
     */
    function rotationYawPitchRoll(yaw: number, pitch: number, roll: number): MutableMatrix;
    /**
     * Creates a rotation matrix and stores it in a given matrix
     * @param yaw - defines the yaw angle in radians (Y axis)
     * @param pitch - defines the pitch angle in radians (X axis)
     * @param roll - defines the roll angle in radians (X axis)
     * @param result - defines the target matrix
     */
    function rotationYawPitchRollToRef(yaw: number, pitch: number, roll: number, result: MutableMatrix): void;
    /**
     * Creates a scaling matrix
     * @param x - defines the scale factor on X axis
     * @param y - defines the scale factor on Y axis
     * @param z - defines the scale factor on Z axis
     * @returns the new matrix
     */
    function scaling(x: number, y: number, z: number): MutableMatrix;
    /**
     * Creates a scaling matrix and stores it in a given matrix
     * @param x - defines the scale factor on X axis
     * @param y - defines the scale factor on Y axis
     * @param z - defines the scale factor on Z axis
     * @param result - defines the target matrix
     */
    function scalingToRef(x: number, y: number, z: number, result: MutableMatrix): void;
    /**
     * Creates a translation matrix
     * @param x - defines the translation on X axis
     * @param y - defines the translation on Y axis
     * @param z - defines the translationon Z axis
     * @returns the new matrix
     */
    function translation(x: number, y: number, z: number): MutableMatrix;
    /**
     * Creates a translation matrix and stores it in a given matrix
     * @param x - defines the translation on X axis
     * @param y - defines the translation on Y axis
     * @param z - defines the translationon Z axis
     * @param result - defines the target matrix
     */
    function translationToRef(x: number, y: number, z: number, result: MutableMatrix): void;
    /**
     * Returns a new Matrix whose values are the interpolated values for "gradient" (float) between the ones of the matrices "startValue" and "endValue".
     * @param startValue - defines the start value
     * @param endValue - defines the end value
     * @param gradient - defines the gradient factor
     * @returns the new matrix
     */
    function lerp(startValue: ReadonlyMatrix, endValue: ReadonlyMatrix, gradient: number): MutableMatrix;
    /**
     * Set the given matrix "result" as the interpolated values for "gradient" (float) between the ones of the matrices "startValue" and "endValue".
     * @param startValue - defines the start value
     * @param endValue - defines the end value
     * @param gradient - defines the gradient factor
     * @param result - defines the Matrix object where to store data
     */
    function lerpToRef(startValue: ReadonlyMatrix, endValue: ReadonlyMatrix, gradient: number, result: MutableMatrix): void;
    /**
     * Builds a new matrix whose values are computed by:
     * * decomposing the the "startValue" and "endValue" matrices into their respective scale, rotation and translation matrices
     * * interpolating for "gradient" (float) the values between each of these decomposed matrices between the start and the end
     * * recomposing a new matrix from these 3 interpolated scale, rotation and translation matrices
     * @param startValue - defines the first matrix
     * @param endValue - defines the second matrix
     * @param gradient - defines the gradient between the two matrices
     * @returns the new matrix
     */
    function decomposeLerp(startValue: ReadonlyMatrix, endValue: ReadonlyMatrix, gradient: number): MutableMatrix;
    /**
     * Update a matrix to values which are computed by:
     * * decomposing the the "startValue" and "endValue" matrices into their respective scale, rotation and translation matrices
     * * interpolating for "gradient" (float) the values between each of these decomposed matrices between the start and the end
     * * recomposing a new matrix from these 3 interpolated scale, rotation and translation matrices
     * @param startValue - defines the first matrix
     * @param endValue - defines the second matrix
     * @param gradient - defines the gradient between the two matrices
     * @param result - defines the target matrix
     */
    function decomposeLerpToRef(startValue: ReadonlyMatrix, endValue: ReadonlyMatrix, gradient: number, result: MutableMatrix): void;
    /**
     * Gets a new rotation matrix used to rotate an entity so as it looks at the target vector3, from the eye vector3 position, the up vector3 being oriented like "up"
     * self function works in left handed mode
     * @param eye - defines the final position of the entity
     * @param target - defines where the entity should look at
     * @param up - defines the up vector for the entity
     * @returns the new matrix
     */
    function LookAtLH(eye: Vector3.ReadonlyVector3, target: Vector3.ReadonlyVector3, up: Vector3.ReadonlyVector3): MutableMatrix;
    /**
     * Sets the given "result" Matrix to a rotation matrix used to rotate an entity so that it looks at the target vector3, from the eye vector3 position, the up vector3 being oriented like "up".
     * self function works in left handed mode
     * @param eye - defines the final position of the entity
     * @param target - defines where the entity should look at
     * @param up - defines the up vector for the entity
     * @param result - defines the target matrix
     */
    function lookAtLHToRef(eye: Vector3.ReadonlyVector3, target: Vector3.ReadonlyVector3, up: Vector3.ReadonlyVector3, result: MutableMatrix): void;
    /**
     * Gets a new rotation matrix used to rotate an entity so as it looks at the target vector3, from the eye vector3 position, the up vector3 being oriented like "up"
     * self function works in right handed mode
     * @param eye - defines the final position of the entity
     * @param target - defines where the entity should look at
     * @param up - defines the up vector for the entity
     * @returns the new matrix
     */
    function lookAtRH(eye: Vector3.ReadonlyVector3, target: Vector3.ReadonlyVector3, up: Vector3.ReadonlyVector3): MutableMatrix;
    /**
     * Sets the given "result" Matrix to a rotation matrix used to rotate an entity so that it looks at the target vector3, from the eye vector3 position, the up vector3 being oriented like "up".
     * self function works in right handed mode
     * @param eye - defines the final position of the entity
     * @param target - defines where the entity should look at
     * @param up - defines the up vector for the entity
     * @param result - defines the target matrix
     */
    function lookAtRHToRef(eye: Vector3.ReadonlyVector3, target: Vector3.ReadonlyVector3, up: Vector3.ReadonlyVector3, result: MutableMatrix): void;
    /**
     * Create a left-handed orthographic projection matrix
     * @param width - defines the viewport width
     * @param height - defines the viewport height
     * @param znear - defines the near clip plane
     * @param zfar - defines the far clip plane
     * @returns a new matrix as a left-handed orthographic projection matrix
     */
    function orthoLH(width: number, height: number, znear: number, zfar: number): MutableMatrix;
    /**
     * Store a left-handed orthographic projection to a given matrix
     * @param width - defines the viewport width
     * @param height - defines the viewport height
     * @param znear - defines the near clip plane
     * @param zfar - defines the far clip plane
     * @param result - defines the target matrix
     */
    function orthoLHToRef(width: number, height: number, znear: number, zfar: number, result: MutableMatrix): void;
    /**
     * Create a left-handed orthographic projection matrix
     * @param left - defines the viewport left coordinate
     * @param right - defines the viewport right coordinate
     * @param bottom - defines the viewport bottom coordinate
     * @param top - defines the viewport top coordinate
     * @param znear - defines the near clip plane
     * @param zfar - defines the far clip plane
     * @returns a new matrix as a left-handed orthographic projection matrix
     */
    function OrthoOffCenterLH(left: number, right: number, bottom: number, top: number, znear: number, zfar: number): MutableMatrix;
    /**
     * Stores a left-handed orthographic projection into a given matrix
     * @param left - defines the viewport left coordinate
     * @param right - defines the viewport right coordinate
     * @param bottom - defines the viewport bottom coordinate
     * @param top - defines the viewport top coordinate
     * @param znear - defines the near clip plane
     * @param zfar - defines the far clip plane
     * @param result - defines the target matrix
     */
    function orthoOffCenterLHToRef(left: number, right: number, bottom: number, top: number, znear: number, zfar: number, result: MutableMatrix): void;
    /**
     * Creates a right-handed orthographic projection matrix
     * @param left - defines the viewport left coordinate
     * @param right - defines the viewport right coordinate
     * @param bottom - defines the viewport bottom coordinate
     * @param top - defines the viewport top coordinate
     * @param znear - defines the near clip plane
     * @param zfar - defines the far clip plane
     * @returns a new matrix as a right-handed orthographic projection matrix
     */
    function orthoOffCenterRH(left: number, right: number, bottom: number, top: number, znear: number, zfar: number): MutableMatrix;
    /**
     * Stores a right-handed orthographic projection into a given matrix
     * @param left - defines the viewport left coordinate
     * @param right - defines the viewport right coordinate
     * @param bottom - defines the viewport bottom coordinate
     * @param top - defines the viewport top coordinate
     * @param znear - defines the near clip plane
     * @param zfar - defines the far clip plane
     * @param result - defines the target matrix
     */
    function orthoOffCenterRHToRef(left: number, right: number, bottom: number, top: number, znear: number, zfar: number, result: MutableMatrix): void;
    /**
     * Creates a left-handed perspective projection matrix
     * @param width - defines the viewport width
     * @param height - defines the viewport height
     * @param znear - defines the near clip plane
     * @param zfar - defines the far clip plane
     * @returns a new matrix as a left-handed perspective projection matrix
     */
    function perspectiveLH(width: number, height: number, znear: number, zfar: number): MutableMatrix;
    /**
     * Creates a left-handed perspective projection matrix
     * @param fov - defines the horizontal field of view
     * @param aspect - defines the aspect ratio
     * @param znear - defines the near clip plane
     * @param zfar - defines the far clip plane
     * @returns a new matrix as a left-handed perspective projection matrix
     */
    function perspectiveFovLH(fov: number, aspect: number, znear: number, zfar: number): MutableMatrix;
    /**
     * Stores a left-handed perspective projection into a given matrix
     * @param fov - defines the horizontal field of view
     * @param aspect - defines the aspect ratio
     * @param znear - defines the near clip plane
     * @param zfar - defines the far clip plane
     * @param result - defines the target matrix
     * @param isVerticalFovFixed - defines it the fov is vertically fixed (default) or horizontally
     */
    function perspectiveFovLHToRef(fov: number, aspect: number, znear: number, zfar: number, result: MutableMatrix, isVerticalFovFixed?: boolean): void;
    /**
     * Creates a right-handed perspective projection matrix
     * @param fov - defines the horizontal field of view
     * @param aspect - defines the aspect ratio
     * @param znear - defines the near clip plane
     * @param zfar - defines the far clip plane
     * @returns a new matrix as a right-handed perspective projection matrix
     */
    function PerspectiveFovRH(fov: number, aspect: number, znear: number, zfar: number): MutableMatrix;
    /**
     * Stores a right-handed perspective projection into a given matrix
     * @param fov - defines the horizontal field of view
     * @param aspect - defines the aspect ratio
     * @param znear - defines the near clip plane
     * @param zfar - defines the far clip plane
     * @param result - defines the target matrix
     * @param isVerticalFovFixed - defines it the fov is vertically fixed (default) or horizontally
     */
    function perspectiveFovRHToRef(fov: number, aspect: number, znear: number, zfar: number, result: MutableMatrix, isVerticalFovFixed?: boolean): void;
    /**
     * Stores a perspective projection for WebVR info a given matrix
     * @param fov - defines the field of view
     * @param znear - defines the near clip plane
     * @param zfar - defines the far clip plane
     * @param result - defines the target matrix
     * @param rightHanded - defines if the matrix must be in right-handed mode (false by default)
     */
    function perspectiveFovWebVRToRef(fov: {
        upDegrees: number;
        downDegrees: number;
        leftDegrees: number;
        rightDegrees: number;
    }, znear: number, zfar: number, result: MutableMatrix, rightHanded?: boolean): void;
    /**
     * Extracts a 2x2 matrix from a given matrix and store the result in a FloatArray
     * @param matrix - defines the matrix to use
     * @returns a new FloatArray array with 4 elements : the 2x2 matrix extracted from the given matrix
     */
    function GetAsMatrix2x2(matrix: ReadonlyMatrix): FloatArray;
    /**
     * Extracts a 3x3 matrix from a given matrix and store the result in a FloatArray
     * @param matrix - defines the matrix to use
     * @returns a new FloatArray array with 9 elements : the 3x3 matrix extracted from the given matrix
     */
    function GetAsMatrix3x3(matrix: ReadonlyMatrix): FloatArray;
    /**
     * Compute the transpose of a given matrix
     * @param matrix - defines the matrix to transpose
     * @returns the new matrix
     */
    function transpose(matrix: ReadonlyMatrix): MutableMatrix;
    /**
     * Compute the transpose of a matrix and store it in a target matrix
     * @param matrix - defines the matrix to transpose
     * @param result - defines the target matrix
     */
    function transposeToRef(matrix: ReadonlyMatrix, result: MutableMatrix): void;
    /**
     * Computes a reflection matrix from a plane
     * @param plane - defines the reflection plane
     * @returns a new matrix
     */
    function reflection(plane: Plane.ReadonlyPlane): MutableMatrix;
    /**
     * Computes a reflection matrix from a plane
     * @param plane - defines the reflection plane
     * @param result - defines the target matrix
     */
    function reflectionToRef(_plane: Plane.ReadonlyPlane, result: MutableMatrix): void;
    /**
     * Sets the given matrix as a rotation matrix composed from the 3 left handed axes
     * @param xaxis - defines the value of the 1st axis
     * @param yaxis - defines the value of the 2nd axis
     * @param zaxis - defines the value of the 3rd axis
     * @param result - defines the target matrix
     */
    function fromXYZAxesToRef(xaxis: Vector3.ReadonlyVector3, yaxis: Vector3.ReadonlyVector3, zaxis: Vector3.ReadonlyVector3, result: MutableMatrix): void;
    /**
     * Creates a rotation matrix from a quaternion and stores it in a target matrix
     * @param quat - defines the quaternion to use
     * @param result - defines the target matrix
     */
    function fromQuaternionToRef(quat: Quaternion.ReadonlyQuaternion, result: MutableMatrix): void;
    /**
     * Check if the current matrix is identity
     * @returns true is the matrix is the identity matrix
     */
    function isIdentityUpdate(self: MutableMatrix): boolean;
    /**
     * Check if the current matrix is identity as a texture matrix (3x2 store in 4x4)
     * @returns true is the matrix is the identity matrix
     */
    function isIdentityAs3x2Update(self: MutableMatrix): boolean;
    /**
     * Gets the determinant of the matrix
     * @returns the matrix determinant
     */
    function determinant(self: ReadonlyMatrix): number;
    /**
     * Returns the matrix as a FloatArray
     * @returns the matrix underlying array
     */
    function toArray(self: ReadonlyMatrix): Matrix4x4;
    /**
     * Returns the matrix as a FloatArray
     * @returns the matrix underlying array.
     */
    function asArray(self: ReadonlyMatrix): Matrix4x4;
    /**
     * Sets all the matrix elements to zero
     * @returns the current matrix
     */
    function reset(self: MutableMatrix): void;
    /**
     * Adds the current matrix with a second one
     * @param other - defines the matrix to add
     * @returns a new matrix as the addition of the current matrix and the given one
     */
    function add(self: ReadonlyMatrix, other: ReadonlyMatrix): MutableMatrix;
    /**
     * Sets the given matrix "result" to the addition of the current matrix and the given one
     * @param other - defines the matrix to add
     * @param result - defines the target matrix
     * @returns the current matrix
     */
    function addToRef(self: ReadonlyMatrix, other: ReadonlyMatrix, result: MutableMatrix): void;
    /**
     * Adds in place the given matrix to the current matrix
     * @param other - defines the second operand
     * @returns the current updated matrix
     */
    function addToSelf(self: MutableMatrix, other: ReadonlyMatrix): void;
    /**
     * Creates a new matrix as the invert of a given matrix
     * @param source - defines the source matrix
     * @returns the new matrix
     */
    function invert(source: ReadonlyMatrix): MutableMatrix;
    /**
     * Sets the given matrix to the current inverted Matrix
     * @param other - defines the target matrix
     * @returns the unmodified current matrix
     */
    function invertToRef(source: ReadonlyMatrix, result: MutableMatrix): void;
    /**
     * add a value at the specified position in the current Matrix
     * @param index - the index of the value within the matrix. between 0 and 15.
     * @param value - the value to be added
     * @returns the current updated matrix
     */
    function addAtIndex(self: MutableMatrix, index: number, value: number): void;
    /**
     * mutiply the specified position in the current Matrix by a value
     * @param index - the index of the value within the matrix. between 0 and 15.
     * @param value - the value to be added
     * @returns the current updated matrix
     */
    function multiplyAtIndex(self: MutableMatrix, index: number, value: number): MutableMatrix;
    /**
     * Inserts the translation vector (using 3 floats) in the current matrix
     * @param x - defines the 1st component of the translation
     * @param y - defines the 2nd component of the translation
     * @param z - defines the 3rd component of the translation
     * @returns the current updated matrix
     */
    function setTranslationFromFloats(self: MutableMatrix, x: number, y: number, z: number): void;
    /**
     * Inserts the translation vector in the current matrix
     * @param vector3 - defines the translation to insert
     * @returns the current updated matrix
     */
    function setTranslation(self: MutableMatrix, vector3: Vector3.ReadonlyVector3): void;
    /**
     * Gets the translation value of the current matrix
     * @returns a new Vector3 as the extracted translation from the matrix
     */
    function getTranslation(self: MutableMatrix): Vector3.MutableVector3;
    /**
     * Fill a Vector3 with the extracted translation from the matrix
     * @param result - defines the Vector3 where to store the translation
     * @returns the current matrix
     */
    function getTranslationToRef(self: MutableMatrix, result: Vector3.MutableVector3): void;
    /**
     * Remove rotation and scaling part from the matrix
     * @returns the updated matrix
     */
    function removeRotationAndScaling(self: MutableMatrix): MutableMatrix;
    /**
     * Multiply two matrices
     * @param other - defines the second operand
     * @returns a new matrix set with the multiplication result of the current Matrix and the given one
     */
    function multiply(self: MutableMatrix, other: ReadonlyMatrix): MutableMatrix;
    /**
     * Copy the current matrix from the given one
     * @param other - defines the source matrix
     * @returns the current updated matrix
     */
    function copy(from: ReadonlyMatrix, dest: MutableMatrix): void;
    /**
     * Populates the given array from the starting index with the current matrix values
     * @param array - defines the target array
     * @param offset - defines the offset in the target array where to start storing values
     * @returns the current matrix
     */
    function copyToArray(self: ReadonlyMatrix, arrayDest: FloatArray, offsetDest?: number): void;
    /**
     * Sets the given matrix "result" with the multiplication result of the current Matrix and the given one
     * @param other - defines the second operand
     * @param result - defines the matrix where to store the multiplication
     * @returns the current matrix
     */
    function multiplyToRef(self: ReadonlyMatrix, other: ReadonlyMatrix, result: MutableMatrix): void;
    /**
     * Sets the FloatArray "result" from the given index "offset" with the multiplication of the current matrix and the given one
     * @param other - defines the second operand
     * @param result - defines the array where to store the multiplication
     * @param offset - defines the offset in the target array where to start storing values
     * @returns the current matrix
     */
    function multiplyToArray(self: ReadonlyMatrix, other: ReadonlyMatrix, result: FloatArray, offset: number): void;
    /**
     * Check equality between self matrix and a second one
     * @param value - defines the second matrix to compare
     * @returns true is the current matrix and the given one values are strictly equal
     */
    function equals(self: ReadonlyMatrix, value: ReadonlyMatrix): boolean;
    /**
     * Clone the current matrix
     * @returns a new matrix from the current matrix
     */
    function clone(self: ReadonlyMatrix): MutableMatrix;
    /**
     * Gets the hash code of the current matrix
     * @returns the hash code
     */
    function getHashCode(self: ReadonlyMatrix): number;
    /**
     * Decomposes the current Matrix into a translation, rotation and scaling components
     * @param scale - defines the scale vector3 given as a reference to update
     * @param rotation - defines the rotation quaternion given as a reference to update
     * @param translation - defines the translation vector3 given as a reference to update
     * @returns true if operation was successful
     */
    function decompose(self: ReadonlyMatrix, scale?: Vector3.MutableVector3, rotation?: Quaternion.MutableQuaternion, translation?: Vector3.MutableVector3): boolean;
    /**
     * Gets specific row of the matrix
     * @param index - defines the number of the row to get
     * @returns the index-th row of the current matrix as a new Vector4
     */
    /**
     * Sets the index-th row of the current matrix to the vector4 values
     * @param index - defines the number of the row to set
     * @param row - defines the target vector4
     * @returns the updated current matrix
     */
    /**
     * Sets the index-th row of the current matrix with the given 4 x float values
     * @param index - defines the row index
     * @param x - defines the x component to set
     * @param y - defines the y component to set
     * @param z - defines the z component to set
     * @param w - defines the w component to set
     * @returns the updated current matrix
     */
    function setRowFromFloats(self: MutableMatrix, index: number, x: number, y: number, z: number, w: number): void;
    /**
     * Compute a new matrix set with the current matrix values multiplied by scale (float)
     * @param scale - defines the scale factor
     * @returns a new matrix
     */
    function scale(self: ReadonlyMatrix, scale: number): MutableMatrix;
    /**
     * Scale the current matrix values by a factor to a given result matrix
     * @param scale - defines the scale factor
     * @param result - defines the matrix to store the result
     * @returns the current matrix
     */
    function scaleToRef(self: ReadonlyMatrix, scale: number, result: MutableMatrix): void;
    /**
     * Scale the current matrix values by a factor and add the result to a given matrix
     * @param scale - defines the scale factor
     * @param result - defines the Matrix to store the result
     * @returns the current matrix
     */
    function scaleAndAddToRef(self: ReadonlyMatrix, scale: number, result: MutableMatrix): void;
    /**
     * Writes to the given matrix a normal matrix, computed from self one (using values from identity matrix for fourth row and column).
     * @param ref - matrix to store the result
     */
    function normalMatrixToRef(self: ReadonlyMatrix, ref: MutableMatrix): void;
    /**
     * Gets only rotation part of the current matrix
     * @returns a new matrix sets to the extracted rotation matrix from the current one
     */
    function getRotationMatrix(self: ReadonlyMatrix): MutableMatrix;
    /**
     * Extracts the rotation matrix from the current one and sets it as the given "result"
     * @param result - defines the target matrix to store data to
     * @returns the current matrix
     */
    function getRotationMatrixToRef(self: ReadonlyMatrix, result: MutableMatrix): void;
    /**
     * Toggles model matrix from being right handed to left handed in place and vice versa
     */
    function toggleModelMatrixHandInPlace(self: MutableMatrix): void;
    /**
     * Toggles projection matrix from being right handed to left handed in place and vice versa
     */
    function toggleProjectionMatrixHandInPlace(self: MutableMatrix): void;
}

/** @public */
declare const MeshCollider: ComponentDefinition<ISchema<PBMeshCollider>, Partial<PBMeshCollider>>;

/** @public */
declare const MeshRenderer: ComponentDefinition<ISchema<PBMeshRenderer>, Partial<PBMeshRenderer>>;

/**
 * @public
 * @deprecated
 */
declare class MessageBus {
    private messageQueue;
    private connected;
    private flushing;
    constructor();
    on(message: string, callback: (value: any, sender: string) => void): Observer<IEvents['comms']>;
    emit(message: string, payload: Record<any, any>): void;
    private flush;
}

/** @public */
declare const NFTShape: ComponentDefinition<ISchema<PBNFTShape>, PBNFTShape>;

/**
 * The Observable class is a simple implementation of the Observable pattern.
 *
 * There's one slight particularity though: a given Observable can notify its observer using a particular mask value, only the Observers registered with this mask value will be notified.
 * This enable a more fine grained execution without having to rely on multiple different Observable objects.
 * For instance you may have a given Observable that have four different types of notifications: Move (mask = 0x01), Stop (mask = 0x02), Turn Right (mask = 0X04), Turn Left (mask = 0X08).
 * A given observer can register itself with only Move and Stop (mask = 0x03), then it will only be notified when one of these two occurs and will never be for Turn Left/Right.
 *
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed
 */
declare class Observable<T> {
    private _observers;
    private _eventState;
    private _onObserverAdded;
    /**
     * Creates a new observable
     * @param onObserverAdded - defines a callback to call when a new observer is added
     */
    constructor(onObserverAdded?: (observer: Observer<T>) => void);
    /**
     * Create a new Observer with the specified callback
     * @param callback - the callback that will be executed for that Observer
     * @param mask - the mask used to filter observers
     * @param insertFirst - if true the callback will be inserted at the first position, hence executed before the others ones. If false (default behavior) the callback will be inserted at the last position, executed after all the others already present.
     * @param scope - optional scope for the callback to be called from
     * @param unregisterOnFirstCall - defines if the observer as to be unregistered after the next notification
     * @returns the new observer created for the callback
     */
    add(callback: (eventData: T, eventState: ObserverEventState) => void, mask?: number, insertFirst?: boolean, scope?: any, unregisterOnFirstCall?: boolean): null | Observer<T>;
    /**
     * Create a new Observer with the specified callback and unregisters after the next notification
     * @param callback - the callback that will be executed for that Observer
     * @returns the new observer created for the callback
     */
    addOnce(callback: (eventData: T, eventState: ObserverEventState) => void): null | Observer<T>;
    /**
     * Remove an Observer from the Observable object
     * @param observer - the instance of the Observer to remove
     * @returns false if it doesn't belong to this Observable
     */
    remove(observer: null | Observer<T>): boolean;
    /**
     * Remove a callback from the Observable object
     * @param callback - the callback to remove
     * @param scope - optional scope. If used only the callbacks with this scope will be removed
     * @returns false if it doesn't belong to this Observable
     */
    removeCallback(callback: (eventData: T, eventState: ObserverEventState) => void, scope?: any): boolean;
    /**
     * Notify all Observers by calling their respective callback with the given data
     * Will return true if all observers were executed, false if an observer set skipNextObservers to true, then prevent the subsequent ones to execute
     * @param eventData - defines the data to send to all observers
     * @param mask - defines the mask of the current notification (observers with incompatible mask (ie mask & observer.mask === 0) will not be notified)
     * @param target - defines the original target of the state
     * @param currentTarget - defines the current target of the state
     * @returns false if the complete observer chain was not processed (because one observer set the skipNextObservers to true)
     */
    notifyObservers(eventData: T, mask?: number, target?: any, currentTarget?: any): boolean;
    /**
     * Calling this will execute each callback, expecting it to be a promise or return a value.
     * If at any point in the chain one function fails, the promise will fail and the execution will not continue.
     * This is useful when a chain of events (sometimes async events) is needed to initialize a certain object
     * and it is crucial that all callbacks will be executed.
     * The order of the callbacks is kept, callbacks are not executed parallel.
     *
     * @param eventData - The data to be sent to each callback
     * @param mask - is used to filter observers defaults to -1
     * @param target - defines the callback target (see EventState)
     * @param currentTarget - defines he current object in the bubbling phase
     * @returns will return a Promise than resolves when all callbacks executed successfully.
     */
    notifyObserversWithPromise(eventData: T, mask?: number, target?: any, currentTarget?: any): Promise<T>;
    /**
     * Notify a specific observer
     * @param observer - defines the observer to notify
     * @param eventData - defines the data to be sent to each callback
     * @param mask - is used to filter observers defaults to -1
     */
    notifyObserver(observer: Observer<T>, eventData: T, mask?: number): void;
    /**
     * Gets a boolean indicating if the observable has at least one observer
     * @returns true is the Observable has at least one Observer registered
     */
    hasObservers(): boolean;
    /**
     * Clear the list of observers
     */
    clear(): void;
    /**
     * Clone the current observable
     * @returns a new observable
     */
    clone(): Observable<T>;
    /**
     * Does this observable handles observer registered with a given mask
     * @param mask - defines the mask to be tested
     * @returns whether or not one observer registered with the given mask is handeled
     */
    hasSpecificMask(mask?: number): boolean;
    private _deferUnregister;
    private _remove;
}

/**
 * Represent an Observer registered to a given Observable object.
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed
 */
declare class Observer<T> {
    /**
     * Defines the callback to call when the observer is notified
     */
    callback: (eventData: T, eventState: ObserverEventState) => void;
    /**
     * Defines the mask of the observer (used to filter notifications)
     */
    mask: number;
    /**
     * Defines the current scope used to restore the JS context
     */
    scope: any;
    /**
     * Gets or sets a property defining that the observer as to be unregistered after the next notification
     */
    unregisterOnNextCall: boolean;
    /** For internal usage */
    _willBeUnregistered: boolean;
    /**
     * Creates a new observer
     * @param callback - defines the callback to call when the observer is notified
     * @param mask - defines the mask of the observer (used to filter notifications)
     * @param scope - defines the current scope used to restore the JS context
     */
    constructor(
    /**
     * Defines the callback to call when the observer is notified
     */
    callback: (eventData: T, eventState: ObserverEventState) => void, 
    /**
     * Defines the mask of the observer (used to filter notifications)
     */
    mask: number, 
    /**
     * Defines the current scope used to restore the JS context
     */
    scope?: any);
}

/**
 * A class serves as a medium between the observable and its observers
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed
 */
declare class ObserverEventState {
    /**
     * An Observer can set this property to true to prevent subsequent observers of being notified
     */
    skipNextObservers: boolean;
    /**
     * Get the mask value that were used to trigger the event corresponding to this EventState object
     */
    mask: number;
    /**
     * The object that originally notified the event
     */
    target?: any;
    /**
     * The current object in the bubbling phase
     */
    currentTarget?: any;
    /**
     * This will be populated with the return value of the last function that was executed.
     * If it is the first function in the callback chain it will be the event data.
     */
    lastReturnValue?: any;
    /**
     * Create a new EventState
     * @param mask - defines the mask associated with this state
     * @param skipNextObservers - defines a flag which will instruct the observable to skip following observers when set to true
     * @param target - defines the original target of the state
     * @param currentTarget - defines the current target of the state
     */
    constructor(mask: number, skipNextObservers?: boolean, target?: any, currentTarget?: any);
    /**
     * Initialize the current event state
     * @param mask - defines the mask associated with this state
     * @param skipNextObservers - defines a flag which will instruct the observable to skip following observers when set to true
     * @param target - defines the original target of the state
     * @param currentTarget - defines the current target of the state
     * @returns the current event state
     */
    initalize(mask: number, skipNextObservers?: boolean, target?: any, currentTarget?: any): ObserverEventState;
}

/** @public
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed.
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed. Use onEnterSceneObservable instead. */
declare const onEnterScene: Observable<{
    userId: string;
}>;

/**
 * These events are triggered after your character enters the scene.
 * @public
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed.
 */
declare const onEnterSceneObservable: Observable<{
    userId: string;
}>;

/** @public
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed.
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed. Use onLeaveSceneObservable instead. */
declare const onLeaveScene: Observable<{
    userId: string;
}>;

/**
 * These events are triggered after your character leaves the scene.
 * @public
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed.
 */
declare const onLeaveSceneObservable: Observable<{
    userId: string;
}>;

declare type OnlyNonUndefinedTypes<T> = {
    [K in ExcludeUndefined<T>]: T[K];
};

declare type OnlyOptionalUndefinedTypes<T> = {
    [K in IncludeUndefined<T>]?: T[K];
};

/**
 * @public
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed.
 */
declare const onPlayerClickedObservable: Observable<{
    userId: string;
    ray: {
        origin: ReadOnlyVector3;
        direction: ReadOnlyVector3;
        distance: number;
    };
}>;

/**
 * @public
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed.
 */
declare const onPlayerConnectedObservable: Observable<{
    userId: string;
}>;

/**
 * @public
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed.
 */
declare const onPlayerDisconnectedObservable: Observable<{
    userId: string;
}>;

/**
 * @public
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed.
 */
declare const onPlayerExpressionObservable: Observable<{
    expressionId: string;
}>;

/** @public */
declare const OnPointerDown: ComponentDefinition<ISchema<PBOnPointerDown>, PBOnPointerDown>;

/** @public */
declare const OnPointerDownResult: ComponentDefinition<ISchema<PBOnPointerDownResult>, PBOnPointerDownResult>;

/** @public */
declare const OnPointerUp: ComponentDefinition<ISchema<PBOnPointerUp>, PBOnPointerUp>;

/** @public */
declare const OnPointerUpResult: ComponentDefinition<ISchema<PBOnPointerUpResult>, PBOnPointerUpResult>;

/**
 * @public
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed.
 */
declare const onProfileChanged: Observable<{
    ethAddress: string;
    version: number;
}>;

/**
 * @public
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed.
 */
declare const onRealmChangedObservable: Observable<{
    domain: string;
    room: string;
    serverName: string;
    displayName: string;
}>;

/**
 * This event is triggered after all the resources of the scene were loaded (models, textures, etc...)
 * @public
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed.
 */
declare const onSceneReadyObservable: Observable<{}>;

/**
 * @public
 * @deprecated This function is an inheritance of ECS6, it's here temporary for the feature parity, please read the news and docs to know how handle when it's removed.
 */
declare const onVideoEvent: Observable<{
    componentId: string;
    videoClipId: string;
    videoStatus: number;
    currentOffset: number;
    totalVideoLength: number;
}>;

declare interface PBAnimationState {
    name: string;
    clip: string;
    playing?: boolean | undefined;
    /** default=1.0s */
    weight?: number | undefined;
    /** default=1.0 */
    speed?: number | undefined;
    /** default=true */
    loop?: boolean | undefined;
    shouldReset?: boolean | undefined;
}

declare interface PBAnimator {
    states: PBAnimationState[];
}

declare interface PBAudioSource {
    playing?: boolean | undefined;
    /** default=1.0f */
    volume?: number | undefined;
    loop?: boolean | undefined;
    /** default=1.0f */
    pitch?: number | undefined;
    audioClipUrl: string;
}

declare interface PBAvatarAttach {
    avatarId: string;
    anchorPointId: AvatarAnchorPoint;
}

declare interface PBAvatarModifierArea {
    area: Vector3_2 | undefined;
    excludeIds: string[];
    modifiers: AvatarModifier[];
}

declare interface PBAvatarShape {
    id: string;
    /** default = NPC */
    name?: string | undefined;
    /** default = urn:decentraland:off-chain:base-avatars:BaseFemale */
    bodyShape?: string | undefined;
    /** default = Color3(R = 0.6f, G = 0.462f, B = 0.356f) */
    skinColor?: Color3 | undefined;
    /** default = Color3(R = 0.283f, G = 0.142f, B = 0f) */
    hairColor?: Color3 | undefined;
    /** default = Color3(R = 0.6f, G = 0.462f, B = 0.356f) */
    eyeColor?: Color3 | undefined;
    expressionTriggerId?: string | undefined;
    /** default = timestamp */
    expressionTriggerTimestamp?: number | undefined;
    talking?: boolean | undefined;
    /**
     * default = ["urn:decentraland:off-chain:base-avatars:f_eyes_00",
     *  "urn:decentraland:off-chain:base-avatars:f_eyebrows_00",
     *  "urn:decentraland:off-chain:base-avatars:f_mouth_00"
     *  "urn:decentraland:off-chain:base-avatars:standard_hair",
     *  "urn:decentraland:off-chain:base-avatars:f_simple_yellow_tshirt",
     *  "urn:decentraland:off-chain:base-avatars:f_brown_trousers",
     *  "urn:decentraland:off-chain:base-avatars:bun_shoes"]
     */
    wearables: string[];
    /** default = [] */
    emotes: string[];
}

declare interface PBBillboard {
    /** default=true */
    x?: boolean | undefined;
    /** default=true */
    y?: boolean | undefined;
    /** default=true */
    z?: boolean | undefined;
}

declare interface PBBoxShape {
    /** @deprecated use MeshCollider instead https://github.com/decentraland/sdk/issues/366 */
    withCollisions?: boolean | undefined;
    /** @deprecated use MeshCollider instead https://github.com/decentraland/sdk/issues/366 */
    isPointerBlocker?: boolean | undefined;
    /** @deprecated use HiddenComponent instead https://github.com/decentraland/sdk/issues/353 */
    visible?: boolean | undefined;
    uvs: number[];
}

declare interface PBCameraMode {
    mode: CameraModeValue;
}

declare interface PBCameraModeArea {
    area: Vector3_2 | undefined;
    mode: CameraModeValue;
}

declare interface PBCylinderShape {
    /** @deprecated use MeshCollider instead https://github.com/decentraland/sdk/issues/366 */
    withCollisions?: boolean | undefined;
    /** @deprecated use MeshCollider instead https://github.com/decentraland/sdk/issues/366 */
    isPointerBlocker?: boolean | undefined;
    /** @deprecated use HiddenComponent instead https://github.com/decentraland/sdk/issues/353 */
    visible?: boolean | undefined;
    /** default=1.0 */
    radiusTop?: number | undefined;
    /** default=1.0 */
    radiusBottom?: number | undefined;
}

declare interface PBGltfContainer {
    /** which file to load */
    src: string;
}

declare interface PBMaterial {
    /** default = null */
    texture?: PBMaterial_Texture | undefined;
    /** default = 0.5. range value: from 0 to 1 */
    alphaTest?: number | undefined;
    /** default =  true */
    castShadows?: boolean | undefined;
    /** default = null */
    alphaTexture?: PBMaterial_Texture | undefined;
    /** default = null */
    emissiveTexture?: PBMaterial_Texture | undefined;
    /** default = null */
    bumpTexture?: PBMaterial_Texture | undefined;
    /** default = white; */
    albedoColor?: Color3 | undefined;
    /** default = black; */
    emissiveColor?: Color3 | undefined;
    /** default = white; */
    reflectivityColor?: Color3 | undefined;
    /** default = TransparencyMode.Auto */
    transparencyMode?: TransparencyMode | undefined;
    /** default = 0.5 */
    metallic?: number | undefined;
    /** default = 0.5 */
    roughness?: number | undefined;
    /** default = 1 */
    glossiness?: number | undefined;
    /** default = 1 */
    specularIntensity?: number | undefined;
    /** default = 2 */
    emissiveIntensity?: number | undefined;
    /** default = 1 */
    directIntensity?: number | undefined;
}

declare interface PBMaterial_Texture {
    src: string;
    /** default = TextureWrapMode.Clamp */
    wrapMode?: TextureWrapMode | undefined;
    /** default = FilterMode.Bilinear */
    filterMode?: FilterMode | undefined;
}

declare interface PBMeshCollider {
    /** default = ColliderLayer.Physics | ColliderLayer.Pointer */
    collisionMask?: number | undefined;
    box: PBMeshCollider_BoxMesh | undefined;
    sphere: PBMeshCollider_SphereMesh | undefined;
    cylinder: PBMeshCollider_CylinderMesh | undefined;
    plane: PBMeshCollider_PlaneMesh | undefined;
}

declare interface PBMeshCollider_BoxMesh {
}

declare interface PBMeshCollider_CylinderMesh {
    /** default=1.0 */
    radiusTop?: number | undefined;
    /** default=1.0 */
    radiusBottom?: number | undefined;
}

declare interface PBMeshCollider_PlaneMesh {
}

declare interface PBMeshCollider_SphereMesh {
}

declare interface PBMeshRenderer {
    box: PBMeshRenderer_BoxMesh | undefined;
    sphere: PBMeshRenderer_SphereMesh | undefined;
    cylinder: PBMeshRenderer_CylinderMesh | undefined;
    plane: PBMeshRenderer_PlaneMesh | undefined;
}

declare interface PBMeshRenderer_BoxMesh {
    uvs: number[];
}

declare interface PBMeshRenderer_CylinderMesh {
    /** default=1.0 */
    radiusTop?: number | undefined;
    /** default=1.0 */
    radiusBottom?: number | undefined;
}

declare interface PBMeshRenderer_PlaneMesh {
    uvs: number[];
}

declare interface PBMeshRenderer_SphereMesh {
}

declare interface PBNFTShape {
    src: string;
    /** default = PictureFrameStyle.Classic */
    style?: PBNFTShape_PictureFrameStyle | undefined;
    /** default = Color3(0.6404918, 0.611472, 0.8584906) */
    color?: Color3 | undefined;
}

declare const enum PBNFTShape_PictureFrameStyle {
    Classic = 0,
    Baroque_Ornament = 1,
    Diamond_Ornament = 2,
    Minimal_Wide = 3,
    Minimal_Grey = 4,
    Blocky = 5,
    Gold_Edges = 6,
    Gold_Carved = 7,
    Gold_Wide = 8,
    Gold_Rounded = 9,
    Metal_Medium = 10,
    Metal_Wide = 11,
    Metal_Slim = 12,
    Metal_Rounded = 13,
    Pins = 14,
    Minimal_Black = 15,
    Minimal_White = 16,
    Tape = 17,
    Wood_Slim = 18,
    Wood_Wide = 19,
    Wood_Twigs = 20,
    Canvas = 21,
    None = 22,
    UNRECOGNIZED = -1
}

declare interface PBOnPointerDown {
    /** default=ActionButton.ANY */
    button?: ActionButton | undefined;
    /** default='Interact' */
    hoverText?: string | undefined;
    /** default=10 */
    maxDistance?: number | undefined;
    /** default=true */
    showFeedback?: boolean | undefined;
}

declare interface PBOnPointerDownResult {
    button: ActionButton;
    meshName: string;
    origin: Vector3_2 | undefined;
    direction: Vector3_2 | undefined;
    point: Vector3_2 | undefined;
    normal: Vector3_2 | undefined;
    distance: number;
    timestamp: number;
}

declare interface PBOnPointerUp {
    /** default=ActionButton.ANY */
    button?: ActionButton | undefined;
    /** default='Interact' */
    hoverText?: string | undefined;
    /** default=10 */
    maxDistance?: number | undefined;
    /** default=true */
    showFeedback?: boolean | undefined;
}

declare interface PBOnPointerUpResult {
    button: ActionButton;
    meshName: string;
    origin: Vector3_2 | undefined;
    direction: Vector3_2 | undefined;
    point: Vector3_2 | undefined;
    normal: Vector3_2 | undefined;
    distance: number;
    timestamp: number;
}

declare interface PBPlaneShape {
    /** @deprecated use MeshCollider instead https://github.com/decentraland/sdk/issues/366 */
    withCollisions?: boolean | undefined;
    /** @deprecated use MeshCollider instead https://github.com/decentraland/sdk/issues/366 */
    isPointerBlocker?: boolean | undefined;
    /** @deprecated use HiddenComponent instead https://github.com/decentraland/sdk/issues/353 */
    visible?: boolean | undefined;
    uvs: number[];
}

declare interface PBPointerEvents {
    pointerEvents: PBPointerEvents_Entry[];
}

declare interface PBPointerEvents_Entry {
    eventType: PointerEventType;
    eventInfo: PBPointerEvents_Info | undefined;
}

declare interface PBPointerEvents_Info {
    /** default=ActionButton.ANY */
    button?: ActionButton | undefined;
    /** default='Interact' */
    hoverText?: string | undefined;
    /** default=10 */
    maxDistance?: number | undefined;
    /** default=true */
    showFeedback?: boolean | undefined;
}

/** the renderer will set this component to the root entity once per frame with all the events */
declare interface PBPointerEventsResult {
    /** a list of the last N pointer commands (from the engine) */
    commands: PBPointerEventsResult_PointerCommand[];
}

/** this message represents a pointer event, used both for UP and DOWN actions */
declare interface PBPointerEventsResult_PointerCommand {
    /** identifier of the input */
    button: ActionButton;
    hit: RaycastHit | undefined;
    state: PointerEventType;
    /** could be a Lamport timestamp */
    timestamp: number;
    /** if the input is analog then we store it here */
    analog?: number | undefined;
}

declare interface PBPointerLock {
    isPointerLocked: boolean;
}

declare interface PBRaycast {
    timestamp: number;
    origin: Vector3_2 | undefined;
    direction: Vector3_2 | undefined;
    maxDistance: number;
    queryType: RaycastQueryType;
}

declare interface PBRaycastResult {
    timestamp: number;
    origin: Vector3_2 | undefined;
    direction: Vector3_2 | undefined;
    hits: RaycastHit[];
}

declare interface PBSphereShape {
    /** @deprecated use MeshCollider instead https://github.com/decentraland/sdk/issues/366 */
    withCollisions?: boolean | undefined;
    /** @deprecated use MeshCollider instead https://github.com/decentraland/sdk/issues/366 */
    isPointerBlocker?: boolean | undefined;
    /** @deprecated use HiddenComponent instead https://github.com/decentraland/sdk/issues/353 */
    visible?: boolean | undefined;
}

declare interface PBTextShape {
    text: string;
    /** @deprecated use HiddenComponent instead https://github.com/decentraland/sdk/issues/353 */
    visible?: boolean | undefined;
    font?: string | undefined;
    /** default=1.0f */
    opacity?: number | undefined;
    /** default=10 */
    fontSize?: number | undefined;
    fontAutoSize?: boolean | undefined;
    /** default='center' */
    hTextAlign?: string | undefined;
    /** default='center' */
    vTextAlign?: string | undefined;
    /** default=1 */
    width?: number | undefined;
    /** default=1 */
    height?: number | undefined;
    paddingTop?: number | undefined;
    paddingRight?: number | undefined;
    paddingBottom?: number | undefined;
    paddingLeft?: number | undefined;
    lineSpacing?: number | undefined;
    lineCount?: number | undefined;
    textWrapping?: boolean | undefined;
    shadowBlur?: number | undefined;
    shadowOffsetX?: number | undefined;
    shadowOffsetY?: number | undefined;
    outlineWidth?: number | undefined;
    /** default=(1.0,1.0,1.0) */
    shadowColor?: Color3 | undefined;
    /** default=(1.0,1.0,1.0) */
    outlineColor?: Color3 | undefined;
    /** default=(1.0,1.0,1.0) */
    textColor?: Color3 | undefined;
}

declare interface PBUiStyles {
    /** default=(0.0, 0.0, 0.0, 0.0) */
    backgroundColor?: Color4 | undefined;
}

declare interface PBUiText {
    value: string;
    /** default=(1.0,1.0,1.0) */
    color?: Color3 | undefined;
    /** default='center' */
    textAlign?: TextAlign | undefined;
    /** default=0 */
    font?: Font | undefined;
    /** default=10 */
    fontSize?: number | undefined;
}

declare interface PBUiTransform {
    parent: number;
    rightOf: number;
    positionType: YGPositionType;
    alignContent: YGAlign;
    alignItems: YGAlign;
    alignSelf: YGAlign;
    flexDirection: YGFlexDirection;
    flexWrap: YGWrap;
    justifyContent: YGJustify;
    overflow: YGOverflow;
    display: YGDisplay;
    direction: YGDirection;
    flex: number;
    flexBasisUnit: YGUnit;
    flexBasis: number;
    flexGrow: number;
    flexShrink: number;
    widthUnit: YGUnit;
    width: number;
    heightUnit: YGUnit;
    height: number;
    minWidthUnit: YGUnit;
    minWidth: number;
    minHeightUnit: YGUnit;
    minHeight: number;
    maxWidthUnit: YGUnit;
    maxWidth: number;
    maxHeightUnit: YGUnit;
    maxHeight: number;
    positionLeftUnit: YGUnit;
    positionLeft: number;
    positionTopUnit: YGUnit;
    positionTop: number;
    positionRightUnit: YGUnit;
    positionRight: number;
    positionBottomUnit: YGUnit;
    positionBottom: number;
    /** margin */
    marginLeftUnit: YGUnit;
    marginLeft: number;
    marginTopUnit: YGUnit;
    marginTop: number;
    marginRightUnit: YGUnit;
    marginRight: number;
    marginBottomUnit: YGUnit;
    marginBottom: number;
    paddingLeftUnit: YGUnit;
    paddingLeft: number;
    paddingTopUnit: YGUnit;
    paddingTop: number;
    paddingRightUnit: YGUnit;
    paddingRight: number;
    paddingBottomUnit: YGUnit;
    paddingBottom: number;
    borderLeft: number;
    borderTop: number;
    borderRight: number;
    borderBottom: number;
}

declare interface PBVisibilityComponent {
    /** default=true */
    visible?: boolean | undefined;
}

/**
 * Represens a plane by the equation ax + by + cz + d = 0
 * @public
 */
declare namespace Plane {
    type MutablePlane = {
        /**
         * Normal of the plane (a,b,c)
         */
        normal: Vector3.MutableVector3;
        /**
         * d component of the plane
         */
        d: number;
    };
    type ReadonlyPlane = {
        /**
         * Normal of the plane (a,b,c)
         */
        normal: Vector3.ReadonlyVector3;
        /**
         * d component of the plane
         */
        d: number;
    };
    /**
     * Creates a Plane object according to the given floats a, b, c, d and the plane equation : ax + by + cz + d = 0
     * @param a - a component of the plane
     * @param b - b component of the plane
     * @param c - c component of the plane
     * @param d - d component of the plane
     */
    function create(a: number, b: number, c: number, d: number): {
        normal: Vector3.MutableVector3;
        d: number;
    };
    /**
     * Creates a plane from an  array
     * @param array - the array to create a plane from
     * @returns a new Plane from the given array.
     */
    function fromArray(array: number[]): MutablePlane;
    /**
     * Creates a plane from three points
     * @param point1 - point used to create the plane
     * @param point2 - point used to create the plane
     * @param point3 - point used to create the plane
     * @returns a new Plane defined by the three given points.
     */
    function fromPoints(_point1: Vector3.ReadonlyVector3, _point2: Vector3.ReadonlyVector3, _point3: Vector3.ReadonlyVector3): MutablePlane;
    /**
     * Creates a plane from an origin point and a normal
     * @param origin - origin of the plane to be constructed
     * @param normal - normal of the plane to be constructed
     * @returns a new Plane the normal vector to this plane at the given origin point.
     * Note : the vector "normal" is updated because normalized.
     */
    function romPositionAndNormal(origin: Vector3.ReadonlyVector3, normal: Vector3.ReadonlyVector3): MutablePlane;
    /**
     * Calculates the distance from a plane and a point
     * @param origin - origin of the plane to be constructed
     * @param normal - normal of the plane to be constructed
     * @param point - point to calculate distance to
     * @returns the signed distance between the plane defined by the normal vector at the "origin"" point and the given other point.
     */
    function signedDistanceToPlaneFromPositionAndNormal(origin: Vector3.ReadonlyVector3, normal: Vector3.ReadonlyVector3, point: Vector3.ReadonlyVector3): number;
    /**
     * @returns the plane coordinates as a new array of 4 elements [a, b, c, d].
     */
    function asArray(plane: ReadonlyPlane): number[];
    /**
     * @returns a new plane copied from the current Plane.
     */
    function clone(plane: ReadonlyPlane): MutablePlane;
    /**
     * @returns the Plane hash code.
     */
    function getHashCode(_plane: ReadonlyPlane): number;
    /**
     * Normalize the current Plane in place.
     * @returns the updated Plane.
     */
    function normalize(plane: ReadonlyPlane): MutablePlane;
    /**
     * Applies a transformation the plane and returns the result
     * @param transformation - the transformation matrix to be applied to the plane
     * @returns a new Plane as the result of the transformation of the current Plane by the given matrix.
     */
    function transform(plane: ReadonlyPlane, transformation: Matrix.ReadonlyMatrix): MutablePlane;
    /**
     * Calcualtte the dot product between the point and the plane normal
     * @param point - point to calculate the dot product with
     * @returns the dot product (float) of the point coordinates and the plane normal.
     */
    function dotCoordinate(plane: ReadonlyPlane, point: Vector3.ReadonlyVector3): number;
    /**
     * Updates the current Plane from the plane defined by the three given points.
     * @param point1 - one of the points used to contruct the plane
     * @param point2 - one of the points used to contruct the plane
     * @param point3 - one of the points used to contruct the plane
     * @returns the updated Plane.
     */
    function copyFromPoints(point1: Vector3.ReadonlyVector3, point2: Vector3.ReadonlyVector3, point3: Vector3.ReadonlyVector3): MutablePlane;
    /**
     * Checks if the plane is facing a given direction
     * @param direction - the direction to check if the plane is facing
     * @param epsilon - value the dot product is compared against (returns true if dot &lt;= epsilon)
     * @returns True is the vector "direction"  is the same side than the plane normal.
     */
    function isFrontFacingTo(plane: ReadonlyPlane, direction: Vector3.ReadonlyVector3, epsilon: number): boolean;
    /**
     * Calculates the distance to a point
     * @param point - point to calculate distance to
     * @returns the signed distance (float) from the given point to the Plane.
     */
    function signedDistanceTo(plane: ReadonlyPlane, point: Vector3.ReadonlyVector3): number;
}

/** @public */
declare const PlaneShape: ComponentDefinition<ISchema<PBPlaneShape>, PBPlaneShape>;

/** @public */
declare const PointerEvents: ComponentDefinition<ISchema<PBPointerEvents>, PBPointerEvents>;

/** @public */
declare const PointerEventsResult: ComponentDefinition<ISchema<PBPointerEventsResult>, PBPointerEventsResult>;

declare const enum PointerEventType {
    UP = 0,
    DOWN = 1,
    HOVER_ENTER = 2,
    HOVER_LEAVE = 3,
    UNRECOGNIZED = -1
}

/** @public */
declare const PointerLock: ComponentDefinition<ISchema<PBPointerLock>, PBPointerLock>;

/**
 * @public
 */
declare type PreEngine = ReturnType<typeof preEngine>;

declare function preEngine(): {
    entitiesComponent: Map<number, Set<number>>;
    componentsDefinition: Map<number, ComponentDefinition<any, any>>;
    addEntity: (dynamic?: boolean) => Entity;
    addDynamicEntity: () => Entity;
    removeEntity: (entity: Entity) => boolean;
    addSystem: (fn: SystemFn, priority?: number, name?: string | undefined) => void;
    getSystems: () => {
        fn: SystemFn;
        priority: number;
        name?: string | undefined;
    }[];
    removeSystem: (selector: string | SystemFn) => boolean;
    defineComponent: <T extends Spec, ConstructorType = Partial<Result<T>>>(spec: T, componentId: number, constructorDefault?: ConstructorType | undefined) => ComponentDefinition<ISchema<Result<T>>, ConstructorType>;
    defineComponentFromSchema: <T_1 extends ISchema<any>, ConstructorType_1 = EcsResult<T_1>>(spec: T_1, componentId: number, constructorDefault?: ConstructorType_1 | undefined) => ComponentDefinition<T_1, ConstructorType_1>;
    getEntitiesWith: <T_2 extends [ComponentDefinition<ISchema<any>, any>, ...ComponentDefinition<ISchema<any>, any>[]]>(...components: T_2) => Iterable<[Entity, ...ReadonlyComponentSchema<T_2>]>;
    getComponent: <T_3 extends ISchema<any>>(componentId: number) => ComponentDefinition<T_3, EcsResult<T_3>>;
    removeComponentDefinition: (componentId: number) => void;
};

/**
 * @public
 */
declare namespace Quaternion {
    /**
     * @public
     */
    export type MutableQuaternion = {
        y: number;
        x: number;
        z: number;
        w: number;
    };
    /**
     * @public
     */
    export type ReadonlyQuaternion = {
        readonly y: number;
        readonly x: number;
        readonly z: number;
        readonly w: number;
    };
    /**
     * Creates a new Quaternion from the given floats
     * @param x - defines the first component (0 by default)
     * @param y - defines the second component (0 by default)
     * @param z - defines the third component (0 by default)
     * @param w - defines the fourth component (1.0 by default)
     */
    export function create(
    /** defines the first component (0 by default) */
    x?: number, 
    /** defines the second component (0 by default) */
    y?: number, 
    /** defines the third component (0 by default) */
    z?: number, 
    /** defines the fourth component (1.0 by default) */
    w?: number): MutableQuaternion;
    /**
     * Returns a new Quaternion as the result of the addition of the two given quaternions.
     * @param q1 - the first quaternion
     * @param q2 - the second quaternion
     * @returns the resulting quaternion
     */
    export function add(q1: ReadonlyQuaternion, q2: ReadonlyQuaternion): MutableQuaternion;
    /**
     * Creates a new rotation from the given Euler float angles (y, x, z) and stores it in the target quaternion
     * @param yaw - defines the rotation around Y axis
     * @param pitch - defines the rotation around X axis
     * @param roll - defines the rotation around Z axis
     * @param result - defines the target quaternion
     */
    export function rotationYawPitchRoll(yaw: number, pitch: number, roll: number): MutableQuaternion;
    /**
     * Returns a rotation that rotates z degrees around the z axis, x degrees around the x axis, and y degrees around the y axis.
     * @param x - the rotation on the x axis in euler degrees
     * @param y - the rotation on the y axis in euler degrees
     * @param z - the rotation on the z axis in euler degrees
     */
    export function euler(x: number, y: number, z: number): MutableQuaternion;
    /**
     * Gets length of current quaternion
     * @returns the quaternion length (float)
     */
    export function length(q: ReadonlyQuaternion): number;
    /**
     * Gets length of current quaternion
     * @returns the quaternion length (float)
     */
    export function lengthSquared(q: ReadonlyQuaternion): number;
    /**
     * Returns the dot product (float) between the quaternions "left" and "right"
     * @param left - defines the left operand
     * @param right - defines the right operand
     * @returns the dot product
     */
    export function dot(left: ReadonlyQuaternion, right: ReadonlyQuaternion): number;
    /**
     * Returns the angle in degrees between two rotations a and b.
     * @param quat1 - defines the first quaternion
     * @param quat2 - defines the second quaternion
     */
    export function angle(quat1: ReadonlyQuaternion, quat2: ReadonlyQuaternion): number;
    /**
     * The from quaternion is rotated towards to by an angular step of maxDegreesDelta.
     * @param from - defines the first quaternion
     * @param to - defines the second quaternion
     * @param maxDegreesDelta - the interval step
     */
    export function rotateTowards(from: ReadonlyQuaternion, to: ReadonlyQuaternion, maxDegreesDelta: number): MutableQuaternion;
    /**
     * Creates a rotation with the specified forward and upwards directions.
     * @param forward - the direction to look in
     * @param up - the vector that defines in which direction up is
     */
    export function lookRotation(forward: Vector3.ReadonlyVector3, up?: Vector3.ReadonlyVector3): MutableQuaternion;
    /**
     * Normalize in place the current quaternion
     * @returns the current updated quaternion
     */
    export function normalize(q: ReadonlyQuaternion): MutableQuaternion;
    /**
     * Creates a rotation which rotates from fromDirection to toDirection.
     * @param from - defines the first direction Vector
     * @param to - defines the target direction Vector
     */
    export function fromToRotation(from: Vector3.ReadonlyVector3, to: Vector3.ReadonlyVector3, up?: Vector3.ReadonlyVector3): MutableQuaternion;
    /**
     * Creates an identity quaternion
     * @returns - the identity quaternion
     */
    export function Identity(): MutableQuaternion;
    /**
     * Gets or sets the euler angle representation of the rotation.
     * Implemented unity-based calculations from: https://stackoverflow.com/a/56055813
     */
    export function eulerAngles(q: MutableQuaternion): Vector3.MutableVector3;
    /**
     * Creates a new rotation from the given Euler float angles (y, x, z) and stores it in the target quaternion
     * @param yaw - defines the rotation around Y axis
     * @param pitch - defines the rotation around X axis
     * @param roll - defines the rotation around Z axis
     * @param result - defines the target quaternion
     */
    export function rotationYawPitchRollToRef(yaw: number, pitch: number, roll: number, result: Quaternion.MutableQuaternion): void;
    /**
     * Updates the given quaternion with the given rotation matrix values
     * @param matrix - defines the source matrix
     * @param result - defines the target quaternion
     */
    export function fromRotationMatrixToRef(matrix: Matrix.ReadonlyMatrix, result: Quaternion.MutableQuaternion): void;
    /**
     * Interpolates between two quaternions
     * @param left - defines first quaternion
     * @param right - defines second quaternion
     * @param amount - defines the gradient to use
     * @returns the new interpolated quaternion
     */
    export function slerp(left: ReadonlyQuaternion, right: ReadonlyQuaternion, amount: number): MutableQuaternion;
    /**
     * Interpolates between two quaternions and stores it into a target quaternion
     * @param left - defines first quaternion
     * @param right - defines second quaternion
     * @param amount - defines the gradient to use
     * @param result - defines the target quaternion
     */
    export function slerpToRef(left: ReadonlyQuaternion, right: ReadonlyQuaternion, amount: number, result: MutableQuaternion): void;
    /**
     * Multiplies two quaternions
     * @param self - defines the first operand
     * @param q1 - defines the second operand
     * @returns a new quaternion set as the multiplication result of the self one with the given one "q1"
     */
    export function multiply(self: ReadonlyQuaternion, q1: ReadonlyQuaternion): MutableQuaternion;
    /**
     * Sets the given "result" as the the multiplication result of the self one with the given one "q1"
     * @param self - defines the first operand
     * @param q1 - defines the second operand
     * @param result - defines the target quaternion
     * @returns the current quaternion
     */
    export function multiplyToRef(self: ReadonlyQuaternion, q1: ReadonlyQuaternion, result: MutableQuaternion): void;
    export function angleAxis(degress: number, axis: Vector3.ReadonlyVector3): MutableQuaternion;
    /**
     * Creates a new quaternion containing the rotation value to reach the target (axis1, axis2, axis3) orientation as a rotated XYZ system (axis1, axis2 and axis3 are normalized during this operation)
     * @param axis1 - defines the first axis
     * @param axis2 - defines the second axis
     * @param axis3 - defines the third axis
     * @returns the new quaternion
     */
    export function rotationQuaternionFromAxis(axis1: Vector3.ReadonlyVector3, axis2: Vector3.ReadonlyVector3, axis3: Vector3.ReadonlyVector3): MutableQuaternion;
    /**
     * Creates a rotation value to reach the target (axis1, axis2, axis3) orientation as a rotated XYZ system (axis1, axis2 and axis3 are normalized during this operation) and stores it in the target quaternion
     * @param axis1 - defines the first axis
     * @param axis2 - defines the second axis
     * @param axis3 - defines the third axis
     * @param ref - defines the target quaternion
     */
    export function rotationQuaternionFromAxisToRef(axis1: Vector3.ReadonlyVector3, axis2: Vector3.ReadonlyVector3, axis3: Vector3.ReadonlyVector3, ref: MutableQuaternion): void;
    /**
     * Returns a zero filled quaternion
     */
    export function Zero(): MutableQuaternion;
}

/**
 * Constant used to convert from radians to Euler degrees
 * @public
 */
declare const RAD2DEG: number;

/** @public */
declare const Raycast: ComponentDefinition<ISchema<PBRaycast>, PBRaycast>;

/** Position will be relative to the scene */
declare interface RaycastHit {
    position: Vector3_2 | undefined;
    origin: Vector3_2 | undefined;
    direction: Vector3_2 | undefined;
    normalHit: Vector3_2 | undefined;
    length: number;
    meshName?: string | undefined;
    entityId?: number | undefined;
}

declare const enum RaycastQueryType {
    HIT_FIRST = 0,
    QUERY_ALL = 1,
    UNRECOGNIZED = -1
}

/** @public */
declare const RaycastResult: ComponentDefinition<ISchema<PBRaycastResult>, PBRaycastResult>;

/**
 * @public
 */
declare type ReadonlyComponentSchema<T extends [ComponentDefinition, ...ComponentDefinition[]]> = {
    [K in keyof T]: T[K] extends ComponentDefinition ? ReturnType<T[K]['get']> : never;
};

/**
 * @public
 */
declare type ReadonlyPrimitive = number | string | number[] | string[] | boolean | boolean[];

declare type ReceiveMessage = {
    type: WireMessage.Enum;
    entity: Entity;
    componentId: number;
    timestamp: number;
    transportType?: string;
    data?: Uint8Array;
    messageBuffer: Uint8Array;
};

/**
 * @public
 */
declare type Result<T extends Spec> = ToOptional<{
    [K in keyof T]: T[K] extends ISchema ? ReturnType<T[K]['deserialize']> : T[K] extends Spec ? Result<T[K]> : never;
}>;

/**
 * @public
 */
declare namespace Schemas {
    export type SchemaType = ISchema;
    const Boolean: ISchema<boolean>;
    const String: ISchema<string>;
    const Float: ISchema<number>;
    const Double: ISchema<number>;
    const Byte: ISchema<number>;
    const Short: ISchema<number>;
    const Int: ISchema<number>;
    const Int64: ISchema<number>;
    const Number: ISchema<number>;
    const Enum: typeof IEnum;
    const Array: typeof IArray;
    const Map: typeof IMap;
    const Optional: typeof IOptional;
}

/**
 * @public
 */
declare type SdkComponents = ReturnType<typeof defineSdkComponents>;

/**
 * @public
 */
declare interface Spec {
    [key: string]: ISchema;
}

/** @public */
declare const SphereShape: ComponentDefinition<ISchema<PBSphereShape>, PBSphereShape>;

/**
 * @public
 */
declare type SystemFn = (dt: number) => void;

declare const enum TextAlign {
    Center = 0,
    Left = 1,
    Right = 2,
    UNRECOGNIZED = -1
}

/** @public */
declare const TextShape: ComponentDefinition<ISchema<PBTextShape>, PBTextShape>;

declare const enum TextureWrapMode {
    Repeat = 0,
    Clamp = 1,
    Mirror = 2,
    MirrorOnce = 3,
    UNRECOGNIZED = -1
}

declare type ToOptional<T> = OnlyOptionalUndefinedTypes<T> & OnlyNonUndefinedTypes<T>;

/** @public */
declare const Transform: ComponentDefinition<ISchema<TransformType>, Partial<TransformType>>;

/**
 * @public
 */
declare type TransformType = {
    position: {
        x: number;
        y: number;
        z: number;
    };
    rotation: {
        x: number;
        y: number;
        z: number;
        w: number;
    };
    scale: {
        x: number;
        y: number;
        z: number;
    };
    parent?: Entity;
};

declare const enum TransparencyMode {
    Opaque = 0,
    AlphaTest = 1,
    AlphaBlend = 2,
    AlphaTestAndAlphaBlend = 3,
    Auto = 4,
    UNRECOGNIZED = -1
}

declare type Transport = {
    type: string;
    send(message: Uint8Array): void;
    onmessage?(message: Uint8Array): void;
    filter(message: Omit<TransportMessage, 'messageBuffer'>): boolean;
};

declare type TransportMessage = Omit<ReceiveMessage, 'data'>;

declare type Uint32 = number;

/** @public */
declare const UiStyles: ComponentDefinition<ISchema<PBUiStyles>, PBUiStyles>;

/** @public */
declare const UiText: ComponentDefinition<ISchema<PBUiText>, PBUiText>;

/** @public */
declare const UiTransform: ComponentDefinition<ISchema<PBUiTransform>, PBUiTransform>;

/**
 * @public
 */
declare type Unpacked<T> = T extends (infer U)[] ? U : T;

/**
 * @public
 */
declare namespace Vector3 {
    /**
     * @public
     */
    export type MutableVector3 = {
        x: number;
        y: number;
        z: number;
    };
    /**
     * @public
     */
    export type ReadonlyVector3 = {
        readonly x: number;
        readonly y: number;
        readonly z: number;
    };
    /**
     * Gets a boolean indicating that the vector is non uniform meaning x, y or z are not all the same
     * @param vector - vector to check
     */
    export function isNonUniform(vector: ReadonlyVector3): boolean;
    /**
     * Creates a new Vector3 object from the given x, y, z (floats) coordinates.
     * @param x - defines the first coordinates (on X axis)
     * @param y - defines the second coordinates (on Y axis)
     * @param z - defines the third coordinates (on Z axis)
     */
    export function create(
    /**
     * Defines the first coordinates (on X axis)
     */
    x?: number, 
    /**
     * Defines the second coordinates (on Y axis)
     */
    y?: number, 
    /**
     * Defines the third coordinates (on Z axis)
     */
    z?: number): MutableVector3;
    /**
     * Returns a new Vector3 as the result of the addition of the two given vectors.
     * @param vector1 - the first vector
     * @param vector2 - the second vector
     * @returns the resulting vector
     */
    export function add(vector1: ReadonlyVector3, vector2: ReadonlyVector3): MutableVector3;
    /**
     * Add component by component the vector2 into dest
     * @param dest - the first vector and destination of addition
     * @param vector2 - the second vector
     */
    export function addToRef(vector1: ReadonlyVector3, vector2: ReadonlyVector3, result: MutableVector3): void;
    /**
     * Returns a new Vector3 as the result of the substraction of the two given vectors.
     * @returns the resulting vector
     */
    export function subtract(vector1: ReadonlyVector3, vector2: ReadonlyVector3): MutableVector3;
    /**
     * Returns a new Vector3 as the result of the substraction of the two given vectors.
     * @returns the resulting vector
     */
    export function subtractToRef(vector1: ReadonlyVector3, vector2: ReadonlyVector3, result: MutableVector3): void;
    /**
     * Subtracts the given floats from the current Vector3 coordinates and set the given vector "result" with this result
     * @param x - defines the x coordinate of the operand
     * @param y - defines the y coordinate of the operand
     * @param z - defines the z coordinate of the operand
     * @param result - defines the Vector3 object where to store the result
     */
    export function subtractFromFloatsToRef(vector1: ReadonlyVector3, x: number, y: number, z: number, result: MutableVector3): void;
    /**
     * Returns a new Vector3 with the other sign
     * @returns the resulting vector
     */
    export function negate(value: ReadonlyVector3): MutableVector3;
    /**
     * Copy source into dest
     *
     */
    export function copy(source: ReadonlyVector3, dest: MutableVector3): void;
    /**
     * Sets the given vector "dest" with the given floats.
     * @param x - defines the x coordinate of the source
     * @param y - defines the y coordinate of the source
     * @param z - defines the z coordinate of the source
     * @param dest - defines the Vector3 where to store the result
     */
    export function copyFromFloats(x: number, y: number, z: number, dest: MutableVector3): void;
    /**
     * Returns a new Vector3 with the same value
     * @returns the resulting vector
     */
    export function clone(source: ReadonlyVector3): MutableVector3;
    /**
     * Get the clip factor between two vectors
     * @param vector0 - defines the first operand
     * @param vector1 - defines the second operand
     * @param axis - defines the axis to use
     * @param size - defines the size along the axis
     * @returns the clip factor
     */
    export function getClipFactor(vector0: ReadonlyVector3, vector1: ReadonlyVector3, axis: ReadonlyVector3, size: number): number;
    /**
     * Get angle between two vectors
     * @param vector0 - angle between vector0 and vector1
     * @param vector1 - angle between vector0 and vector1
     * @param normal - direction of the normal
     * @returns the angle between vector0 and vector1
     */
    export function getAngleBetweenVectors(vector0: ReadonlyVector3, vector1: ReadonlyVector3, normal: ReadonlyVector3): number;
    /**
     * Returns a new Vector3 set from the index "offset" of the given array
     * @param array - defines the source array
     * @param offset - defines the offset in the source array
     * @returns the new Vector3
     */
    export function fromArray(array: FloatArray, offset?: number): MutableVector3;
    /**
     * Returns a new Vector3 set from the index "offset" of the given FloatArray
     * This function is deprecated.  Use FromArray instead
     * @param array - defines the source array
     * @param offset - defines the offset in the source array
     * @returns the new Vector3
     */
    export function fromFloatArray(array: FloatArray, offset?: number): MutableVector3;
    /**
     * Sets the given vector "result" with the element values from the index "offset" of the given array
     * @param array - defines the source array
     * @param offset - defines the offset in the source array
     * @param result - defines the Vector3 where to store the result
     */
    export function fromArrayToRef(array: number[], offset: number, result: MutableVector3): void;
    /**
     * Sets the given vector "result" with the element values from the index "offset" of the given FloatArray
     * This function is deprecated.  Use FromArrayToRef instead.
     * @param array - defines the source array
     * @param offset - defines the offset in the source array
     * @param result - defines the Vector3 where to store the result
     */
    export function fromFloatArrayToRef(array: FloatArray, offset: number, result: MutableVector3): void;
    /**
     * Gets the length of the Vector3
     * @returns the length of the Vecto3
     */
    export function length(vector: ReadonlyVector3): number;
    /**
     * Gets the squared length of the Vector3
     * @returns squared length of the Vector3
     */
    export function lengthSquared(vector: ReadonlyVector3): number;
    /**
     * Returns a new Vector3 set with the current Vector3 coordinates multiplied by the float "scale"
     * @param scale - defines the multiplier factor
     * @returns a new Vector3
     */
    export function scaleToRef(vector: ReadonlyVector3, scale: number, result: MutableVector3): void;
    /**
     * Returns a new Vector3 set with the current Vector3 coordinates multiplied by the float "scale"
     * @param scale - defines the multiplier factor
     * @returns a new Vector3
     */
    export function scale(vector: ReadonlyVector3, scale: number): MutableVector3;
    /**
     * Normalize the current Vector3 with the given input length.
     * Please note that this is an in place operation.
     * @param len - the length of the vector
     * @returns the current updated Vector3
     */
    export function normalizeFromLength(vector: ReadonlyVector3, len: number): MutableVector3;
    /**
     * Normalize the current Vector3 with the given input length.
     * Please note that this is an in place operation.
     * @param len - the length of the vector
     * @returns the current updated Vector3
     */
    export function normalizeFromLengthToRef(vector: ReadonlyVector3, len: number, result: MutableVector3): void;
    /**
     * Normalize the current Vector3.
     * Please note that this is an in place operation.
     * @returns the current updated Vector3
     */
    export function normalize(vector: ReadonlyVector3): MutableVector3;
    /**
     * Normalize the current Vector3.
     * Please note that this is an in place operation.
     * @returns the current updated Vector3
     */
    export function normalizeToRef(vector: ReadonlyVector3, result: MutableVector3): void;
    /**
     * Returns the dot product (float) between the vectors "left" and "right"
     * @param left - defines the left operand
     * @param right - defines the right operand
     * @returns the dot product
     */
    export function dot(left: ReadonlyVector3, right: ReadonlyVector3): number;
    /**
     * Multiplies this vector (with an implicit 1 in the 4th dimension) and m, and divides by perspective
     * @param matrix - The transformation matrix
     * @returns result Vector3
     */
    export function applyMatrix4(vector: ReadonlyVector3, matrix: Matrix.ReadonlyMatrix): MutableVector3;
    /**
     * Multiplies this vector (with an implicit 1 in the 4th dimension) and m, and divides by perspective and set the given vector "result" with this result
     * @param matrix - The transformation matrix
     * @param result - defines the Vector3 object where to store the result
     */
    export function applyMatrix4ToRef(vector: ReadonlyVector3, matrix: Matrix.ReadonlyMatrix, result: MutableVector3): void;
    /**
     * Rotates the current Vector3 based on the given quaternion
     * @param q - defines the Quaternion
     * @returns the current Vector3
     */
    export function rotate(vector: ReadonlyVector3, q: Quaternion.ReadonlyQuaternion): MutableVector3;
    /**
     * Rotates current Vector3 based on the given quaternion, but applies the rotation to target Vector3.
     * @param q - defines the Quaternion
     * @param result - defines the target Vector3
     * @returns the current Vector3
     */
    export function rotateToRef(vector: ReadonlyVector3, q: Quaternion.ReadonlyQuaternion, result: MutableVector3): void;
    /**
     * Returns a new Vector3 located for "amount" (float) on the linear interpolation between the vectors "start" and "end"
     * @param start - defines the start value
     * @param end - defines the end value
     * @param amount - max defines amount between both (between 0 and 1)
     * @returns the new Vector3
     */
    export function lerp(start: ReadonlyVector3, end: ReadonlyVector3, amount: number): MutableVector3;
    /**
     * Sets the given vector "result" with the result of the linear interpolation from the vector "start" for "amount" to the vector "end"
     * @param start - defines the start value
     * @param end - defines the end value
     * @param amount - max defines amount between both (between 0 and 1)
     * @param result - defines the Vector3 where to store the result
     */
    export function lerpToRef(start: ReadonlyVector3, end: ReadonlyVector3, amount: number, result: MutableVector3): void;
    /**
     * Returns a new Vector3 as the cross product of the vectors "left" and "right"
     * The cross product is then orthogonal to both "left" and "right"
     * @param left - defines the left operand
     * @param right - defines the right operand
     * @returns the cross product
     */
    export function cross(left: ReadonlyVector3, right: ReadonlyVector3): MutableVector3;
    /**
     * Sets the given vector "result" with the cross product of "left" and "right"
     * The cross product is then orthogonal to both "left" and "right"
     * @param left - defines the left operand
     * @param right - defines the right operand
     * @param result - defines the Vector3 where to store the result
     */
    export function crossToRef(left: ReadonlyVector3, right: ReadonlyVector3, result: MutableVector3): void;
    /**
     * Returns a new Vector3 set with the result of the transformation by the given matrix of the given vector.
     * This method computes tranformed coordinates only, not transformed direction vectors (ie. it takes translation in account)
     * @param vector - defines the Vector3 to transform
     * @param transformation - defines the transformation matrix
     * @returns the transformed Vector3
     */
    export function transformCoordinates(vector: ReadonlyVector3, transformation: Matrix.ReadonlyMatrix): MutableVector3;
    /**
     * Sets the given vector "result" coordinates with the result of the transformation by the given matrix of the given vector
     * This method computes tranformed coordinates only, not transformed direction vectors (ie. it takes translation in account)
     * @param vector - defines the Vector3 to transform
     * @param transformation - defines the transformation matrix
     * @param result - defines the Vector3 where to store the result
     */
    export function transformCoordinatesToRef(vector: ReadonlyVector3, transformation: Matrix.ReadonlyMatrix, result: MutableVector3): void;
    /**
     * Sets the given vector "result" coordinates with the result of the transformation by the given matrix of the given floats (x, y, z)
     * This method computes tranformed coordinates only, not transformed direction vectors
     * @param x - define the x coordinate of the source vector
     * @param y - define the y coordinate of the source vector
     * @param z - define the z coordinate of the source vector
     * @param transformation - defines the transformation matrix
     * @param result - defines the Vector3 where to store the result
     */
    export function transformCoordinatesFromFloatsToRef(x: number, y: number, z: number, transformation: Matrix.ReadonlyMatrix, result: MutableVector3): void;
    /**
     * Returns a new Vector3 set with the result of the normal transformation by the given matrix of the given vector
     * This methods computes transformed normalized direction vectors only (ie. it does not apply translation)
     * @param vector - defines the Vector3 to transform
     * @param transformation - defines the transformation matrix
     * @returns the new Vector3
     */
    export function transformNormal(vector: ReadonlyVector3, transformation: Matrix.ReadonlyMatrix): MutableVector3;
    /**
     * Sets the given vector "result" with the result of the normal transformation by the given matrix of the given vector
     * This methods computes transformed normalized direction vectors only (ie. it does not apply translation)
     * @param vector - defines the Vector3 to transform
     * @param transformation - defines the transformation matrix
     * @param result - defines the Vector3 where to store the result
     */
    export function transformNormalToRef(vector: ReadonlyVector3, transformation: Matrix.ReadonlyMatrix, result: MutableVector3): void;
    /**
     * Sets the given vector "result" with the result of the normal transformation by the given matrix of the given floats (x, y, z)
     * This methods computes transformed normalized direction vectors only (ie. it does not apply translation)
     * @param x - define the x coordinate of the source vector
     * @param y - define the y coordinate of the source vector
     * @param z - define the z coordinate of the source vector
     * @param transformation - defines the transformation matrix
     * @param result - defines the Vector3 where to store the result
     */
    export function transformNormalFromFloatsToRef(x: number, y: number, z: number, transformation: Matrix.ReadonlyMatrix, result: MutableVector3): void;
    /**
     * Returns a new Vector3 located for "amount" on the CatmullRom interpolation spline defined by the vectors "value1", "value2", "value3", "value4"
     * @param value1 - defines the first control point
     * @param value2 - defines the second control point
     * @param value3 - defines the third control point
     * @param value4 - defines the fourth control point
     * @param amount - defines the amount on the spline to use
     * @returns the new Vector3
     */
    export function catmullRom(value1: ReadonlyVector3, value2: ReadonlyVector3, value3: ReadonlyVector3, value4: ReadonlyVector3, amount: number): MutableVector3;
    /**
     * Returns a new Vector3 set with the coordinates of "value", if the vector "value" is in the cube defined by the vectors "min" and "max"
     * If a coordinate value of "value" is lower than one of the "min" coordinate, then this "value" coordinate is set with the "min" one
     * If a coordinate value of "value" is greater than one of the "max" coordinate, then this "value" coordinate is set with the "max" one
     * @param value - defines the current value
     * @param min - defines the lower range value
     * @param max - defines the upper range value
     * @returns the new Vector3
     */
    export function clamp(value: ReadonlyVector3, min: ReadonlyVector3, max: ReadonlyVector3): MutableVector3;
    /**
     * Sets the given vector "result" with the coordinates of "value", if the vector "value" is in the cube defined by the vectors "min" and "max"
     * If a coordinate value of "value" is lower than one of the "min" coordinate, then this "value" coordinate is set with the "min" one
     * If a coordinate value of "value" is greater than one of the "max" coordinate, then this "value" coordinate is set with the "max" one
     * @param value - defines the current value
     * @param min - defines the lower range value
     * @param max - defines the upper range value
     * @param result - defines the Vector3 where to store the result
     */
    export function clampToRef(value: ReadonlyVector3, min: ReadonlyVector3, max: ReadonlyVector3, result: MutableVector3): void;
    /**
     * Returns a new Vector3 located for "amount" (float) on the Hermite interpolation spline defined by the vectors "value1", "tangent1", "value2", "tangent2"
     * @param value1 - defines the first control point
     * @param tangent1 - defines the first tangent vector
     * @param value2 - defines the second control point
     * @param tangent2 - defines the second tangent vector
     * @param amount - defines the amount on the interpolation spline (between 0 and 1)
     * @returns the new Vector3
     */
    export function hermite(value1: ReadonlyVector3, tangent1: ReadonlyVector3, value2: ReadonlyVector3, tangent2: ReadonlyVector3, amount: number): MutableVector3;
    /**
     * Gets the minimal coordinate values between two Vector3
     * @param left - defines the first operand
     * @param right - defines the second operand
     * @returns the new Vector3
     */
    export function minimize(left: ReadonlyVector3, right: ReadonlyVector3): MutableVector3;
    /**
     * Gets the maximal coordinate values between two Vector3
     * @param left - defines the first operand
     * @param right - defines the second operand
     * @returns the new Vector3
     */
    export function maximize(left: MutableVector3, right: MutableVector3): MutableVector3;
    /**
     * Returns the distance between the vectors "value1" and "value2"
     * @param value1 - defines the first operand
     * @param value2 - defines the second operand
     * @returns the distance
     */
    export function distance(value1: ReadonlyVector3, value2: ReadonlyVector3): number;
    /**
     * Returns the squared distance between the vectors "value1" and "value2"
     * @param value1 - defines the first operand
     * @param value2 - defines the second operand
     * @returns the squared distance
     */
    export function distanceSquared(value1: ReadonlyVector3, value2: ReadonlyVector3): number;
    /**
     * Returns a new Vector3 located at the center between "value1" and "value2"
     * @param value1 - defines the first operand
     * @param value2 - defines the second operand
     * @returns the new Vector3
     */
    export function center(value1: ReadonlyVector3, value2: ReadonlyVector3): MutableVector3;
    /**
     * Given three orthogonal normalized left-handed oriented Vector3 axis in space (target system),
     * RotationFromAxis() returns the rotation Euler angles (ex : rotation.x, rotation.y, rotation.z) to apply
     * to something in order to rotate it from its local system to the given target system
     * Note: axis1, axis2 and axis3 are normalized during this operation
     * @param axis1 - defines the first axis
     * @param axis2 - defines the second axis
     * @param axis3 - defines the third axis
     * @returns a new Vector3
     */
    export function rotationFromAxis(axis1: MutableVector3, axis2: MutableVector3, axis3: MutableVector3): MutableVector3;
    /**
     * The same than RotationFromAxis but updates the given ref Vector3 parameter instead of returning a new Vector3
     * @param axis1 - defines the first axis
     * @param axis2 - defines the second axis
     * @param axis3 - defines the third axis
     * @param ref - defines the Vector3 where to store the result
     */
    export function rotationFromAxisToRef(axis1: MutableVector3, axis2: MutableVector3, axis3: MutableVector3, result: MutableVector3): void;
    /**
     * Creates a string representation of the Vector3
     * @returns a string with the Vector3 coordinates.
     */
    export function toString(vector: ReadonlyVector3): string;
    /**
     * Creates the Vector3 hash code
     * @returns a number which tends to be unique between Vector3 instances
     */
    export function getHashCode(vector: ReadonlyVector3): number;
    /**
     * Returns true if the vector1 and the vector2 coordinates are strictly equal
     * @param vector1 - defines the first operand
     * @param vector2 - defines the second operand
     * @returns true if both vectors are equals
     */
    export function equals(vector1: ReadonlyVector3, vector2: ReadonlyVector3): boolean;
    /**
     * Returns true if the current Vector3 and the given vector coordinates are distant less than epsilon
     * @param otherVector - defines the second operand
     * @param epsilon - defines the minimal distance to define values as equals
     * @returns true if both vectors are distant less than epsilon
     */
    export function equalsWithEpsilon(vector1: ReadonlyVector3, vector2: ReadonlyVector3, epsilon?: number): boolean;
    /**
     * Returns true if the current Vector3 coordinates equals the given floats
     * @param x - defines the x coordinate of the operand
     * @param y - defines the y coordinate of the operand
     * @param z - defines the z coordinate of the operand
     * @returns true if both vectors are equals
     */
    export function equalsToFloats(vector: ReadonlyVector3, x: number, y: number, z: number): boolean;
    /**
     * Returns a new Vector3, result of the multiplication of vector1 by the vector2
     * @param vector1 - defines the first operand
     * @param vector2 - defines the second operand
     * @returns the new Vector3
     */
    export function multiply(vector1: ReadonlyVector3, vector2: ReadonlyVector3): MutableVector3;
    /**
     * Multiplies the current Vector3 by the given one and stores the result in the given vector "result"
     * @param otherVector - defines the second operand
     * @param result - defines the Vector3 object where to store the result
     * @returns the current Vector3
     */
    export function multiplyToRef(vector1: ReadonlyVector3, vector2: ReadonlyVector3, result: MutableVector3): void;
    /**
     * Returns a new Vector3 set with the result of the mulliplication of the current Vector3 coordinates by the given floats
     * @param x - defines the x coordinate of the operand
     * @param y - defines the y coordinate of the operand
     * @param z - defines the z coordinate of the operand
     * @returns the new Vector3
     */
    export function multiplyByFloatsToRef(vector1: ReadonlyVector3, x: number, y: number, z: number, result: MutableVector3): void;
    /**
     * Returns a new Vector3 set with the result of the mulliplication of the current Vector3 coordinates by the given floats
     * @param x - defines the x coordinate of the operand
     * @param y - defines the y coordinate of the operand
     * @param z - defines the z coordinate of the operand
     * @returns the new Vector3
     */
    export function multiplyByFloats(vector1: ReadonlyVector3, x: number, y: number, z: number): MutableVector3;
    /**
     * Returns a new Vector3 set with the result of the division of the current Vector3 coordinates by the given ones
     * @param otherVector - defines the second operand
     * @returns the new Vector3
     */
    export function divide(vector1: ReadonlyVector3, vector2: ReadonlyVector3): MutableVector3;
    /**
     * Divides the current Vector3 coordinates by the given ones and stores the result in the given vector "result"
     * @param otherVector - defines the second operand
     * @param result - defines the Vector3 object where to store the result
     * @returns the current Vector3
     */
    export function divideToRef(vector1: ReadonlyVector3, vector2: ReadonlyVector3, result: MutableVector3): void;
    /**
     * Set result Vector3 with the maximal coordinate values between vector1 and the given coordinates
     * @param x - defines the x coordinate of the operand
     * @param y - defines the y coordinate of the operand
     * @param z - defines the z coordinate of the operand
     * @param result - the set Vector3
     */
    export function maximizeInPlaceFromFloatsToRef(vector1: ReadonlyVector3, x: number, y: number, z: number, result: MutableVector3): void;
    /**
     * Set result Vector3 with the minimal coordinate values between vector1 and the given coordinates
     * @param x - defines the x coordinate of the operand
     * @param y - defines the y coordinate of the operand
     * @param z - defines the z coordinate of the operand
     * @param result - the set Vector3
     */
    export function minimizeInPlaceFromFloatsToRef(vector1: ReadonlyVector3, x: number, y: number, z: number, result: MutableVector3): void;
    /**
     * Gets a new Vector3 from vector1 floored values
     * @returns a new Vector3
     */
    export function floor(vector1: ReadonlyVector3): MutableVector3;
    /**
     * Gets a new Vector3 from vector1 floored values
     * @returns a new Vector3
     */
    export function fract(vector1: ReadonlyVector3): MutableVector3;
    /**
     * Returns a new Vector3 set to (0.0, 0.0, 0.0)
     * @returns a new empty Vector3
     */
    export function Zero(): MutableVector3;
    /**
     * Returns a new Vector3 set to (1.0, 1.0, 1.0)
     * @returns a new unit Vector3
     */
    export function One(): MutableVector3;
    /**
     * Returns a new Vector3 set tolengthSquared (0.0, 1.0, 0.0)
     * @returns a new up Vector3
     */
    export function Up(): MutableVector3;
    /**
     * Returns a new Vector3 set to (0.0, -1.0, 0.0)
     * @returns a new down Vector3
     */
    export function Down(): MutableVector3;
    /**
     * Returns a new Vector3 set to (0.0, 0.0, 1.0)
     * @returns a new forward Vector3
     */
    export function Forward(): MutableVector3;
    /**
     * Returns a new Vector3 set to (0.0, 0.0, -1.0)
     * @returns a new forward Vector3
     */
    export function Backward(): MutableVector3;
    /**
     * Returns a new Vector3 set to (1.0, 0.0, 0.0)
     * @returns a new right Vector3
     */
    export function Right(): MutableVector3;
    /**
     * Returns a new Vector3 set to (-1.0, 0.0, 0.0)
     * @returns a new left Vector3
     */
    export function Left(): MutableVector3;
    /**
     * Returns a new random Vector3
     * @returns a random Vector3
     */
    export function Random(): MutableVector3;
}

declare interface Vector3_2 {
    x: number;
    y: number;
    z: number;
}

/** @public */
declare const VisibilityComponent: ComponentDefinition<ISchema<PBVisibilityComponent>, PBVisibilityComponent>;

/**
 * Check if an entity emitted a clicked event
 * @param entity the entity to query, for global clicks use `engine.RootEntity`
 * @param actionButton
 * @returns true if the entity was clicked in the last tick-update
 */
declare function wasEntityClicked(entity: Entity, actionButton: ActionButton): boolean;

declare function wasEntityClickedGenerator(engine: IEngine): (entity: Entity, actionButton: ActionButton) => boolean;

declare namespace WireMessage {
    enum Enum {
        RESERVED = 0,
        PUT_COMPONENT = 1,
        DELETE_COMPONENT = 2,
        MAX_MESSAGE_TYPE = 3
    }
    /**
     * @param length - Uint32 the length of all message (including the header)
     * @param type - define the function which handles the data
     */
    type Header = {
        length: Uint32;
        type: Uint32;
    };
    const HEADER_LENGTH = 8;
    /**
     * Validate if the message incoming is completed
     * @param buf - ByteBuffer
     */
    function validate(buf: ByteBuffer): boolean;
    function readHeader(buf: ByteBuffer): Header | null;
}

declare const enum YGAlign {
    YGAlignAuto = 0,
    YGAlignFlexStart = 1,
    YGAlignCenter = 2,
    YGAlignFlexEnd = 3,
    YGAlignStretch = 4,
    YGAlignBaseline = 5,
    YGAlignSpaceBetween = 6,
    YGAlignSpaceAround = 7,
    UNRECOGNIZED = -1
}

declare const enum YGDirection {
    YGDirectionInherit = 0,
    YGDirectionLTR = 1,
    YGDirectionRTL = 2,
    UNRECOGNIZED = -1
}

declare const enum YGDisplay {
    YGDisplayFlex = 0,
    YGDisplayNone = 1,
    UNRECOGNIZED = -1
}

declare const enum YGFlexDirection {
    YGFlexDirectionColumn = 0,
    YGFlexDirectionColumnReverse = 1,
    YGFlexDirectionRow = 2,
    YGFlexDirectionRowReverse = 3,
    UNRECOGNIZED = -1
}

declare const enum YGJustify {
    YGJustifyFlexStart = 0,
    YGJustifyCenter = 1,
    YGJustifyFlexEnd = 2,
    YGJustifySpaceBetween = 3,
    YGJustifySpaceAround = 4,
    YGJustifySpaceEvenly = 5,
    UNRECOGNIZED = -1
}

declare const enum YGOverflow {
    YGOverflowVisible = 0,
    YGOverflowHidden = 1,
    YGOverflowScroll = 2,
    UNRECOGNIZED = -1
}

declare const enum YGPositionType {
    YGPositionTypeStatic = 0,
    YGPositionTypeRelative = 1,
    YGPositionTypeAbsolute = 2,
    UNRECOGNIZED = -1
}

declare const enum YGUnit {
    YGUnitUndefined = 0,
    YGUnitPoint = 1,
    YGUnitPercent = 2,
    YGUnitAuto = 3,
    UNRECOGNIZED = -1
}

declare const enum YGWrap {
    YGWrapNoWrap = 0,
    YGWrapWrap = 1,
    YGWrapWrapReverse = 2,
    UNRECOGNIZED = -1
}


