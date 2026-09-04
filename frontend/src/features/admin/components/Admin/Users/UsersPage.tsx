"use client";
import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useMe,
  IUser,
  TUserRole,
  ROLE_LABELS_SHORT,
  ROLE_BADGE_CLASSES,
} from "@/shared/identity";
import { useModal } from "@/shared/modal/hooks/useModal";
import { UserAvatar } from "@/shared/ui/UserAvatar/UserAvatar";
import { Select } from "@/shared/ui/Select/Select";
import { SearchBox } from "@/shared/ui/SearchBox/SearchBox";
import { SkeletonRow, ISkeletonColumn } from "@/shared/ui/TableRow/SkeletonRow";
import { Pagination } from "@/shared/ui/Pagination/Pagination";
import { useAdminUsers } from "../../../hooks/useAdminUsers";
import {
  USER_ROLE_FILTER_OPTIONS,
  USER_STATUS_FILTER_OPTIONS,
} from "../../../constants/admin.constant";
import { AdminPageHeader } from "../UI/AdminPageHeader";
import { EditUserForm } from "./EditUserForm";

const TABLE_COLUMNS = [
  { key: "user", label: "Пользователь", className: "col-span-5" },
  { key: "role", label: "Роль", className: "col-span-2" },
  { key: "status", label: "Статус", className: "col-span-2" },
  { key: "created", label: "Регистрация", className: "col-span-2" },
  { key: "actions", label: "", className: "col-span-1" },
];

const SKELETON_COLUMNS: ISkeletonColumn[] = [
  { span: 5, avatar: "circle", primary: "w-3/4", secondary: "w-1/2" },
  { span: 2, primary: "w-20" },
  { span: 2, primary: "w-16" },
  { span: 2, primary: "w-1/2" },
  { span: 1 },
];

const PAGE_SIZE = 20;

// Страница управления пользователями: фильтры, поиск, таблица с пагинацией.
export function UsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const emailFilter = searchParams.get("email") ?? "";
  const roleFilter = (searchParams.get("role") ?? "all") as "all" | TUserRole;
  const statusFilter = (searchParams.get("status") ?? "all") as
    | "all"
    | "active"
    | "blocked";

  const [page, setPage] = useState(1);

  const { data: me } = useMe();
  const { data, isLoading } = useAdminUsers({
    page,
    limit: PAGE_SIZE,
    search: emailFilter || undefined,
    role: roleFilter === "all" ? undefined : roleFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
  });
  const { openModal, closeModal } = useModal();

  const updateQuery = useCallback(
    (patch: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (!value || value === "all") next.delete(key);
        else next.set(key, value);
      }
      router.push(
        `/app/admin/users${next.toString() ? `?${next.toString()}` : ""}`,
      );
      setPage(1);
    },
    [router, searchParams],
  );

  const handleOpenUser = (user: IUser) => {
    openModal(
      "Управление пользователем",
      <EditUserForm user={user} onClose={closeModal} />,
      "xl",
      true,
      true,
    );
  };

  return (
    <main className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
      <div className="flex-shrink-0 px-6 pt-6 bg-white z-10">
        <AdminPageHeader
          title="Пользователи"
          description="Управление аккаунтами пользователей"
          actions={
            <SearchBox
              value={emailFilter}
              onSearch={(value) => updateQuery({ email: value || undefined })}
              placeholder="Поиск по email или имени..."
              className="w-72"
            />
          }
        />

        <div className="flex items-center gap-6 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Роль</span>
            <Select
              options={USER_ROLE_FILTER_OPTIONS}
              value={roleFilter}
              onChange={(value) => updateQuery({ role: value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Статус</span>
            <Select
              options={USER_STATUS_FILTER_OPTIONS}
              value={statusFilter}
              onChange={(value) => updateQuery({ status: value })}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0">
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
            Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} columns={SKELETON_COLUMNS} />
            ))
          ) : !data?.users?.length ? (
            <div className="px-4 py-16 text-center">
              <p className="text-sm text-gray-400">Ничего не найдено</p>
            </div>
          ) : (
            data.users.map((user) => {
              const isMe = me?.id === user.id;
              return (
                <div
                  key={user.id}
                  className="grid grid-cols-12 gap-4 px-4 py-4 hover:bg-gray-100 items-center group transition cursor-pointer"
                  onClick={() => handleOpenUser(user)}
                >
                  <div className="col-span-5 flex items-center gap-3">
                    <UserAvatar user={user} size="md" />
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {user.name || "—"}
                        {isMe && (
                          <span className="text-xs text-gray-400 ml-1.5">
                            (вы)
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {user.email}
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded ${ROLE_BADGE_CLASSES[user.role]}`}
                    >
                      {ROLE_LABELS_SHORT[user.role]}
                    </span>
                  </div>

                  <div className="col-span-2">
                    {user.isBlocked ? (
                      <span className="px-2 py-0.5 bg-red-50 text-xs text-red-500 rounded">
                        Заблокирован
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-green-50 text-xs text-green-600 rounded">
                        Активен
                      </span>
                    )}
                  </div>

                  <div className="col-span-2 text-sm text-gray-700">
                    {new Date(user.createdAt).toLocaleDateString("ru-RU")}
                  </div>

                  <div className="col-span-1 flex items-center justify-end">
                    <svg
                      className="w-5 h-5 text-gray-300 opacity-0 group-hover:opacity-100 transition"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {data && data.totalPages > 1 && (
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
