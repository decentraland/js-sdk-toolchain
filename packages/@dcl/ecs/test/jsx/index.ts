/*
 * @jsx Ecs.jsx
 */

function jsx(
  tag: JSX.Tag | JSX.Component,
  attributes: { [key: string]: any } | null,
  ...args: any[]
) {
  const children: any[] | null = args.length ? [].concat(...args) : null

  if (typeof tag === 'function') {
    return tag(attributes ?? {}, children ?? undefined)
  }

  return { tag, attributes, children }
}

export default jsx
