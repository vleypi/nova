"use client";
import { SparklineStatCard } from "@/shared/ui/SparklineStatCard/SparklineStatCard";
import { ActivityHeatmap } from "@/shared/ui/ActivityHeatmap/ActivityHeatmap";
import { MonthlyBarChart } from "@/shared/ui/MonthlyBarChart/MonthlyBarChart";
import {
  DAY_MS,
  buildMonthlyBuckets,
  buildWeeklyBuckets,
  buildHeatmap,
} from "@/shared/utils/chart.util";
import { useAdminAuditLogs } from "../../../hooks/useAdminAuditLogs";
import { useAdminBoards } from "../../../hooks/useAdminBoards";
import { useAdminSpaceMembers } from "../../../hooks/useAdminSpaceMembers";
import { IAdminSpace } from "../../../interfaces/admin.interface";

interface ISpaceStatsTabProps {
  space: IAdminSpace;
}

const MONTHS_WINDOW = 6;
const WEEKS_HEATMAP = 26;
const STATS_FETCH_LIMIT = 500;
const DAYS_30 = 30;

// Таб статистики пространства
export function SpaceStatsTab({ space }: ISpaceStatsTabProps) {
  const { data: boardsPage, isLoading: isLoadingBoards } = useAdminBoards({
    spaceId: space.id,
    limit: STATS_FETCH_LIMIT,
  });
  const { data: members, isLoading: isLoadingMembers } = useAdminSpaceMembers(
    space.id,
  );
  const { data: logsPage, isLoading: isLoadingLogs } = useAdminAuditLogs({
    targetId: space.id,
    limit: STATS_FETCH_LIMIT,
  });

  if (isLoadingBoards || isLoadingMembers || isLoadingLogs) {
    return <StatsSkeleton />;
  }

  const boards = boardsPage?.boards ?? [];
  const logs = logsPage?.logs ?? [];

  const now = Date.now();
  const daysSinceCreate = Math.max(
    0,
    Math.floor((now - new Date(space.createdAt).getTime()) / DAY_MS),
  );
  const actions30d = logs.filter(
    (log) => now - new Date(log.createdAt).getTime() < DAYS_30 * DAY_MS,
  ).length;

  const monthlyBoards = buildMonthlyBuckets(
    boards.map((board) => board.createdAt),
    MONTHS_WINDOW,
  );
  const weeklyActions = buildWeeklyBuckets(
    logs.map((log) => log.createdAt),
    8,
  );
  const daysSpark = Array.from({ length: 6 }, (_, i) =>
    Math.round((daysSinceCreate * (i + 1)) / 6),
  );
  const membersSpark = Array(6).fill(members?.length ?? 0);
  const heatmap = buildHeatmap(
    logs.map((log) => log.createdAt),
    WEEKS_HEATMAP,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SparklineStatCard
          label="Досок"
          value={boards.length}
          color="#8b5cf6"
          points={monthlyBoards}
        />
        <SparklineStatCard
          label="Участников"
          value={members?.length ?? 0}
          color="#3b82f6"
          points={membersSpark}
        />
        <SparklineStatCard
          label="Действий / 30 дней"
          value={actions30d}
          color="#f59e0b"
          points={weeklyActions}
        />
        <SparklineStatCard
          label="Дней с создания"
          value={daysSinceCreate}
          color="#10b981"
          points={daysSpark}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <p className="text-sm font-semibold text-gray-900 mb-4">
            Новые доски по месяцам
          </p>
          {boards.length > 0 ? (
            <MonthlyBarChart buckets={monthlyBoards} />
          ) : (
            <p className="text-xs text-gray-400 text-center py-10">
              В пространстве ещё нет досок
            </p>
          )}
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <p className="text-sm font-semibold text-gray-900 mb-1">
            Последнее действие
          </p>
          {logs[0] ? (
            <>
              <p className="text-xs text-gray-400 mb-4">{logs[0].action}</p>
              <p className="text-base font-medium text-gray-700">
                {new Date(logs[0].createdAt).toLocaleString("ru-RU")}
              </p>
              <p className="text-xs text-gray-500 mt-2 truncate">
                от {logs[0].actorEmail}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-400 mt-4">
              Нет действий в audit log
            </p>
          )}
        </div>
      </div>

      <ActivityHeatmap
        weeks={heatmap}
        subtitle={`Последние 6 месяцев · ${logs.length} действий`}
      />
    </div>
  );
}

// Skeleton stats-таба на время загрузки.
function StatsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 bg-white border border-gray-100 rounded-xl animate-pulse"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="h-36 bg-white border border-gray-100 rounded-xl animate-pulse" />
        <div className="h-36 bg-white border border-gray-100 rounded-xl animate-pulse" />
      </div>
      <div className="h-32 bg-white border border-gray-100 rounded-xl animate-pulse" />
    </div>
  );
}
