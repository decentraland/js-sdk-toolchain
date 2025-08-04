import type { Template } from '/shared/types/workspace';

import { SortBy } from './types';

export function sortTemplatesBy(templates: Template[], type: SortBy): Template[] {
  switch (type) {
    case SortBy.DEFAULT:
      return templates.toSorted((a, b) => a.title.localeCompare(b.title));
    case SortBy.NEWEST:
      return templates.toSorted((a, b) => +new Date(b.date_created) - +new Date(a.date_created));
  }
}
