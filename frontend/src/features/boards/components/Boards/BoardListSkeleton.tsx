const SKELETON_ROWS = 5;

// Заглушка одной строки таблицы досок.
function SkeletonRow() {
  return (
    <div className="grid grid-cols-12 gap-4 px-4 py-4 items-center animate-pulse">
      <div className="col-span-5 flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-200 rounded-lg flex-shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
      </div>
      <div className="col-span-2">
        <div className="flex -space-x-2">
          <div className="w-7 h-7 bg-gray-200 rounded-full" />
        </div>
      </div>
      <div className="col-span-2">
        <div className="h-4 bg-gray-200 rounded w-2/3" />
      </div>
      <div className="col-span-2">
        <div className="h-4 bg-gray-200 rounded w-1/2" />
      </div>
      <div className="col-span-1" />
    </div>
  );
}

// Skeleton табличного списка досок на время загрузки.
export function BoardListSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0">
      <div className="sticky top-0 z-10 bg-gray-50 rounded-t-lg">
        <div className="grid grid-cols-12 gap-4 px-4 py-3 animate-pulse">
          <div className="col-span-5">
            <div className="h-3 bg-gray-200 rounded w-1/4" />
          </div>
          <div className="col-span-2">
            <div className="h-3 bg-gray-200 rounded w-2/3" />
          </div>
          <div className="col-span-2">
            <div className="h-3 bg-gray-200 rounded w-2/3" />
          </div>
          <div className="col-span-2">
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
          <div className="col-span-1" />
        </div>
      </div>

      <div className="bg-white rounded-b-lg">
        {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}
