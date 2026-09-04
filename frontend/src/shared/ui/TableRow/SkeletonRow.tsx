"use client";

export type TSkeletonAvatarShape = "circle" | "rounded";

export interface ISkeletonColumn {
  span: number;
  avatar?: TSkeletonAvatarShape;
  primary?: string;
  secondary?: string;
}

interface ISkeletonRowProps {
  columns: ISkeletonColumn[];
}

// Skeleton-строка таблицы с настраиваемыми колонками (avatar/primary/secondary).
export function SkeletonRow({ columns }: ISkeletonRowProps) {
  return (
    <div className="grid grid-cols-12 gap-4 px-4 py-4 items-center animate-pulse">
      {columns.map((column, i) => (
        <div
          key={i}
          style={{ gridColumn: `span ${column.span} / span ${column.span}` }}
          className={column.avatar ? "flex items-center gap-3" : ""}
        >
          {column.avatar && (
            <div
              className={`w-10 h-10 bg-gray-200 flex-shrink-0 ${column.avatar === "circle" ? "rounded-full" : "rounded-lg"}`}
            />
          )}
          {(column.primary || column.secondary) && (
            <div
              className={`${column.avatar ? "flex-1 space-y-2" : "space-y-2"}`}
            >
              {column.primary && (
                <div className={`h-4 bg-gray-200 rounded ${column.primary}`} />
              )}
              {column.secondary && (
                <div className={`h-3 bg-gray-100 rounded ${column.secondary}`} />
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
