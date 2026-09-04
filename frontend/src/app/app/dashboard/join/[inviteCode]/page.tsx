"use client";
import { useParams, useRouter } from "next/navigation";
import {
  PageHeader,
  Filters,
  BoardListSkeleton,
  useFilters,
} from "@/features/boards";
import { useJoinSpace } from "@/features/spaces";
import { DEFAULT_PROTECTED_ROUTE } from "@/shared/config/proxy.constant";

// Страница присоединения по invite-коду
export default function JoinSpacePage() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const router = useRouter();

  const { isError, error } = useJoinSpace(inviteCode);
  const { filter, sortBy, viewMode, setFilter, setSortBy, setViewMode } =
    useFilters();

  if (isError) {
    return (
      <main className="main-content flex-1 flex items-center justify-center min-w-0 bg-white">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900">
              Не удалось присоединиться
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {error?.message || "Ссылка недействительна или устарела"}
            </p>
          </div>
          <button
            onClick={() => router.replace(DEFAULT_PROTECTED_ROUTE)}
            className="px-4 py-2 text-sm font-medium text-white bg-nova-blue hover:bg-nova-blue/90 rounded-lg transition"
          >
            На главную
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="main-content flex-1 flex flex-col min-w-0 bg-white">
      <div className="flex-shrink-0 px-6 pt-6 bg-white z-10">
        <PageHeader title="..." />
        <Filters
          filter={filter}
          sortBy={sortBy}
          viewMode={viewMode}
          onFilterChange={setFilter}
          onSortChange={setSortBy}
          onViewModeChange={setViewMode}
        />
      </div>
      <BoardListSkeleton />
    </main>
  );
}
