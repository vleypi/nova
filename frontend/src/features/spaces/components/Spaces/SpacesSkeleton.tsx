// Skeleton-плейсхолдер списка пространств в sidebar.
export function SpacesSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 px-3 py-2.5 overflow-hidden"
        >
          <div className="w-6 h-6 bg-gray-200 rounded animate-pulse flex-shrink-0" />
          <div className="h-4 bg-gray-200 rounded flex-1 min-w-0 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
