import type { Project, SortBy } from '/shared/types/projects';

export type Props = {
  projects: Project[];
  sortBy: SortBy;
  onSort: (type: SortBy) => void;
};
