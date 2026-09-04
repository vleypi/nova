const SKELETON_CARDS = 10;

// Заглушка одной карточки в grid-режиме.
function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden animate-pulse">
      <div className="h-32 bg-gray-200" />
      <div className="px-3 py-3 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="h-3 bg-gray-100 rounded w-2/3" />
      </div>
    </div>
  );
}

// Skeleton сетки досок на время загрузки.
export function BoardGridSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: SKELETON_CARDS }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
