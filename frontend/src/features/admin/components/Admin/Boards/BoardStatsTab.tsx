"use client";
import { SparklineStatCard } from "@/shared/ui/SparklineStatCard/SparklineStatCard";
import { ActivityHeatmap } from "@/shared/ui/ActivityHeatmap/ActivityHeatmap";
import {
  DAY_MS,
  buildMonthlyBuckets,
  buildWeeklyBuckets,
  buildHeatmap,
} from "@/shared/utils/chart.util";
import { useAdminAuditLogs } from "../../../hooks/useAdminAuditLogs";
import { useAdminRealtime } from "../../../hooks/useAdminRealtime";
import { IAdminBoard } from "../../../interfaces/admin.interface";

interface IBoardStatsTabProps {
  board: IAdminBoard;
}

const MONTHS_WINDOW = 6;
const WEEKS_HEATMAP = 26;
const STATS_FETCH_LIMIT = 500;
const DAYS_30 = 30;

// Таб статистики доски
export function BoardStatsTab({ board }: IBoardStatsTabProps) {
  const { data: logsPage, isLoading: isLoadingLogs } = useAdminAuditLogs({
    targetId: board.id,
    limit: STATS_FETCH_LIMIT,
  });
  const { data: realtimeBoards, isLoading: isLoadingRealtime } =
    useAdminRealtime();

  if (isLoadingLogs || isLoadingRealtime) return <StatsSkeleton />;

  const logs = logsPage?.logs ?? [];
  const onlineBoard = (realtimeBoards ?? []).find(
    (entry) => entry.boardId === board.id,
  );
  const onlineCount = onlineBoard?.users.length ?? 0;

  const now = Date.now();
  const daysSinceCreate = Math.max(
    0,
    Math.floor((now - new Date(board.createdAt).getTime()) / DAY_MS),
  );
  const actions30d = logs.filter(
    (log) => now - new Date(log.createdAt).getTime() < DAYS_30 * DAY_MS,
  ).length;
  const uniqueUsers = new Set(logs.map((log) => log.actorId)).size;

  const monthlyActions = buildMonthlyBuckets(
    logs.map((log) => log.createdAt),
    MONTHS_WINDOW,
  );
  const weeklyActions = buildWeeklyBuckets(
    logs.map((log) => log.createdAt),
    8,
  );
  const daysSpark = Array.from({ length: 6 }, (_, i) =>
    Math.round((daysSinceCreate * (i + 1)) / 6),
  );
  const onlineSpark = Array(6).fill(onlineCount);
  const heatmap = buildHeatmap(
    logs.map((log) => log.createdAt),
    WEEKS_HEATMAP,
  );

  const onlineAside =
    onlineCount > 0 ? (
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-[10px] text-gray-400 uppercase tracking-wider">
          live
        </span>
      </span>
    ) : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SparklineStatCard
          label="Всего действий"
          value={logs.length}
          color="#8b5cf6"
          points={monthlyActions}
        />
        <SparklineStatCard
          label="Уникальных пользователей"
          value={uniqueUsers}
          color="#3b82f6"
          points={weeklyActions}
        />
        <SparklineStatCard
          label="Действий / 30 дней"
          value={actions30d}
          color="#f59e0b"
          points={weeklyActions}
        />
        <SparklineStatCard
          label="Онлайн сейчас"
          value={onlineCount}
          color="#06b6d4"
          points={onlineSpark}
          aside={onlineAside}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <p className="text-sm font-semibold text-gray-900 mb-1">
            Дней с создания
          </p>
          <p className="text-xs text-gray-400 mb-4">
            {new Date(board.createdAt).toLocaleDateString("ru-RU")}
          </p>
          <p className="text-4xl font-bold text-gray-900">{daysSinceCreate}</p>
          <svg
            className="w-full h-10 mt-3"
            viewBox="0 0 100 30"
            preserveAspectRatio="none"
          >
            <polyline
              points={daysSpark
                .map(
                  (value, i) =>
                    `${(i / 5) * 100},${30 - (value / Math.max(...daysSpark, 1)) * 27}`,
                )
                .join(" ")}
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
            />
          </svg>
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
