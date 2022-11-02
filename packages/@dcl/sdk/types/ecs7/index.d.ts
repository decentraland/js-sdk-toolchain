/// <reference types="@dcl/posix" />

/** @public */
declare const Animator: ComponentDefinition<ISchema<PBAnimator>, PBAnimator>;

/** @public */
declare const AudioSource: ComponentDefinition<ISchema<PBAudioSource>, PBAudioSource>;

/** @public */
declare const AudioStream: ComponentDefinition<ISchema<PBAudioStream>, PBAudioStream>;

declare const enum AvatarAnchorPointType {
    AAPT_POSITION = 0,
    AAPT_NAME_TAG = 1,
    AAPT_LEFT_HAND = 2,
    AAPT_RIGHT_HAND = 3
}

/** @public */
declare const AvatarAttach: ComponentDefinition<ISchema<PBAvatarAttach>, PBAvatarAttach>;

/** @public */
declare const AvatarModifierArea: ComponentDefinition<ISchema<PBAvatarModifierArea>, PBAvatarModifierArea>;

declare const enum AvatarModifierType {
    AMT_HIDE_AVATARS = 0,
    AMT_DISABLE_PASSPORTS = 1
}

/** @public */
declare const AvatarShape: ComponentDefinition<ISchema<PBAvatarShape>, PBAvatarShape>;

declare interface AvatarTexture {
    userId: string;
    /** default = TextureWrapMode.Clamp */
    wrapMode?: TextureWrapMode | undefined;
    /** default = FilterMode.Bilinear */
    filterMode?: TextureFilterMode | undefined;
}

/** @public */
declare const Billboard: ComponentDefinition<ISchema<PBBillboard>, PBBillboard>;

declare const enum BillboardMode {
    BM_ALL_AXES = 0,
    BM_Y_AXE = 1
}

/**
 * @public
 */
declare type ByteBuffer = ReturnType<typeof createByteBuffer>;

/** @public */
declare const CameraMode: ComponentDefinition<ISchema<PBCameraMode>, PBCameraMode>;

/** @public */
declare const CameraModeArea: ComponentDefinition<ISchema<PBCameraModeArea>, PBCameraModeArea>;

declare const enum CameraType {
    CT_FIRST_PERSON = 0,
    CT_THIRD_PERSON = 1
}

declare const enum ColliderLayer {
    CL_NONE = 0,
    CL_POINTER = 1,
    CL_PHYSICS = 2
}

/**
 * @public
 * Color3 is a type and a namespace.
 * - The namespace contains all types and functions to operates with Color3
 * - The type Color3 is an alias to Color3.ReadonlyColor3
 * ```
 *
 * // Namespace usage example
 * Color3.add(blue, red) // sum component by component resulting pink
 *
 * // Type usage example
 * const readonlyBlue: Color3 = Color3.Blue()
 * readonlyBlue.r = 0.1 // this FAILS
 *
 * // For mutable usage, use `Color3.Mutable`
 * const blue: Color3.Mutable = Color3.Blue()
 * blue.r = 0.1 // this WORKS
 * ```
 */
declare type Color3 = Color3.ReadonlyColor3;

/**
 * @public
 * Color3 is a type and a namespace.
 * ```
 * // The namespace contains all types and functions to operates with Color3
 * Color3.add(blue, red) // sum component by component resulting pink
 * // The type Color3 is an alias to Color3.ReadonlyColor3
 * const readonlyBlue: Color3 = Color3.Blue()
 * readonlyBlue.r = 0.1 // this FAILS
 *
 * // For mutable usage, use `Color3.Mutable`
 * const blue: Color3.Mutable = Color3.Blue()
 * blue.r = 0.1 // this WORKS
 * ```
 */
