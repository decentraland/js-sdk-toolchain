/** Include property keys from T where the property is assignable to U */
type IncludeUndefined<T> = {
  [P in keyof T]: undefined extends T[P] ? P : never
}[keyof T]

/** Excludes property keys from T where the property is assignable to U */
type ExcludeUndefined<T> = {
  [P in keyof T]: undefined extends T[P] ? never : P
}[keyof T]

type OnlyOptionalUndefinedTypes<T> = { [K in IncludeUndefined<T>]?: T[K] }
type OnlyNonUndefinedTypes<T> = { [K in ExcludeUndefined<T>]: T[K] }

export type ToOptional<T> = OnlyOptionalUndefinedTypes<T> &
  OnlyNonUndefinedTypes<T>
