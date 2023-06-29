/**
 * Moves a node to a specific index
 * @param list array to mutate
 * @param from index of the node to move
 * @param to destination index
 */
export function move<T>(list: T[], from: number, to: number) {
  list.splice(to, 0, list.splice(from, 1)[0])
}

/**
 * Pushes a value to a list only if the value is not already on the list
 * @param list array to update
 * @param value value to push
 * @returns updated list
 */
export function cleanPush<T extends number | string>(list: T[], value: T): T[] {
  return Array.from(new Set(list).add(value))
}
