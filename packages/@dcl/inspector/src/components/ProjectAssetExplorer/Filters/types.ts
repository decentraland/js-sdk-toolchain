export type Filter = 'all' | 'recents' | 'models' | 'images' | 'video' | 'audio' | 'other'

export type PropTypes = {
  filters: Filter[]
  active?: Filter
  onClick(type: Filter): void
}