declare namespace Color3 {
    /**
     * @public
     * For external use, type with `Color3`, e.g. `const blackColor: Color3 = Color3.Black()`.
     * For mutable typing, use `Color3.Mutable`, e.g. `const redColor: Color3.Mutable = Color3.Red()`.
     */
    export type ReadonlyColor3 = {
        readonly r: number;
        readonly g: number;
        readonly b: number;
    };
    /**
     * @public
     * For external usage, type with `Color3`, e.g. `const blackColor: Color3 = Color3.Black()`.
     * For mutable typing, use `Color3.Mutable`, e.g. `const redColor: Color3.Mutable = Color3.Red()`.
     */
    export type MutableColor3 = {
        r: number;
        g: number;
        b: number;
    };
    /**
     * @public
     * Type with `Color3` for readonly usage, e.g. `const blackColor: Color3 = Color3.Black()`.
     * For mutable, use `Color3.Mutable`, e.g. `const redColor: Color3.Mutable = Color3.Red()`.
     */
    export type Mutable = MutableColor3;
    /**
     * Creates Color3 object from red, green, blue values, all between 0 and 1
     * @param r - defines the red component (between 0 and 1, default is 0)
     * @param g - defines the green component (between 0 and 1, default is 0)
     * @param b - defines the blue component (between 0 and 1, default is 0)
     */
    export function create(
    /**
     * Defines the red component (between 0 and 1, default is 0)
     */
    r?: number, 
    /**
     * Defines the green component (between 0 and 1, default is 0)
     */
    g?: number, 
    /**
     * Defines the blue component (between 0 and 1, default is 0)
     */
    b?: number): {
        r: number;
        g: number;
        b: number;
    };
    /**
     * Creates a Vector3 from the string containing valid hexadecimal values
     * @param hex - defines a string containing valid hexadecimal values
     * @returns a new Vector3
     */
    export function fromHexString(hex: string): MutableColor3;
    /**
     * Creates a new Vector3 from the starting index of the given array
     * @param array - defines the source array
     * @param offset - defines an offset in the source array
     * @returns a new Vector3
     */
    export function fromArray(array: ArrayLike<number>, offset?: number): MutableColor3;
    /**
     * Creates a Vector3 from integer values (less than 256)
     * @param r - defines the red component to read from (value between 0 and 255)
     * @param g - defines the green component to read from (value between 0 and 255)
     * @param b - defines the blue component to read from (value between 0 and 255)
     * @returns a new Vector3
     */
    export function fromInts(r: number, g: number, b: number): MutableColor3;
    /**
     * Creates a Vector3 with values linearly interpolated of "amount" between the start Color3 and the end Color3
     * @param start - defines the start Color3 value
     * @param end - defines the end Color3 value
     * @param amount - defines the gradient value between start and end
     * @returns a new Vector3
     */
    export function lerp(start: ReadonlyColor3, end: ReadonlyColor3, amount: number): MutableColor3;
    /**
     * Creates a Vector3 with values linearly interpolated of "amount" between the start Color3 and the end Color3
     * @param left - defines the start value
     * @param right - defines the end value
     * @param amount - defines the gradient factor
     * @param result - defines the Color3 object where to store the result
     */
    export function lerpToRef(left: ReadonlyColor3, right: ReadonlyColor3, amount: number, result: MutableColor3): void;
    /**
     * Returns a Color3 value containing a red color
     * @returns a new Vector3
     */
    export function Red(): MutableColor3;
    /**
     * Returns a Color3 value containing a green color
     * @returns a new Vector3
     */
    export function Green(): MutableColor3;
    /**
     * Returns a Color3 value containing a blue color
     * @returns a new Vector3
     */
    export function Blue(): MutableColor3;
    /**
     * Returns a Color3 value containing a black color
     * @returns a new Vector3
     */
    export function Black(): MutableColor3;
    /**
     * Returns a Color3 value containing a white color
     * @returns a new Vector3
     */
    export function White(): MutableColor3;
    /**
     * Returns a Color3 value containing a purple color
     * @returns a new Vector3
     */
    export function Purple(): MutableColor3;
    /**
     * Returns a Color3 value containing a magenta color
     * @returns a new Vector3
     */
    export function Magenta(): MutableColor3;
    /**
     * Returns a Color3 value containing a yellow color
     * @returns a new Vector3
     */
    export function Yellow(): MutableColor3;
    /**
     * Returns a Color3 value containing a gray color
     * @returns a new Vector3
     */
    export function Gray(): MutableColor3;
    /**
     * Returns a Color3 value containing a teal color
     * @returns a new Vector3
     */
    export function Teal(): MutableColor3;
    /**
     * Returns a Color3 value containing a random color
     * @returns a new Vector3
     */
    export function Random(): MutableColor3;
    /**
     * Creates a string with the Color3 current values
     * @returns the string representation of the Color3 object
     */
    export function toString(value: ReadonlyColor3): string;
    /**
     * Compute the Color3 hash code
     * @returns an unique number that can be used to hash Color3 objects
     */
    export function getHashCode(value: ReadonlyColor3): number;
    /**
     * Stores in the given array from the given starting index the red, green, blue values as successive elements
     * @param array - defines the array where to store the r,g,b components
     * @param index - defines an optional index in the target array to define where to start storing values
     *
     */
    export function toArray(value: ReadonlyColor3, array: FloatArray, index?: number): void;
    /**
     * Returns a new Color4 object from the current Color3 and the given alpha
     * @param alpha - defines the alpha component on the new Color4 object (default is 1)
     * @returns a new Color4 object
     */
    export function toColor4(value: ReadonlyColor3, alpha?: number): Color4.MutableColor4;
    /**
     * Returns a new array populated with 3 numeric elements : red, green and blue values
     * @returns the new array
     */
    export function asArray(value: ReadonlyColor3): number[];
    /**
     * Returns the luminance value
     * @returns a float value
     */
    export function toLuminance(value: ReadonlyColor3): number;
    /**
     * Multiply each Color3 rgb values by the given Color3 rgb values in Color3 object
     * @param otherColor - defines the second operand
     * @returns the create object
     */
    export function multiply(value: ReadonlyColor3, otherColor: ReadonlyColor3): MutableColor3;
    /**
     * Multiply the rgb values of the Color3 and the given Color3 and stores the result in the object "result"
     * @param otherColor - defines the second operand
     * @param result - defines the Color3 object where to store the result
     * @returns the current Color3
     */
    export function multiplyToRef(value: ReadonlyColor3, otherColor: ReadonlyColor3, result: MutableColor3): void;
    /**
     * Determines equality between Color3 objects
     * @param otherColor - defines the second operand
     * @returns true if the rgb values are equal to the given ones
     */
    export function equals(value: ReadonlyColor3, otherColor: ReadonlyColor3): boolean;
    /**
     * Determines equality between the current Color3 object and a set of r,b,g values
     * @param r - defines the red component to check
     * @param g - defines the green component to check
     * @param b - defines the blue component to check
     * @returns true if the rgb values are equal to the given ones
     */
    export function equalsFloats(value: ReadonlyColor3, r: number, g: number, b: number): boolean;
    /**
     * Multiplies in place each rgb value by scale
     * @param scale - defines the scaling factor
     * @returns the updated Color3
     */
    export function scale(value: ReadonlyColor3, scale: number): MutableColor3;
    /**
     * Multiplies the rgb values by scale and stores the result into "result"
     * @param scale - defines the scaling factor
     * @param result - defines the Color3 object where to store the result
     * @returns the unmodified current Color3
     */
    export function scaleToRef(value: ReadonlyColor3, scale: number, result: MutableColor3): void;
    /**
     * Scale the current Color3 values by a factor and add the result to a given Color3
     * @param scale - defines the scale factor
     * @param result - defines color to store the result into
     * @returns the unmodified current Color3
     */
    export function scaleAndAddToRef(value: ReadonlyColor3, scale: number, result: MutableColor3): void;
    /**
     * Clamps the rgb values by the min and max values and stores the result into "result"
     * @param min - defines minimum clamping value (default is 0)
     * @param max - defines maximum clamping value (default is 1)
     * @param result - defines color to store the result into
     * @returns the original Color3
     */
    export function clampToRef(value: ReadonlyColor3, min: number | undefined, max: number | undefined, result: MutableColor3): void;
    /**
     * Clamps the rgb values by the min and max values and returns the result
     * @param min - defines minimum clamping value (default is 0)
     * @param max - defines maximum clamping value (default is 1)
     * @returns result
     */
    export function clamp(value: ReadonlyColor3, min?: number, max?: number): MutableColor3;
    /**
     * Creates Color3 set with the added values of the current Color3 and of the given one
     * @param otherColor - defines the second operand
     * @returns the create
     */
    export function add(value: ReadonlyColor3, otherColor: ReadonlyColor3): MutableColor3;
    /**
     * Stores the result of the addition of the current Color3 and given one rgb values into "result"
     * @param otherColor - defines the second operand
     * @param result - defines Color3 object to store the result into
     * @returns the unmodified current Color3
     */
    export function addToRef(value: ReadonlyColor3, otherColor: ReadonlyColor3, result: MutableColor3): void;
    /**
     * Returns Color3 set with the subtracted values of the given one from the current Color3
     * @param otherColor - defines the second operand
     * @returns the create
     */
    export function subtract(value: ReadonlyColor3, otherColor: ReadonlyColor3): MutableColor3;
    /**
     * Stores the result of the subtraction of given one from the current Color3 rgb values into "result"
     * @param otherColor - defines the second operand
     * @param result - defines Color3 object to store the result into
     * @returns the unmodified current Color3
     */
    export function subtractToRef(value: ReadonlyColor3, otherColor: ReadonlyColor3, result: MutableColor3): void;
    /**
     * Copy the current object
     * @returns Color3 copied the current one
     */
    export function clone(value: ReadonlyColor3): MutableColor3;
    /**
     * Copies the rgb values from the source in the current Color3
     * @param source - defines the source Color3 object
     * @returns the updated Color3 object
     */
    export function copyFrom(source: ReadonlyColor3, dest: MutableColor3): void;
    /**
     * Updates the Color3 rgb values from the given floats
     * @param dest -
     * @param r - defines the red component to read from
     * @param g - defines the green component to read from
     * @param b - defines the blue component to read from
     * @returns
     */
    export function set(dest: MutableColor3, r: number, g: number, b: number): void;
    /**
     * Compute the Color3 hexadecimal code as a string
     * @returns a string containing the hexadecimal representation of the Color3 object
     */
    export function toHexString(value: ReadonlyColor3): string;
    /**
     * Computes Color3 converted from the current one to linear space
     * @returns a new Vector3
     */
    export function toLinearSpace(value: ReadonlyColor3): MutableColor3;
    /**
     * Converts the Color3 values to linear space and stores the result in "convertedColor"
     * @param convertedColor - defines the Color3 object where to store the linear space version
     * @returns the unmodified Color3
     */
    export function toLinearSpaceToRef(value: ReadonlyColor3, convertedColor: MutableColor3): void;
    /**
     * Computes Color3 converted from the current one to gamma space
     * @returns a new Vector3
     */
    export function toGammaSpace(value: ReadonlyColor3): ReadonlyColor3;
    /**
     * Converts the Color3 values to gamma space and stores the result in "convertedColor"
     * @param convertedColor - defines the Color3 object where to store the gamma space version
     * @returns the unmodified Color3
     */
    export function toGammaSpaceToRef(value: ReadonlyColor3, convertedColor: MutableColor3): void;
}

declare interface Color3_2 {
    r: number;
    g: number;
    b: number;
}

/**
 * @public
 */
declare type Color3Type = {
    r: number;
    g: number;
    b: number;
};

/**
 * @public
 * Color4 is a type and a namespace.
 * - The namespace contains all types and functions to operates with Color4
 * - The type Color4 is an alias to Color4.ReadonlyColor4
 * ```
 *
 * // Namespace usage example
 * Color4.add(blue, red) // sum component by component resulting pink
 *
 * // Type usage example
 * const readonlyBlue: Color4 = Color4.Blue()
 * readonlyBlue.a = 0.1 // this FAILS
 *
 * // For mutable usage, use `Color4.Mutable`
 * const blue: Color4.Mutable = Color4.Blue()
 * blue.a = 0.1 // this WORKS
 * ```
 */
declare type Color4 = Color4.ReadonlyColor4;

/**
 * @public
 * Color4 is a type and a namespace.
 * ```
 * // The namespace contains all types and functions to operates with Color4
 * Color4.add(blue, red) // sum component by component resulting pink
 * // The type Color4 is an alias to Color4.ReadonlyColor4
 * const readonlyBlue: Color4 = Color4.Blue()
 * readonlyBlue.a = 0.1 // this FAILS
 *
 * // For mutable usage, use `Color4.Mutable`
 * const blue: Color4.Mutable = Color4.Blue()
 * blue.a = 0.1 // this WORKS
 * ```
 */
