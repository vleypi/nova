import { Select } from "@/shared/ui/Select/Select";
import {
  BOARD_FILTER_OPTIONS,
  SORT_GROUP,
} from "../../constants/dashboard.constant";
import {
  IFiltersProps,
  TFilter,
  TSortBy,
} from "../../interfaces/filter.interface";

// Панель фильтров: filter-by, sort-by и переключатель режимов отображения.
export function Filters({
  filter,
  sortBy,
  viewMode,
  onFilterChange,
  onSortChange,
  onViewModeChange,
}: IFiltersProps) {
  return (
    <div className="flex items-center gap-6 mb-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Фильтровать по</span>
        <Select
          options={BOARD_FILTER_OPTIONS}
          value={filter}
          onChange={(v) => onFilterChange(v as TFilter)}
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">{SORT_GROUP.label}</span>
        <Select
          options={SORT_GROUP.options}
          value={sortBy}
          onChange={(v) => onSortChange(v as TSortBy)}
        />
      </div>

      <div className="ml-auto flex gap-2">
        <button
          onClick={() => onViewModeChange("grid")}
          className={`p-2 rounded transition ${viewMode === "grid" ? "bg-gray-100 text-gray-900" : "hover:bg-gray-100 text-gray-600"}`}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
            />
          </svg>
        </button>
        <button
          onClick={() => onViewModeChange("list")}
          className={`p-2 rounded transition ${viewMode === "list" ? "bg-gray-100 text-gray-900" : "hover:bg-gray-100 text-gray-600"}`}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
