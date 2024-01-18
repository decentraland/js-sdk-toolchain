export type DropType = 'before' | 'after' | 'inside'

export enum ClickType {
  CLICK = 'click',
  CONTEXT_MENU = 'contextmenu'
}

export function calculateDropType(y: number, rect: DOMRect): DropType {
  const threshold = Math.round(rect.height / 3)
  // we can calculate for "before" type if (rect.top + threshold > y)
  // but for now we don't need it since it only adds unnecessary complexity...
  if (rect.bottom - threshold < y) return 'after'
  return 'inside'
}