declare namespace Color4 {
    /**
     * @public
     * For external use, type with `Color4`, e.g. `const blackColor: Color4 = Color4.Black()`.
     * For mutable typing, use `Color4.Mutable`, e.g. `const redColor: Color4.Mutable = Color4.Red()`.
     */
    export type ReadonlyColor4 = {
        readonly r: number;
        readonly g: number;
        readonly b: number;
        readonly a: number;
    };
    /**
     * @public
     * For external usage, type with `Color4`, e.g. `const blackColor: Color4 = Color4.Black()`.
     * For mutable typing, use `Color4.Mutable`, e.g. `const redColor: Color4.Mutable = Color4.Red()`.
     */
    export type MutableColor4 = {
        r: number;
        g: number;
        b: number;
        a: number;
    };
    /**
     * @public
     * Type with `Color4` for readonly usage, e.g. `const blackColor: Color4 = Color4.Black()`.
     * For mutable, use `Color4.Mutable`, e.g. `const redColor: Color4.Mutable = Color4.Red()`.
     */
    export type Mutable = MutableColor4;
    /**
     * Creates create mutable Color4 from red, green, blue values, all between 0 and 1
     * @param r - defines the red component (between 0 and 1, default is 0)
     * @param g - defines the green component (between 0 and 1, default is 0)
     * @param b - defines the blue component (between 0 and 1, default is 0)
     * @param a - defines the alpha component (between 0 and 1, default is 1)
     */
    export function create(
    /**
     * Defines the red component (between 0 and 1, default is 0)
     */
    r?: number, 
    /**
     * Defines the green component (between 0 and 1, default is 0)
     */
    g?: number, 
    /**
     * Defines the blue component (between 0 and 1, default is 0)
     */
    b?: number, 
    /**
     * Defines the alpha component (between 0 and 1, default is 1)
     */
    a?: number): MutableColor4;
    /**
     * Creates a Color4 from the string containing valid hexadecimal values
     * @param hex - defines a string containing valid hexadecimal values
     * @returns create mutable Color4
     */
    export function fromHexString(hex: string): MutableColor4;
    /**
     * Creates create mutable Color4  set with the linearly interpolated values of "amount" between the left Color4 object and the right Color4 object
     * @param left - defines the start value
     * @param right - defines the end value
     * @param amount - defines the gradient factor
     * @returns create mutable Color4
     */
    export function lerp(left: ReadonlyColor4, right: ReadonlyColor4, amount: number): MutableColor4;
    /**
     * Set the given "result" with the linearly interpolated values of "amount" between the left Color4 object and the right Color4 object
     * @param left - defines the start value
     * @param right - defines the end value
     * @param amount - defines the gradient factor
     * @param result - defines the Color4 object where to store data
     */
    export function lerpToRef(left: ReadonlyColor4, right: ReadonlyColor4, amount: number, result: MutableColor4): void;
    /**
     * Returns a Color4 value containing a red color
     * @returns a new Color4
     */
    export function Red(): MutableColor4;
    /**
     * Returns a Color4 value containing a green color
     * @returns create mutable Color4
     */
    export function Green(): MutableColor4;
    /**
     * Returns a Color4 value containing a blue color
     * @returns create mutable Color4
     */
    export function Blue(): MutableColor4;
    /**
     * Returns a Color4 value containing a black color
     * @returns create mutable Color4
     */
    export function Black(): MutableColor4;
    /**
     * Returns a Color4 value containing a white color
     * @returns create mutable Color4
     */
    export function White(): MutableColor4;
    /**
     * Returns a Color4 value containing a purple color
     * @returns create mutable Color4
     */
    export function Purple(): MutableColor4;
    /**
     * Returns a Color4 value containing a magenta color
     * @returns create mutable Color4
     */
    export function Magenta(): MutableColor4;
    /**
     * Returns a Color4 value containing a yellow color
     * @returns create mutable Color4
     */
    export function Yellow(): MutableColor4;
    /**
     * Returns a Color4 value containing a gray color
     * @returns create mutable Color4
     */
    export function Gray(): MutableColor4;
    /**
     * Returns a Color4 value containing a teal color
     * @returns create mutable Color4
     */
    export function Teal(): MutableColor4;
    /**
     * Returns a Color4 value containing a transparent color
     * @returns create mutable Color4
     */
    export function Clear(): MutableColor4;
    /**
     * Creates a Color4 from a Color3 and an alpha value
     * @param color3 - defines the source Color3 to read from
     * @param alpha - defines the alpha component (1.0 by default)
     * @returns create mutable Color4
     */
    export function fromColor3(color3: Color3.ReadonlyColor3, alpha?: number): MutableColor4;
    /**
     * Creates a Color4 from the starting index element of the given array
     * @param array - defines the source array to read from
     * @param offset - defines the offset in the source array
     * @returns create mutable Color4
     */
    export function fromArray(array: ArrayLike<number>, offset?: number): ReadonlyColor4;
    /**
     * Creates a new Color3 from integer values (less than 256)
     * @param r - defines the red component to read from (value between 0 and 255)
     * @param g - defines the green component to read from (value between 0 and 255)
     * @param b - defines the blue component to read from (value between 0 and 255)
     * @param a - defines the alpha component to read from (value between 0 and 255)
     * @returns a new Color4
     */
    export function fromInts(r: number, g: number, b: number, a: number): MutableColor4;
    /**
     * Check the content of a given array and convert it to an array containing RGBA data
     * If the original array was already containing count * 4 values then it is returned directly
     * @param colors - defines the array to check
     * @param count - defines the number of RGBA data to expect
     * @returns an array containing count * 4 values (RGBA)
     */
    export function checkColors4(colors: number[], count: number): number[];
    /**
     * Adds  the given Color4 values to the ref Color4 object
     * @param a - defines the first operand
     * @param b - defines the second operand
     * @param ref - defines the result rference
     * @returns
     */
    export function addToRef(a: ReadonlyColor4, b: ReadonlyColor4, ref: MutableColor4): void;
    /**
     * Stores from the starting index in the given array the Color4 successive values
     * @param array - defines the array where to store the r,g,b components
     * @param index - defines an optional index in the target array to define where to start storing values
     * @returns the current Color4 object
     */
    export function toArray(value: ReadonlyColor4, array: number[], index?: number): void;
    /**
     * Creates a Color4 set with the added values of the current Color4 and of the given one
     * @param right - defines the second operand
     * @returns create mutable Color4
     */
    export function add(value: ReadonlyColor4, right: ReadonlyColor4): MutableColor4;
    /**
     * Creates a Color4 set with the subtracted values of the given one from the current Color4
     * @param right - defines the second operand
     * @returns create mutable Color4
     */
    export function subtract(value: ReadonlyColor4, right: ReadonlyColor4): ReadonlyColor4;
    /**
     * Subtracts the given ones from the current Color4 values and stores the results in "result"
     * @param right - defines the second operand
     * @param result - defines the Color4 object where to store the result
     * @returns the current Color4 object
     */
    export function subtractToRef(a: ReadonlyColor4, b: ReadonlyColor4, result: MutableColor4): void;
    /**
     * Creates a Color4 with the current Color4 values multiplied by scale
     * @param scale - defines the scaling factor to apply
     * @returns create mutable Color4
     */
    export function scale(value: ReadonlyColor4, scale: number): ReadonlyColor4;
    /**
     * Multiplies the current Color4 values by scale and stores the result in "result"
     * @param scale - defines the scaling factor to apply
     * @param result - defines the Color4 object where to store the result
     */
    export function scaleToRef(value: ReadonlyColor4, scale: number, result: MutableColor4): void;
    /**
     * Scale the current Color4 values by a factor and add the result to a given Color4
     * @param scale - defines the scale factor
     * @param result - defines the Color4 object where to store the result
     */
    export function scaleAndAddToRef(value: ReadonlyColor4, scale: number, result: MutableColor4): void;
    /**
     * Clamps the rgb values by the min and max values and stores the result into "result"
     * @param min - defines minimum clamping value (default is 0)
     * @param max - defines maximum clamping value (default is 1)
     * @param result - defines color to store the result into.
     */
    export function clampToRef(value: ReadonlyColor4, min: number | undefined, max: number | undefined, result: MutableColor4): void;
    /**
     * Multipy an Color4 value by another and return create mutable Color4
     * @param color - defines the Color4 value to multiply by
     * @returns create mutable Color4
     */
    export function multiply(value: ReadonlyColor4, color: ReadonlyColor4): ReadonlyColor4;
    /**
     * Multipy a Color4 value by another and push the result in a reference value
     * @param color - defines the Color4 value to multiply by
     * @param result - defines the Color4 to fill the result in
     * @returns the result Color4
     */
    export function multiplyToRef(value: ReadonlyColor4, color: ReadonlyColor4, result: MutableColor4): void;
    /**
     * Creates a string with the Color4 current values
     * @returns the string representation of the Color4 object
     */
    export function toString(value: ReadonlyColor4): string;
    /**
     * Compute the Color4 hash code
     * @returns an unique number that can be used to hash Color4 objects
     */
    export function getHashCode(value: ReadonlyColor4): number;
    /**
     * Creates a Color4 copied from the current one
     * @returns create mutable Color4
     */
    export function clone(value: ReadonlyColor4): MutableColor4;
    /**
     * Copies the given Color4 values into the destination
     * @param source - defines the source Color4 object
     * @param dest - defines the destination Color4 object
     * @returns
     */
    export function copyFrom(source: ReadonlyColor4, dest: MutableColor4): void;
    /**
     * Copies the given float values into the current one
     * @param r - defines the red component to read from
     * @param g - defines the green component to read from
     * @param b - defines the blue component to read from
     * @param a - defines the alpha component to read from
     * @returns the current updated Color4 object
     */
    export function copyFromFloats(r: number, g: number, b: number, a: number, dest: MutableColor4): void;
    /**
     * Copies the given float values into the current one
     * @param r - defines the red component to read from
     * @param g - defines the green component to read from
     * @param b - defines the blue component to read from
     * @param a - defines the alpha component to read from
     * @returns the current updated Color4 object
     */
    export function set(r: number, g: number, b: number, a: number, dest: MutableColor4): void;
    /**
     * Compute the Color4 hexadecimal code as a string
     * @returns a string containing the hexadecimal representation of the Color4 object
     */
    export function toHexString(value: ReadonlyColor4): string;
    /**
     * Computes a Color4 converted from the current one to linear space
     * @returns create mutable Color4
     */
    export function toLinearSpace(value: ReadonlyColor4): MutableColor4;
    /**
     * Converts the Color4 values to linear space and stores the result in "convertedColor"
     * @param convertedColor - defines the Color4 object where to store the linear space version
     * @returns the unmodified Color4
     */
    export function toLinearSpaceToRef(value: ReadonlyColor4, ref: MutableColor4): void;
    /**
     * Computes a Color4 converted from the current one to gamma space
     * @returns create mutable Color4
     */
    export function toGammaSpace(value: ReadonlyColor4): ReadonlyColor4;
    /**
     * Converts the Color4 values to gamma space and stores the result in "convertedColor"
     * @param convertedColor - defines the Color4 object where to store the gamma space version
     * @returns the unmodified Color4
     */
    export function toGammaSpaceToRef(value: ReadonlyColor4, convertedColor: MutableColor4): void;
}

