export class Tree {
  parent: Tree | null
  value: string
  // question: should we transform this to an object to avoid iteration when
  // removing a child? (iteration for rendering is unavoidable)
  childs: Tree[]

  constructor(value: string) {
    this.value = value
    this.childs = []
    this.parent = null
  }

  addChild(child: Tree) {
    this.childs.push(child)
    child.parent = this
    return this
  }

  removeChild(child: Tree) {
    this.childs = this.childs.filter(($) => $.value !== child.value)
    return this
  }

  rename(value: string) {
    this.value = value
    return this
  }

  becomeOrphan() {
    if (!this.parent) return
    this.parent.removeChild(this)
    this.parent = null
  }
}
