import { BOARD_TABLE_COLUMNS } from "../../constants/dashboard.constant";

// Шапка таблицы досок.
export function BoardTableHeader() {
  return (
    <div className="sticky top-0 z-10 bg-gray-50 rounded-t-lg">
      <div className="grid grid-cols-12 gap-4 px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
        {BOARD_TABLE_COLUMNS.map((column) => (
          <div key={column.key} className={`${column.className} truncate`}>
            {column.label}
          </div>
        ))}
      </div>
    </div>
  );
}