declare interface Color4_2 {
    r: number;
    g: number;
    b: number;
    a: number;
}

/**
 * @public
 */
declare type Color4Type = {
    r: number;
    g: number;
    b: number;
    a: number;
};

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
    createOrReplace(entity: Entity, val?: ConstructorType): ComponentType<T>;
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
    const AudioStream: ComponentDefinition<ISchema<PBAudioStream>, PBAudioStream>;
    /** @public */
    const AvatarAttach: ComponentDefinition<ISchema<PBAvatarAttach>, PBAvatarAttach>;
    /** @public */
    const AvatarModifierArea: ComponentDefinition<ISchema<PBAvatarModifierArea>, PBAvatarModifierArea>;
    /** @public */
    const AvatarShape: ComponentDefinition<ISchema<PBAvatarShape>, PBAvatarShape>;
    /** @public */
    const Billboard: ComponentDefinition<ISchema<PBBillboard>, PBBillboard>;
    /** @public */
    const CameraMode: ComponentDefinition<ISchema<PBCameraMode>, PBCameraMode>;
    /** @public */
    const CameraModeArea: ComponentDefinition<ISchema<PBCameraModeArea>, PBCameraModeArea>;
    /** @public */
    const GltfContainer: ComponentDefinition<ISchema<PBGltfContainer>, PBGltfContainer>;
    /** @public */
    const Material: ComponentDefinition<ISchema<PBMaterial>, PBMaterial>;
    /** @public */
    const MeshCollider: ComponentDefinition<ISchema<PBMeshCollider>, PBMeshCollider>;
    /** @public */
    const MeshRenderer: ComponentDefinition<ISchema<PBMeshRenderer>, PBMeshRenderer>;
    /** @public */
    const NftShape: ComponentDefinition<ISchema<PBNftShape>, PBNftShape>;
    /** @public */
    const PointerEventsResult: ComponentDefinition<ISchema<PBPointerEventsResult>, PBPointerEventsResult>;
    /** @public */
    const PointerHoverFeedback: ComponentDefinition<ISchema<PBPointerHoverFeedback>, PBPointerHoverFeedback>;
    /** @public */
    const PointerLock: ComponentDefinition<ISchema<PBPointerLock>, PBPointerLock>;
    /** @public */
    const Raycast: ComponentDefinition<ISchema<PBRaycast>, PBRaycast>;
    /** @public */
    const RaycastResult: ComponentDefinition<ISchema<PBRaycastResult>, PBRaycastResult>;
    /** @public */
    const TextShape: ComponentDefinition<ISchema<PBTextShape>, PBTextShape>;
    /** @public */
    const UiBackground: ComponentDefinition<ISchema<PBUiBackground>, PBUiBackground>;
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
    Animator: ComponentDefinition<ISchema<PBAnimator>, PBAnimator>;
    AudioSource: ComponentDefinition<ISchema<PBAudioSource>, PBAudioSource>;
    AudioStream: ComponentDefinition<ISchema<PBAudioStream>, PBAudioStream>;
    AvatarAttach: ComponentDefinition<ISchema<PBAvatarAttach>, PBAvatarAttach>;
    AvatarModifierArea: ComponentDefinition<ISchema<PBAvatarModifierArea>, PBAvatarModifierArea>;
    AvatarShape: ComponentDefinition<ISchema<PBAvatarShape>, PBAvatarShape>;
    Billboard: ComponentDefinition<ISchema<PBBillboard>, PBBillboard>;
    CameraMode: ComponentDefinition<ISchema<PBCameraMode>, PBCameraMode>;
    CameraModeArea: ComponentDefinition<ISchema<PBCameraModeArea>, PBCameraModeArea>;
    GltfContainer: ComponentDefinition<ISchema<PBGltfContainer>, PBGltfContainer>;
    Material: ComponentDefinition<ISchema<PBMaterial>, PBMaterial>;
    MeshCollider: ComponentDefinition<ISchema<PBMeshCollider>, PBMeshCollider>;
    MeshRenderer: ComponentDefinition<ISchema<PBMeshRenderer>, PBMeshRenderer>;
    NftShape: ComponentDefinition<ISchema<PBNftShape>, PBNftShape>;
    PointerEventsResult: ComponentDefinition<ISchema<PBPointerEventsResult>, PBPointerEventsResult>;
    PointerHoverFeedback: ComponentDefinition<ISchema<PBPointerHoverFeedback>, PBPointerHoverFeedback>;
    PointerLock: ComponentDefinition<ISchema<PBPointerLock>, PBPointerLock>;
    Raycast: ComponentDefinition<ISchema<PBRaycast>, PBRaycast>;
    RaycastResult: ComponentDefinition<ISchema<PBRaycastResult>, PBRaycastResult>;
    TextShape: ComponentDefinition<ISchema<PBTextShape>, PBTextShape>;
    UiBackground: ComponentDefinition<ISchema<PBUiBackground>, PBUiBackground>;
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

