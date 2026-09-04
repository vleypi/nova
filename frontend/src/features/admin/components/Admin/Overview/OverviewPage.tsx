"use client";
import { Donut } from "@/shared/ui/Donut/Donut";
import { SparklineStatCard } from "@/shared/ui/SparklineStatCard/SparklineStatCard";
import { ActivityHeatmap } from "@/shared/ui/ActivityHeatmap/ActivityHeatmap";
import { MonthlyBarChart } from "@/shared/ui/MonthlyBarChart/MonthlyBarChart";
import { useAdminOverview } from "../../../hooks/useAdminOverview";
import { useAdminTimeseries } from "../../../hooks/useAdminTimeseries";
import { IAdminTimeseries } from "../../../interfaces/admin.interface";
import { AdminPageHeader } from "../UI/AdminPageHeader";

const MONTHS_WINDOW = 6;
const HEATMAP_DAYS = 182;

interface IResolvedOverviewProps {
  overview: NonNullable<ReturnType<typeof useAdminOverview>["data"]>;
  timeseries: IAdminTimeseries;
}

interface ITodayRowProps {
  label: string;
  value: number;
  color: string;
}

// Главная страница админки
export function OverviewPage() {
  const { data: overview, isLoading: isLoadingOverview } = useAdminOverview();
  const { data: timeseries, isLoading: isLoadingTimeseries } =
    useAdminTimeseries({
      months: MONTHS_WINDOW,
      days: HEATMAP_DAYS,
    });

  const isLoading = isLoadingOverview || isLoadingTimeseries;
  const isReady = !isLoading && overview && timeseries;

  return (
    <main className="flex-1 overflow-y-auto p-8">
      <AdminPageHeader
        title="Обзор"
        description="Общая статистика платформы Nova"
      />

      {isReady ? (
        <ResolvedOverview overview={overview} timeseries={timeseries} />
      ) : (
        <OverviewSkeleton />
      )}
    </main>
  );
}

// Контент после загрузки данных: 4 stat-карточки + charts + heatmap.
function ResolvedOverview({ overview, timeseries }: IResolvedOverviewProps) {
  const heatmap = dailyToWeeks(timeseries.activityDaily);
  const activeUsers = overview.users.total - overview.users.blocked;
  const onlineSpark = Array(MONTHS_WINDOW).fill(overview.online.users);

  const onlineAside = (
    <span className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
      <span className="text-[10px] text-gray-400 uppercase tracking-wider">
        live
      </span>
    </span>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SparklineStatCard
          label="Пользователи"
          value={overview.users.total}
          color="#3b82f6"
          points={timeseries.usersMonthly}
          href="/app/admin/users"
        />
        <SparklineStatCard
          label="Доски"
          value={overview.boards.total}
          color="#8b5cf6"
          points={timeseries.boardsMonthly}
          href="/app/admin/boards"
        />
        <SparklineStatCard
          label="Пространств"
          value={overview.spaces.total}
          color="#f59e0b"
          points={timeseries.spacesMonthly}
          href="/app/admin/spaces"
        />
        <SparklineStatCard
          label="Онлайн сейчас"
          value={overview.online.users}
          color="#06b6d4"
          points={onlineSpark}
          aside={onlineAside}
          href="/app/admin/realtime"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <p className="text-sm font-semibold text-gray-900 mb-4">
            Статус пользователей
          </p>
          {overview.users.total > 0 ? (
            <Donut
              segments={[
                { value: activeUsers, color: "#10b981", label: "Активные" },
                {
                  value: overview.users.blocked,
                  color: "#ef4444",
                  label: "Заблокированные",
                },
              ]}
            />
          ) : (
            <p className="text-xs text-gray-400 text-center py-10">
              Нет пользователей
            </p>
          )}
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <p className="text-sm font-semibold text-gray-900 mb-4">
            Новые доски по месяцам
          </p>
          <MonthlyBarChart buckets={timeseries.boardsMonthly} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <p className="text-sm font-semibold text-gray-900 mb-1">Сегодня</p>
          <p className="text-xs text-gray-400 mb-4">
            Новые записи за текущий день
          </p>
          <div className="flex flex-col gap-3">
            <TodayRow
              label="Пользователи"
              value={overview.users.today}
              color="text-blue-600"
            />
            <TodayRow
              label="Доски"
              value={overview.boards.today}
              color="text-purple-600"
            />
            <TodayRow
              label="Пространства"
              value={overview.spaces.today}
              color="text-amber-600"
            />
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <p className="text-sm font-semibold text-gray-900 mb-1">
            Новые пространства по месяцам
          </p>
          <p className="text-xs text-gray-400 mb-4">
            Последние {MONTHS_WINDOW} месяцев
          </p>
          <MonthlyBarChart
            buckets={timeseries.spacesMonthly}
            barColor="bg-amber-500"
          />
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <p className="text-sm font-semibold text-gray-900">Реалтайм</p>
          </div>
          <p className="text-xs text-gray-400 mb-4">Активность прямо сейчас</p>
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-cyan-600">
                {overview.online.users}
              </span>
              <span className="text-sm text-gray-400">
                пользователей онлайн
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-violet-600">
                {overview.online.boards}
              </span>
              <span className="text-sm text-gray-400">активных досок</span>
            </div>
          </div>
        </div>
      </div>

      <ActivityHeatmap
        title="Активность платформы"
        subtitle={`Последние ${Math.round(HEATMAP_DAYS / 30)} месяцев · ${timeseries.activityTotal} действий из audit log`}
        weeks={heatmap}
      />
    </div>
  );
}

// Строка «Сегодня» с цветным значением.
function TodayRow({ label, value, color }: ITodayRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-xl font-bold ${color}`}>+{value}</span>
    </div>
  );
}

// Преобразование daily-значений в недельные buckets для heatmap.
function dailyToWeeks(daily: number[]): number[][] {
  if (daily.length === 0) return [];
  const weeks: number[][] = [];
  const pad = (7 - (daily.length % 7)) % 7;
  const padded = [...Array(pad).fill(0), ...daily];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }
  return weeks;
}

// Skeleton overview-страницы на время загрузки.
function OverviewSkeleton() {
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-44 bg-white border border-gray-100 rounded-xl animate-pulse"
          />
        ))}
      </div>
      <div className="h-32 bg-white border border-gray-100 rounded-xl animate-pulse" />
    </div>
  );
}
