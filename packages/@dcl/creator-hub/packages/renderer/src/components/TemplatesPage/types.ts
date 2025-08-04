export enum SortBy {
  DEFAULT = 'Default',
  NEWEST = 'Newest',
}

export enum Difficulty {
  HARD = 'Hard',
  INTERMEDIATE = 'Intermediate',
  EASY = 'Easy',
}

export type ModalType = { type: 'create-project'; payload: CreateProjectValue };

export type CreateProjectValue = {
  name: string;
  path: string;
  repo?: string;
};
