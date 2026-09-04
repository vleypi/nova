"use client";
import { IUser } from "@/shared/identity";
import { Donut } from "@/shared/ui/Donut/Donut";
import { SparklineStatCard } from "@/shared/ui/SparklineStatCard/SparklineStatCard";
import { ActivityHeatmap } from "@/shared/ui/ActivityHeatmap/ActivityHeatmap";
import { MonthlyBarChart } from "@/shared/ui/MonthlyBarChart/MonthlyBarChart";
import {
  DAY_MS,
  buildMonthlyBuckets,
  buildCumulativeMonthly,
  buildWeeklyBuckets,
  buildHeatmap,
} from "@/shared/utils/chart.util";
import { useAdminUserActivity } from "../../../hooks/useAdminUserActivity";
import { useAdminBoards } from "../../../hooks/useAdminBoards";
import { useAdminSpaces } from "../../../hooks/useAdminSpaces";
import { useAdminAuditLogs } from "../../../hooks/useAdminAuditLogs";

interface IUserStatsTabProps {
  user: IUser;
  onClose: () => void;
}

const MONTHS_WINDOW = 6;
const WEEKS_HEATMAP = 26;
const STATS_FETCH_LIMIT = 500;
const DAYS_30 = 30;

// Таб статистики пользователя в admin: agregate-метрики, charts, heatmap.
export function UserStatsTab({ user, onClose }: IUserStatsTabProps) {
  const { data: activity, isLoading: isLoadingActivity } =
    useAdminUserActivity(user.id, true);
  const { data: boardsPage, isLoading: isLoadingBoards } = useAdminBoards({
    createdBy: user.id,
    limit: STATS_FETCH_LIMIT,
  });
  const { data: spacesPage, isLoading: isLoadingSpaces } = useAdminSpaces({
    memberId: user.id,
    limit: STATS_FETCH_LIMIT,
  });
  const { data: logsPage, isLoading: isLoadingLogs } = useAdminAuditLogs({
    actorId: user.id,
    limit: STATS_FETCH_LIMIT,
  });

  const isLoading =
    isLoadingActivity || isLoadingBoards || isLoadingSpaces || isLoadingLogs;

  if (isLoading) return <StatsSkeleton />;

  const boards = boardsPage?.boards ?? [];
  const spaces = spacesPage?.spaces ?? [];
  const logs = logsPage?.logs ?? [];

  const now = Date.now();
  const daysInSystem = Math.max(
    0,
    Math.floor((now - new Date(user.createdAt).getTime()) / DAY_MS),
  );
  const actions30d = logs.filter(
    (log) => now - new Date(log.createdAt).getTime() < DAYS_30 * DAY_MS,
  ).length;
  const boardsCreated = activity?.stats.boardsCreated ?? boards.length;
  const spacesCount = activity?.stats.spacesCount ?? spaces.length;

  const monthlyBoards = buildMonthlyBuckets(
    boards.map((board) => board.createdAt),
    MONTHS_WINDOW,
  );
  const monthlySpaces = buildCumulativeMonthly(
    spaces.map((space) => space.createdAt),
    MONTHS_WINDOW,
  );
  const weeklyActions = buildWeeklyBuckets(
    logs.map((log) => log.createdAt),
    8,
  );
  const daysSpark = Array.from({ length: 6 }, (_, i) =>
    Math.round((daysInSystem * (i + 1)) / 6),
  );
  const heatmap = buildHeatmap(
    logs.map((log) => log.createdAt),
    WEEKS_HEATMAP,
  );

  const ownerCount = spaces.filter(
    (space) => space.ownerId === user.id,
  ).length;
  const memberCount = spaces.length - ownerCount;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SparklineStatCard
          label="Досок создано"
          value={boardsCreated}
          color="#8b5cf6"
          points={monthlyBoards}
          href={`/app/admin/boards?userId=${user.id}`}
          onNavigate={onClose}
        />
        <SparklineStatCard
          label="Пространств"
          value={spacesCount}
          color="#f59e0b"
          points={monthlySpaces}
          href={`/app/admin/spaces?userId=${user.id}`}
          onNavigate={onClose}
        />
        <SparklineStatCard
          label="Действий / 30 дней"
          value={actions30d}
          color="#3b82f6"
          points={weeklyActions}
        />
        <SparklineStatCard
          label="Дней в системе"
          value={daysInSystem}
          color="#10b981"
          points={daysSpark}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <p className="text-sm font-semibold text-gray-900 mb-4">
            Роли в пространствах
          </p>
          {spaces.length > 0 ? (
            <Donut
              segments={[
                { value: ownerCount, color: "#8b5cf6", label: "Владелец" },
                { value: memberCount, color: "#3b82f6", label: "Участник" },
              ]}
            />
          ) : (
            <p className="text-xs text-gray-400 text-center py-10">
              Пользователь не состоит ни в одном пространстве
            </p>
          )}
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <p className="text-sm font-semibold text-gray-900 mb-4">
            Доски по месяцам
          </p>
          <MonthlyBarChart buckets={monthlyBoards} />
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
        <div className="h-44 bg-white border border-gray-100 rounded-xl animate-pulse" />
        <div className="h-44 bg-white border border-gray-100 rounded-xl animate-pulse" />
      </div>
      <div className="h-32 bg-white border border-gray-100 rounded-xl animate-pulse" />
    </div>
  );
}
