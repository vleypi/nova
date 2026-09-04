"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Pagination } from "@/shared/ui/Pagination/Pagination";
import { SkeletonRow, ISkeletonColumn } from "@/shared/ui/TableRow/SkeletonRow";
import { useAdminAuditLogs } from "../../../hooks/useAdminAuditLogs";
import { AdminPageHeader } from "../UI/AdminPageHeader";
import { UserFilterPill } from "../UI/UserFilterPill";

interface IActionMeta {
  label: string;
  color: string;
}

const ACTION_LABELS: Record<string, IActionMeta> = {
  BOARD_DELETED: { label: "Удаление доски", color: "bg-red-50 text-red-600" },
  USER_ROLE_CHANGED: {
    label: "Смена роли",
    color: "bg-purple-50 text-purple-600",
  },
  USER_BLOCKED: { label: "Блокировка", color: "bg-orange-50 text-orange-600" },
  USER_UNBLOCKED: {
    label: "Разблокировка",
    color: "bg-green-50 text-green-600",
  },
  USER_DELETED: {
    label: "Удаление пользователя",
    color: "bg-red-50 text-red-600",
  },
  USER_DISCONNECTED: {
    label: "Отключение",
    color: "bg-amber-50 text-amber-600",
  },
  SYSTEM_BROADCAST: { label: "Рассылка", color: "bg-blue-50 text-blue-600" },
};

const TABLE_COLUMNS = [
  { key: "date", label: "Дата", className: "col-span-3" },
  { key: "actor", label: "Актор", className: "col-span-3" },
  { key: "action", label: "Действие", className: "col-span-2" },
  { key: "details", label: "Детали", className: "col-span-4" },
];

const SKELETON_COLUMNS: ISkeletonColumn[] = [
  { span: 3, primary: "w-3/4" },
  { span: 3, primary: "w-2/3" },
  { span: 2, primary: "w-24" },
  { span: 4, primary: "w-4/5" },
];

const PAGE_SIZE = 20;

// Страница аудит-логов админки
export function AuditPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const userIdFilter = searchParams.get("userId") ?? undefined;

  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");

  const { data, isLoading } = useAdminAuditLogs({
    page,
    limit: PAGE_SIZE,
    action: action || undefined,
    targetId: userIdFilter,
  });

  const resetUserFilter = () => router.push("/app/admin/audit");

  return (
    <main className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
      <div className="flex-shrink-0 px-6 pt-6 bg-white z-10">
        <AdminPageHeader
          title="Аудит"
          description="Журнал действий администраторов"
          actions={
            <select
              value={action}
              onChange={(event) => {
                setAction(event.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-nova-blue bg-white"
            >
              <option value="">Все действия</option>
              {Object.entries(ACTION_LABELS).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          }
        />
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0">
        {userIdFilter && (
          <UserFilterPill userId={userIdFilter} onReset={resetUserFilter} />
        )}

        <div className="sticky top-0 z-10 bg-gray-50 rounded-t-lg">
          <div className="grid grid-cols-12 gap-4 px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
            {TABLE_COLUMNS.map((column) => (
              <div key={column.key} className={`${column.className} truncate`}>
                {column.label}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-b-lg">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <SkeletonRow key={i} columns={SKELETON_COLUMNS} />
            ))
          ) : !data?.logs?.length ? (
            <div className="px-4 py-16 text-center">
              <p className="text-sm text-gray-400">Записей не найдено</p>
            </div>
          ) : (
            data.logs.map((log) => {
              const actionInfo = ACTION_LABELS[log.action] || {
                label: log.action,
                color: "bg-gray-100 text-gray-600",
              };
              return (
                <div
                  key={log.id}
                  className="grid grid-cols-12 gap-4 px-4 py-4 hover:bg-gray-100 items-center transition"
                >
                  <div className="col-span-3 text-sm text-gray-700">
                    {new Date(log.createdAt).toLocaleString("ru-RU")}
                  </div>
                  <div className="col-span-3 text-sm text-gray-700 truncate">
                    {log.actorEmail}
                  </div>
                  <div className="col-span-2">
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded ${actionInfo.color}`}
                    >
                      {actionInfo.label}
                    </span>
                  </div>
                  <div className="col-span-4 text-xs text-gray-500 truncate">
                    {log.details || "—"}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {data && (
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            onPageChange={setPage}
          />
        )}
      </div>
    </main>
  );
}
