// Источник правды для filter/sort/viewMode: массив значений + тип из него.
// Layout server-side использует массивы для runtime-валидации cookie-значений,
// не дублируя их вручную.

export const VIEW_MODE_VALUES = ["list", "grid"] as const;
export type TViewMode = (typeof VIEW_MODE_VALUES)[number];

export const SORT_VALUES = [
  "last_created",
  "last_modified",
  "last_opened",
] as const;
export type TSortBy = (typeof SORT_VALUES)[number];

export const FILTER_VALUES = ["all", "owned", "not_owned"] as const;
export type TFilter = (typeof FILTER_VALUES)[number];

export interface IFiltersProps {
  filter: TFilter;
  sortBy: TSortBy;
  viewMode: TViewMode;
  onFilterChange: (v: TFilter) => void;
  onSortChange: (v: TSortBy) => void;
  onViewModeChange: (v: TViewMode) => void;
}
