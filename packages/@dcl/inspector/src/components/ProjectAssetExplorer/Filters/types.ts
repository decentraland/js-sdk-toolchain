export enum Filter {
  All = 'all',
  Recents = 'recents',
  Models = 'models',
  Images = 'images',
  Video = 'video',
  Audio = 'audio',
  Other = 'other'
}

export type PropTypes = {
  filters: Filter[]
  active?: Filter
  onClick(type: Filter): void
}
