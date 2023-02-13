export type TreeType = 'directory' | 'file'

// TODO: maybe we can avoid repeating some checks (ex: if (this.type !== 'directory') by using decorators
// but I think we should enable them since they still are an experimental TS feature

export class Tree {
  parent: Tree | null
  value: string
  // question: should we transform this to an object to avoid iteration when
  // removing a child? (iteration for rendering is unavoidable)
  childs: Tree[]
  expanded: boolean
  type: TreeType

  constructor(value: string, type: TreeType = 'file', expanded = false) {
    this.value = value
    this.childs = []
    this.parent = null
    this.expanded = false
    this.type = type
    this.expanded = expanded
  }

  addChild(child: Tree) {
    if (!this.isDirectory()) return this

    this.childs.push(child)
    child.parent = this
    return this
  }

  removeChild(child: Tree) {
    if (!this.isDirectory()) return this

    this.childs = this.childs.filter(($) => $.value !== child.value)
    child.parent = null
    return this
  }

  rename(value: string) {
    this.value = value
    return this
  }

  becomeOrphan() {
    this.parent?.removeChild(this)
    return this
  }

  becomeParentOf(child: Tree) {
    if (!child.parent || this === child) return this
    if (!this.isDirectory()) {
      // since this is not a directory, it cannot adopt it, but maybe the parent can...
      this.parent?.becomeParentOf(child)
      return this
    }

    child.becomeOrphan()
    this.addChild(child)
    return this
  }

  expand() {
    this.expanded = true
    return this
  }

  contract() {
    this.expanded = false
    return this
  }

  canExpand() {
    return this.isDirectory() && !this.expanded
  }

  toggleExpand() {
    if (this.canExpand()) this.expand()
    else this.contract()
  }

  isDirectory() {
    return this.type === 'directory'
  }
}