/**
 * Error function. Prints a console error. Only works in debug mode, otherwise it does nothing.
 * @param error - string or Error object.
 * @param data - any debug information.
 * @public
 */
declare const error: (message: string | Error, data?: any) => void;

declare type EventsSystem = typeof EventsSystem;

declare namespace EventsSystem {
    export type Callback = (event: PBPointerEventsResult_PointerCommand) => void | Promise<void>;
    export type Options = {
        button?: InputAction;
        hoverText?: string;
        maxDistance?: number;
    };
    /**
     * @public
     * Remove the callback for onPointerDown event
     * @param entity Entity where the callback was attached
     */
    export function removeOnPointerDown(entity: Entity): void;
    /**
     * @public
     * Remove the callback for onPointerUp event
     * @param entity Entity where the callback was attached
     */
    export function removeOnPointerUp(entity: Entity): void;
    /**
     * @public
     * Execute callback when the user press the InputButton pointing at the entity
     * @param entity Entity to attach the callback
     * @param cb Function to execute when click fires
     * @param opts Opts to trigger Feedback and Button
     */
    export function onPointerDown(entity: Entity, cb: Callback, opts?: Options): void;
    /**
     * @public
     * Execute callback when the user releases the InputButton pointing at the entity
     * @param entity Entity to attach the callback
     * @param cb Function to execute when click fires
     * @param opts Opts to trigger Feedback and Button
     */
    export function onPointerUp(entity: Entity, cb: Callback, opts?: Options): void;
}

/** Excludes property keys from T where the property is assignable to U */
declare type ExcludeUndefined<T> = {
    [P in keyof T]: undefined extends T[P] ? never : P;
}[keyof T];

/**
 * @public
 * Execute async task
 */
declare const executeTask: (task: Task<unknown>) => void;

/** @public */
declare type FloatArray = number[];

declare const enum Font {
    F_LIBERATION_SANS = 0,
    F_SANS_SERIF = 1
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
     * Remove all components of each entity in the tree made with Transform parenting
     * @param firstEntity - the root entity of the tree
     */
    removeEntityWithChildren(firstEntity: Entity): void;
    /**
     * Check if an entity exists in the engine
     * @param entity - the entity to validate
     * @returns true if the entity exists in the engine
     */
    entityExists(entity: Entity): boolean;
    /**
     * Add the system to the engine. It will be called every tick updated.
     * @param system function that receives the delta time between last tick and current one.
     * @param priority a number with the priority, big number are called before smaller ones
     * @param name optional: a unique name to identify it
     *
     * Example:
     * ```ts
     * function mySystem(dt: number) {
     *   const entitiesWithMeshRenderer = engine.getEntitiesWith(MeshRenderer, Transform)
     *   for (const [entity, _meshRenderer, _transform] of engine.getEntitiesWith(MeshRenderer, Transform)) {
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
     * for (const [entity, meshRenderer, transform] of engine.getEntitiesWith(MeshRenderer, Transform)) {
     *   // the properties of meshRenderer and transform are read only
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
declare type IInput = {
    /**
     * @public
     * Check if a pointer event has been emitted in the last tick-update.
     * @param inputAction - the input action to query
     * @param pointerEventType - the pointer event type to query
     * @param entity - the entity to query, ignore for global
     * @returns boolean
     */
    isTriggered: (inputAction: InputAction, pointerEventType: PointerEventType, entity?: Entity) => boolean;
    /**
     * @public
     * Check if an input action is currently being pressed.
     * @param inputAction - the input action to query
     * @returns boolean
     */
    isPressed: (inputAction: InputAction) => boolean;
    /**
     * @public
     * Get the input command info if a pointer event has been emitted in the last tick-update.
     * @param inputAction - the input action to query
     * @param pointerEventType - the pointer event type to query
     * @param entity - the entity to query, ignore for global
     * @returns the input command info or undefined if there is no command in the last tick-update
     */
    getInputCommand: (inputAction: InputAction, pointerEventType: PointerEventType, entity?: Entity) => PBPointerEventsResult_PointerCommand | null;
};

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
declare const Input: IInput;

declare const enum InputAction {
    IA_POINTER = 0,
    IA_PRIMARY = 1,
    IA_SECONDARY = 2,
    IA_ANY = 3,
    IA_FORWARD = 4,
    IA_BACKWARD = 5,
    IA_RIGHT = 6,
    IA_LEFT = 7,
    IA_JUMP = 8,
    IA_WALK = 9,
    IA_ACTION_3 = 10,
    IA_ACTION_4 = 11,
    IA_ACTION_5 = 12,
    IA_ACTION_6 = 13
}

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
 * Log function. Only works in debug mode, otherwise it does nothing.
 * @param args - any loggable parameter
 * @public
 */
declare const log: (...a: any[]) => void;

/** @public */
declare const Material: ComponentDefinition<ISchema<PBMaterial>, PBMaterial>;

declare const enum MaterialTransparencyMode {
    MTM_OPAQUE = 0,
    MTM_ALPHA_TEST = 1,
    MTM_ALPHA_BLEND = 2,
    MTM_ALPHA_TEST_AND_ALPHA_BLEND = 3,
    MTM_AUTO = 4
}

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
    function IdentityReadonly(): ReadonlyMatrix;
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
declare const MeshCollider: ComponentDefinition<ISchema<PBMeshCollider>, PBMeshCollider>;

/** @public */
declare const MeshRenderer: ComponentDefinition<ISchema<PBMeshRenderer>, PBMeshRenderer>;

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

declare const enum NftFrameType {
    NFT_CLASSIC = 0,
    NFT_BAROQUE_ORNAMENT = 1,
    NFT_DIAMOND_ORNAMENT = 2,
    NFT_MINIMAL_WIDE = 3,
    NFT_MINIMAL_GREY = 4,
    NFT_BLOCKY = 5,
    NFT_GOLD_EDGES = 6,
    NFT_GOLD_CARVED = 7,
    NFT_GOLD_WIDE = 8,
    NFT_GOLD_ROUNDED = 9,
    NFT_METAL_MEDIUM = 10,
    NFT_METAL_WIDE = 11,
    NFT_METAL_SLIM = 12,
    NFT_METAL_ROUNDED = 13,
    NFT_PINS = 14,
    NFT_MINIMAL_BLACK = 15,
    NFT_MINIMAL_WHITE = 16,
    NFT_TAPE = 17,
    NFT_WOOD_SLIM = 18,
    NFT_WOOD_WIDE = 19,
    NFT_WOOD_TWIGS = 20,
    NFT_CANVAS = 21,
    NFT_NONE = 22
}

/** @public */
declare const NftShape: ComponentDefinition<ISchema<PBNftShape>, PBNftShape>;

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

declare interface PBAudioStream {
    playing?: boolean | undefined;
    /** default=1.0f */
    volume?: number | undefined;
    url: string;
}

declare interface PBAvatarAttach {
    avatarId: string;
    anchorPointId: AvatarAnchorPointType;
}

declare interface PBAvatarModifierArea {
    area: Vector3_2 | undefined;
    excludeIds: string[];
    modifiers: AvatarModifierType[];
}

declare interface PBAvatarShape {
    id: string;
    /** default = NPC */
    name?: string | undefined;
    /** default = urn:decentraland:off-chain:base-avatars:BaseFemale */
    bodyShape?: string | undefined;
    /** default = decentraland.common.Color3(R = 0.6f, G = 0.462f, B = 0.356f) */
    skinColor?: Color3_2 | undefined;
    /** default = decentraland.common.Color3(R = 0.283f, G = 0.142f, B = 0f) */
    hairColor?: Color3_2 | undefined;
    /** default = decentraland.common.Color3(R = 0.6f, G = 0.462f, B = 0.356f) */
    eyeColor?: Color3_2 | undefined;
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
    /** default=BM_ALL_AXES */
    billboardMode?: BillboardMode | undefined;
    /** default=false */
    oppositeDirection?: boolean | undefined;
}

declare interface PBCameraMode {
    mode: CameraType;
}

declare interface PBCameraModeArea {
    area: Vector3_2 | undefined;
    mode: CameraType;
}

