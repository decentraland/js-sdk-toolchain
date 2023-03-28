export type FieldType<Obj, Path> = Path extends `${infer Left}.${infer Right}`
  ? Left extends keyof Obj
    ? FieldType<Exclude<Obj[Left], undefined>, Right> | Extract<Obj[Left], undefined>
    : undefined
  : Path extends keyof Obj
  ? Obj[Path]
  : undefined

export type NestedKey<Obj extends object> = {
  [Key in keyof Obj & (string | number)]: Obj[Key] extends object
    ? `${Key}` | `${Key}.${NestedKey<Obj[Key]>}`
    : `${Key}`
}[keyof Obj & (string | number)]

export function setValue<Obj extends object, Path extends string>(
  obj: Obj,
  path: Path,
  value: FieldType<Obj, Path>,
  returnNew = true
): Obj {
  const paths = path.split('.')
  if (returnNew) {
    if (paths.length === 1) {
      return { ...obj, [paths[0]]: value }
    }
    const [head, ...rest] = paths
    const newObj = obj.hasOwnProperty(head) ? { ...(obj as any)[head] } : {}
    return {
      ...obj,
      [head]: setValue(newObj, rest.join('.'), value, true)
    }
  } else {
    const prop = paths.pop() as string

    const nestedObj = paths.reduce((acc, key) => (acc as any)?.[key], obj as any)
    nestedObj[prop] = value

    return obj
  }
}

export function getValue<Obj, Path extends string, Def = FieldType<Obj, Path>>(
  obj: Obj,
  path: Path,
  defaultValue?: Def
): FieldType<Obj, Path> | Def {
  const paths = path.split('.')
  const value = paths.reduce((acc, key) => (acc as any)?.[key], obj as any)

  return value === undefined ? (defaultValue as Def) : value
}