declare interface PBGltfContainer {
    /** which file to load */
    src: string;
}

declare interface PBMaterial {
    /** default = null */
    texture?: TextureUnion | undefined;
    /** default = 0.5. range value: from 0 to 1 */
    alphaTest?: number | undefined;
    /** default =  true */
    castShadows?: boolean | undefined;
    /** default = null */
    alphaTexture?: TextureUnion | undefined;
    /** default = null */
    emissiveTexture?: TextureUnion | undefined;
    /** default = null */
    bumpTexture?: TextureUnion | undefined;
    /** default = white; */
    albedoColor?: Color3_2 | undefined;
    /** default = black; */
    emissiveColor?: Color3_2 | undefined;
    /** default = white; */
    reflectivityColor?: Color3_2 | undefined;
    /** default = TransparencyMode.Auto */
    transparencyMode?: MaterialTransparencyMode | undefined;
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

declare interface PBMeshCollider {
    /** default = ColliderLayer.Physics | ColliderLayer.Pointer */
    collisionMask?: number | undefined;
    mesh?: {
        $case: 'box';
        box: PBMeshCollider_BoxMesh;
    } | {
        $case: 'sphere';
        sphere: PBMeshCollider_SphereMesh;
    } | {
        $case: 'cylinder';
        cylinder: PBMeshCollider_CylinderMesh;
    } | {
        $case: 'plane';
        plane: PBMeshCollider_PlaneMesh;
    };
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
    mesh?: {
        $case: 'box';
        box: PBMeshRenderer_BoxMesh;
    } | {
        $case: 'sphere';
        sphere: PBMeshRenderer_SphereMesh;
    } | {
        $case: 'cylinder';
        cylinder: PBMeshRenderer_CylinderMesh;
    } | {
        $case: 'plane';
        plane: PBMeshRenderer_PlaneMesh;
    };
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

declare interface PBNftShape {
    src: string;
    /** default = PictureFrameStyle.Classic */
    style?: NftFrameType | undefined;
    /** default = decentraland.common.Color3(0.6404918, 0.611472, 0.8584906) */
    color?: Color3_2 | undefined;
}

/** the renderer will set this component to the root entity once per frame with all the events */
declare interface PBPointerEventsResult {
    /** a list of the last N pointer commands (from the engine) */
    commands: PBPointerEventsResult_PointerCommand[];
}

/** this message represents a pointer event, used both for UP and DOWN actions */
declare interface PBPointerEventsResult_PointerCommand {
    /** identifier of the input */
    button: InputAction;
    hit: RaycastHit | undefined;
    state: PointerEventType;
    /** could be a Lamport timestamp */
    timestamp: number;
    /** if the input is analog then we store it here */
    analog?: number | undefined;
}

declare interface PBPointerHoverFeedback {
    pointerEvents: PBPointerHoverFeedback_Entry[];
}

declare interface PBPointerHoverFeedback_Entry {
    eventType: PointerEventType;
    eventInfo: PBPointerHoverFeedback_Info | undefined;
}

declare interface PBPointerHoverFeedback_Info {
    /** default=InputAction.ANY */
    button?: InputAction | undefined;
    /** default='Interact' */
    hoverText?: string | undefined;
    /** default=10 */
    maxDistance?: number | undefined;
    /** default=true */
    showFeedback?: boolean | undefined;
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

declare interface PBTextShape {
    text: string;
    /** default=F_SANS_SERIF */
    font?: Font | undefined;
    /** default=10 */
    fontSize?: number | undefined;
    fontAutoSize?: boolean | undefined;
    /** default=TAM_CENTER_CENTER */
    textAlign?: TextAlignMode | undefined;
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
    shadowColor?: Color3_2 | undefined;
    /** default=(1.0,1.0,1.0) */
    outlineColor?: Color3_2 | undefined;
    /** default=(1.0,1.0,1.0) */
    textColor?: Color4_2 | undefined;
}

declare interface PBUiBackground {
    /** default=(0.0, 0.0, 0.0, 0.0) */
    backgroundColor?: Color4_2 | undefined;
}

declare interface PBUiText {
    value: string;
    /** default=(1.0,1.0,1.0) */
    color?: Color3_2 | undefined;
    /** default='center' */
    textAlign?: TextAlignMode | undefined;
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
declare const PointerEventsResult: ComponentDefinition<ISchema<PBPointerEventsResult>, PBPointerEventsResult>;

declare const enum PointerEventType {
    PET_UP = 0,
    PET_DOWN = 1,
    PET_HOVER_ENTER = 2,
    PET_HOVER_LEAVE = 3
}

/** @public */
declare const PointerHoverFeedback: ComponentDefinition<ISchema<PBPointerHoverFeedback>, PBPointerHoverFeedback>;

/** @public */
declare const PointerLock: ComponentDefinition<ISchema<PBPointerLock>, PBPointerLock>;

/**
 * @public
 */
declare type PreEngine = ReturnType<typeof preEngine>;

declare function preEngine(): {
    entityExists: (entity: Entity) => boolean;
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
 * Quaternion is a type and a namespace.
 * - The namespace contains all types and functions to operates with Quaternion
 * - The type Quaternion is an alias to Quaternion.ReadonlyQuaternion
 * ```
 *
 * // Namespace usage example
 * const next = Quaternion.add(pointA, velocityA)
 *
 * // Type usage example
 * const readonlyRotation: Quaternion = Quaternion.Zero()
 * readonlyRotation.x = 0.1 // this FAILS
 *
 * // For mutable usage, use `Quaternion.Mutable`
 * const rotation: Quaternion.Mutable = Quaternion.Identity()
 * rotation.x = 3.0 // this WORKS
 * ```
 */
declare type Quaternion = Quaternion.ReadonlyQuaternion;

/**
 * @public
 * Quaternion is a type and a namespace.
 * ```
 * // The namespace contains all types and functions to operates with Quaternion
 * const next = Quaternion.add(pointA, velocityA)
 * // The type Quaternion is an alias to Quaternion.ReadonlyQuaternion
 * const readonlyRotation: Quaternion = Quaternion.Zero()
 * readonlyRotation.x = 0.1 // this FAILS
 *
 * // For mutable usage, use `Quaternion.Mutable`
 * const rotation: Quaternion.Mutable = Quaternion.Identity()
 * rotation.x = 3.0 // this WORKS
 * ```
 */
declare namespace Quaternion {
    /**
     * @public
     * For external use, type with `Quaternion`, e.g. `const zeroRotation: Quaternion = Quaternion.Zero()`.
     * For mutable typing, use `Quaternion.Mutable`, e.g. `const identityQuaternion: Quaternion.Mutable = Quaternion.Identity()`.
     */
    export type ReadonlyQuaternion = {
        readonly x: number;
        readonly y: number;
        readonly z: number;
        readonly w: number;
    };
    /**
     * @public
     * For external usage, type with `Quaternion`, e.g. `const zeroRotation: Quaternion = Quaternion.Zero()`.
     * For mutable typing, use `Quaternion.Mutable`, e.g. `const identityQuaternion: Quaternion.Mutable = Quaternion.Identity()`.
     */
    export type MutableQuaternion = {
        x: number;
        y: number;
        z: number;
        w: number;
    };
    /**
     * @public
     * Type with `Quaternion` for readonly usage, e.g. `const zeroRotation: Quaternion = Quaternion.Zero()`.
     * For mutable, use `Quaternion.Mutable`, e.g. `const identityQuaternion: Quaternion.Mutable = Quaternion.Identity()`.
     */
    export type Mutable = MutableQuaternion;
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
     * @param yaw - defines the rotation around Y axis (radians)
     * @param pitch - defines the rotation around X axis (radians)
     * @param roll - defines the rotation around Z axis (radians)
     * @returns result quaternion
     */
    export function fromRotationYawPitchRoll(yaw: number, pitch: number, roll: number): MutableQuaternion;
    /**
     * Returns a rotation that rotates z degrees around the z axis, x degrees around the x axis, and y degrees around the y axis.
     * @param x - the rotation on the x axis in euler degrees
     * @param y - the rotation on the y axis in euler degrees
     * @param z - the rotation on the z axis in euler degrees
     */
    export function fromEulerDegress(x: number, y: number, z: number): MutableQuaternion;
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
     * @returns the degress angle
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
     * @public
     * @returns a new Vector3 with euler angles degress
     */
    export function toEulerAngles(q: MutableQuaternion): Vector3.Mutable;
    /**
     * Creates a new rotation from the given Euler float angles (y, x, z) and stores it in the target quaternion
     * @param yaw - defines the rotation around Y axis (radians)
     * @param pitch - defines the rotation around X axis (radians)
     * @param roll - defines the rotation around Z axis (radians)
     * @param result - defines the target quaternion
     */
    export function fromRotationYawPitchRollToRef(yaw: number, pitch: number, roll: number, result: Quaternion.MutableQuaternion): void;
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
    /**
     *
     * @param degress - the angle degress
     * @param axis - vector3
     * @returns a new Quaternion
     */
    export function fromAngleAxis(degress: number, axis: Vector3.ReadonlyVector3): MutableQuaternion;
    /**
     * Creates a new quaternion containing the rotation value to reach the target (axis1, axis2, axis3) orientation as a rotated XYZ system (axis1, axis2 and axis3 are normalized during this operation)
     * @param axis1 - defines the first axis
     * @param axis2 - defines the second axis
     * @param axis3 - defines the third axis
     * @returns the new quaternion
     */
    export function fromAxisToRotationQuaternion(axis1: Vector3.ReadonlyVector3, axis2: Vector3.ReadonlyVector3, axis3: Vector3.ReadonlyVector3): MutableQuaternion;
    /**
     * Creates a rotation value to reach the target (axis1, axis2, axis3) orientation as a rotated XYZ system (axis1, axis2 and axis3 are normalized during this operation) and stores it in the target quaternion
     * @param axis1 - defines the first axis
     * @param axis2 - defines the second axis
     * @param axis3 - defines the third axis
     * @param ref - defines the target quaternion
     */
    export function fromAxisToRotationQuaternionToRef(axis1: Vector3.ReadonlyVector3, axis2: Vector3.ReadonlyVector3, axis3: Vector3.ReadonlyVector3, ref: MutableQuaternion): void;
    /**
     * Returns a zero filled quaternion
     */
    export function Zero(): MutableQuaternion;
    /**
     * @public
     * Rotates the transform so the forward vector points at target's current position.
     */
    export function fromLookAt(position: Vector3.ReadonlyVector3, target: Vector3.ReadonlyVector3, worldUp?: Vector3.ReadonlyVector3): MutableQuaternion;
    /**
     * @public
     * Rotates the transform so the forward vector points at target's current position.
     */
    export function fromLookAtToRef(position: Vector3.ReadonlyVector3, target: Vector3.ReadonlyVector3, worldUp: Vector3.ReadonlyVector3 | undefined, result: MutableQuaternion): void;
}

/**
 * @public
 */
declare type QuaternionType = {
    x: number;
    y: number;
    z: number;
    w: number;
};

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
    RQT_HIT_FIRST = 0,
    RQT_QUERY_ALL = 1
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
 * Scalar computation library
 * @public
 */
declare namespace Scalar {
    /**
     * Two pi constants convenient for computation.
     */
    const TwoPi: number;
    /**
     * Boolean : true if the absolute difference between a and b is lower than epsilon (default = 1.401298E-45)
     * @param a - number
     * @param b - number
     * @param epsilon - (default = 1.401298E-45)
     * @returns true if the absolute difference between a and b is lower than epsilon (default = 1.401298E-45)
     */
    export function withinEpsilon(a: number, b: number, epsilon?: number): boolean;
    /**
     * Returns a string : the upper case translation of the number i to hexadecimal.
     * @param i - number
     * @returns the upper case translation of the number i to hexadecimal.
     */
    export function toHex(i: number): string;
    /**
     * Returns -1 if value is negative and +1 is value is positive.
     * @param _value - the value
     * @returns the value itself if it's equal to zero.
     */
    export function sign(value: number): number;
    /**
     * Returns the value itself if it's between min and max.
     * Returns min if the value is lower than min.
     * Returns max if the value is greater than max.
     * @param value - the value to clmap
     * @param min - the min value to clamp to (default: 0)
     * @param max - the max value to clamp to (default: 1)
     * @returns the clamped value
     */
    export function clamp(value: number, min?: number, max?: number): number;
    /**
     * the log2 of value.
     * @param value - the value to compute log2 of
     * @returns the log2 of value.
     */
    export function log2(value: number): number;
    /**
     * Loops the value, so that it is never larger than length and never smaller than 0.
     *
     * This is similar to the modulo operator but it works with floating point numbers.
     * For example, using 3.0 for t and 2.5 for length, the result would be 0.5.
     * With t = 5 and length = 2.5, the result would be 0.0.
     * Note, however, that the behaviour is not defined for negative numbers as it is for the modulo operator
     * @param value - the value
     * @param length - the length
     * @returns the looped value
     */
    export function repeat(value: number, length: number): number;
    /**
     * Normalize the value between 0.0 and 1.0 using min and max values
     * @param value - value to normalize
     * @param min - max to normalize between
     * @param max - min to normalize between
     * @returns the normalized value
     */
    export function normalize(value: number, min: number, max: number): number;
    /**
     * Denormalize the value from 0.0 and 1.0 using min and max values
     * @param normalized - value to denormalize
     * @param min - max to denormalize between
     * @param max - min to denormalize between
     * @returns the denormalized value
     */
    export function denormalize(normalized: number, min: number, max: number): number;
    /**
     * Calculates the shortest difference between two given angles given in degrees.
     * @param current - current angle in degrees
     * @param target - target angle in degrees
     * @returns the delta
     */
    export function deltaAngle(current: number, target: number): number;
    /**
     * PingPongs the value t, so that it is never larger than length and never smaller than 0.
     * @param tx - value
     * @param length - length
     * @returns The returned value will move back and forth between 0 and length
     */
    export function pingPong(tx: number, length: number): number;
    /**
     * Interpolates between min and max with smoothing at the limits.
     *
     * This export function interpolates between min and max in a similar way to Lerp. However, the interpolation will gradually speed up
     * from the start and slow down toward the end. This is useful for creating natural-looking animation, fading and other transitions.
     * @param from - from
     * @param to - to
     * @param tx - value
     * @returns the smooth stepped value
     */
    export function smoothStep(from: number, to: number, tx: number): number;
    /**
     * Moves a value current towards target.
     *
     * This is essentially the same as Mathf.Lerp but instead the export function will ensure that the speed never exceeds maxDelta.
     * Negative values of maxDelta pushes the value away from target.
     * @param current - current value
     * @param target - target value
     * @param maxDelta - max distance to move
     * @returns resulting value
     */
    export function moveTowards(current: number, target: number, maxDelta: number): number;
    /**
     * Same as MoveTowards but makes sure the values interpolate correctly when they wrap around 360 degrees.
     *
     * Variables current and target are assumed to be in degrees. For optimization reasons, negative values of maxDelta
     *  are not supported and may cause oscillation. To push current away from a target angle, add 180 to that angle instead.
     * @param current - current value
     * @param target - target value
     * @param maxDelta - max distance to move
     * @returns resulting angle
     */
    export function moveTowardsAngle(current: number, target: number, maxDelta: number): number;
    /**
     * Creates a new scalar with values linearly interpolated of "amount" between the start scalar and the end scalar
     * @param start - start value
     * @param end - target value
     * @param amount - amount to lerp between
     * @returns the lerped value
     */
    export function lerp(start: number, end: number, amount: number): number;
    /**
     * Same as Lerp but makes sure the values interpolate correctly when they wrap around 360 degrees.
     * The parameter t is clamped to the range [0, 1]. Variables a and b are assumed to be in degrees.
     * @param start - start value
     * @param end - target value
     * @param amount - amount to lerp between
     * @returns the lerped value
     */
    export function lerpAngle(start: number, end: number, amount: number): number;
    /**
     * Calculates the linear parameter t that produces the interpolant value within the range [a, b].
     * @param a - start value
     * @param b - target value
     * @param value - value between a and b
     * @returns the inverseLerp value
     */
    export function inverseLerp(a: number, b: number, value: number): number;
    /**
     * Returns a new scalar located for "amount" (float) on the Hermite spline defined by the scalars "value1", "value3", "tangent1", "tangent2".
     * {@link http://mathworld.wolfram.com/HermitePolynomial.html}
     * @param value1 - spline value
     * @param tangent1 - spline value
     * @param value2 - spline value
     * @param tangent2 - spline value
     * @param amount - input value
     * @returns hermite result
     */
    export function hermite(value1: number, tangent1: number, value2: number, tangent2: number, amount: number): number;
    /**
     * Returns a random float number between and min and max values
     * @param min - min value of random
     * @param max - max value of random
     * @returns random value
     */
    export function randomRange(min: number, max: number): number;
    /**
     * This export function returns percentage of a number in a given range.
     *
     * RangeToPercent(40,20,60) will return 0.5 (50%)
     * RangeToPercent(34,0,100) will return 0.34 (34%)
     * @param num - to convert to percentage
     * @param min - min range
     * @param max - max range
     * @returns the percentage
     */
    export function rangeToPercent(num: number, min: number, max: number): number;
    /**
     * This export function returns number that corresponds to the percentage in a given range.
     *
     * PercentToRange(0.34,0,100) will return 34.
     * @param percent - to convert to number
     * @param min - min range
     * @param max - max range
     * @returns the number
     */
    export function percentToRange(percent: number, min: number, max: number): number;
    /**
     * Returns the angle converted to equivalent value between -Math.PI and Math.PI radians.
     * @param angle - The angle to normalize in radian.
     * @returns The converted angle.
     */
    export function normalizeRadians(angle: number): number;
}

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
    const Vector3: ISchema<Vector3Type>;
    const Quaternion: ISchema<QuaternionType>;
    const Color3: ISchema<Color3Type>;
    const Color4: ISchema<Color4Type>;
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

/**
 * @public
 */
declare type SystemFn = (dt: number) => void;

declare type Task<T = unknown> = () => Promise<T>;

declare const enum TextAlignMode {
    TAM_TOP_LEFT = 0,
    TAM_TOP_CENTER = 1,
    TAM_TOP_RIGHT = 2,
    TAM_MIDDLE_LEFT = 3,
    TAM_MIDDLE_CENTER = 4,
    TAM_MIDDLE_RIGHT = 5,
    TAM_BOTTOM_LEFT = 6,
    TAM_BOTTOM_CENTER = 7,
    TAM_BOTTOM_RIGHT = 8
}

/** @public */
declare const TextShape: ComponentDefinition<ISchema<PBTextShape>, PBTextShape>;

declare interface Texture {
    src: string;
    /** default = TextureWrapMode.Clamp */
    wrapMode?: TextureWrapMode | undefined;
    /** default = FilterMode.Bilinear */
    filterMode?: TextureFilterMode | undefined;
}

declare const enum TextureFilterMode {
    TFM_POINT = 0,
    TFM_BILINEAR = 1,
    TFM_TRILINEAR = 2
}

declare interface TextureUnion {
    tex?: {
        $case: 'texture';
        texture: Texture;
    } | {
        $case: 'avatarTexture';
        avatarTexture: AvatarTexture;
    };
}

declare const enum TextureWrapMode {
    TWM_REPEAT = 0,
    TWM_CLAMP = 1,
    TWM_MIRROR = 2,
    TWM_MIRROR_ONCE = 3
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

declare type Transport = {
    type: string;
    send(message: Uint8Array): void;
    onmessage?(message: Uint8Array): void;
    filter(message: Omit<TransportMessage, 'messageBuffer'>): boolean;
};

declare type TransportMessage = Omit<ReceiveMessage, 'data'>;

/** @public */
declare const UiBackground: ComponentDefinition<ISchema<PBUiBackground>, PBUiBackground>;

declare type Uint32 = number;

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
 * Vector3 is a type and a namespace.
 * - The namespace contains all types and functions to operates with Vector3
 * - The type Vector3 is an alias to Vector3.ReadonlyVector3
 * ```
 *
 * // Namespace usage example
 * const next = Vector3.add(pointA, velocityA)
 *
 * // Type usage example
 * const readonlyPosition: Vector3 = Vector3.Zero()
 * readonlyPosition.x = 0.1 // this FAILS
 *
 * // For mutable usage, use `Vector3.Mutable`
 * const position: Vector3.Mutable = Vector3.One()
 * position.x = 3.0 // this WORKS
 * ```
 */
declare type Vector3 = Vector3.ReadonlyVector3;

/**
 * @public
 * Vector3 is a type and a namespace.
 * ```
 * // The namespace contains all types and functions to operates with Vector3
 * const next = Vector3.add(pointA, velocityA)
 * // The type Vector3 is an alias to Vector3.ReadonlyVector3
 * const readonlyPosition: Vector3 = Vector3.Zero()
 * readonlyPosition.x = 0.1 // this FAILS
 *
 * // For mutable usage, use `Vector3.Mutable`
 * const position: Vector3.Mutable = Vector3.One()
 * position.x = 3.0 // this WORKS
 * ```
 */
declare namespace Vector3 {
    /**
     * @public
     * For external use, type with `Vector3`, e.g. `const zeroPosition: Vector3 = Vector3.Zero()`.
     * For mutable typing, use `Vector3.Mutable`, e.g. `const upVector: Vector3.Mutable = Vector3.Up()`.
     */
    export type ReadonlyVector3 = {
        readonly x: number;
        readonly y: number;
        readonly z: number;
    };
    /**
     * @public
     * For external usage, type with `Vector3`, e.g. `const zeroPosition: Vector3 = Vector3.Zero()`.
     * For mutable typing, use `Vector3.Mutable`, e.g. `const upVector: Vector3.Mutable = Vector3.Up()`.
     */
    export type MutableVector3 = {
        x: number;
        y: number;
        z: number;
    };
    /**
     * @public
     * Type with `Vector3` for readonly usage, e.g. `const zeroPosition: Vector3 = Vector3.Zero()`.
     * For mutable, use `Vector3.Mutable`, e.g. `const upVector: Vector3.Mutable = Vector3.Up()`.
     */
    export type Mutable = MutableVector3;
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
    export function copyFrom(source: ReadonlyVector3, dest: MutableVector3): void;
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
     * @returns the length of the Vector3
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

/**
 * @public
 */
declare type Vector3Type = {
    x: number;
    y: number;
    z: number;
};

/** @public */
declare const VisibilityComponent: ComponentDefinition<ISchema<PBVisibilityComponent>, PBVisibilityComponent>;

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
    YGA_AUTO = 0,
    YGA_FLEX_START = 1,
    YGA_CENTER = 2,
    YGA_FLEX_END = 3,
    YGA_STRETCH = 4,
    YGA_BASELINE = 5,
    YGA_SPACE_BETWEEN = 6,
    YGA_SPACE_AROUND = 7
}

declare const enum YGDirection {
    YGD_INHERIT = 0,
    YGD_LTR = 1,
    YGD_RTL = 2
}

declare const enum YGDisplay {
    YGD_FLEX = 0,
    YGD_NONE = 1
}

declare const enum YGFlexDirection {
    YGFD_COLUMN = 0,
    YGFD_COLUMN_REVERSE = 1,
    YGFD_ROW = 2,
    YGFD_ROW_REVERSE = 3
}

declare const enum YGJustify {
    YGJ_FLEX_START = 0,
    YGJ_CENTER = 1,
    YGJ_FLEX_END = 2,
    YGJ_SPACE_BETWEEN = 3,
    YGJ_SPACE_AROUND = 4,
    YGJ_SPACE_EVENLY = 5
}

declare const enum YGOverflow {
    YGO_VISIBLE = 0,
    YGO_HIDDEN = 1,
    YGO_SCROLL = 2
}

declare const enum YGPositionType {
    YGPT_STATIC = 0,
    YGPT_RELATIVE = 1,
    YGPT_ABSOLUTE = 2
}

declare const enum YGUnit {
    YGU_UNDEFINED = 0,
    YGU_POINT = 1,
    YGU_PERCENT = 2,
    YGU_AUTO = 3
}

declare const enum YGWrap {
    YGW_NO_WRAP = 0,
    YGW_WRAP = 1,
    YGW_WRAP_REVERSE = 2
}


