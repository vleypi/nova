"use client";
import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useModal } from "@/shared/modal/hooks/useModal";
import { Pagination } from "@/shared/ui/Pagination/Pagination";
import { SearchBox } from "@/shared/ui/SearchBox/SearchBox";
import { SkeletonRow, ISkeletonColumn } from "@/shared/ui/TableRow/SkeletonRow";
import { useAdminSpaces } from "../../../hooks/useAdminSpaces";
import { IAdminSpace } from "../../../interfaces/admin.interface";
import { AdminPageHeader } from "../UI/AdminPageHeader";
import { UserFilterPill } from "../UI/UserFilterPill";
import { EditSpaceForm } from "./EditSpaceForm";

const TABLE_COLUMNS = [
  { key: "name", label: "Пространство", className: "col-span-5" },
  { key: "members", label: "Участники", className: "col-span-2" },
  { key: "invite", label: "Инвайт-код", className: "col-span-3" },
  { key: "created", label: "Создано", className: "col-span-2" },
];

const SKELETON_COLUMNS: ISkeletonColumn[] = [
  { span: 5, avatar: "rounded", primary: "w-3/4", secondary: "w-1/2" },
  { span: 2, primary: "w-10" },
  { span: 3, primary: "w-2/3" },
  { span: 2, primary: "w-1/2" },
];

const PAGE_SIZE = 20;

// Страница управления пространствами
export function SpacesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const userIdFilter = searchParams.get("userId") ?? undefined;
  const searchFilter = searchParams.get("search") ?? "";

  const [page, setPage] = useState(1);

  const { data, isLoading } = useAdminSpaces({
    page,
    limit: PAGE_SIZE,
    search: searchFilter || undefined,
    memberId: userIdFilter,
  });
  const { openModal, closeModal } = useModal();

  const handleOpenSpace = (space: IAdminSpace) => {
    openModal(
      "Управление пространством",
      <EditSpaceForm space={space} onClose={closeModal} />,
      "xl",
      true,
      true,
    );
  };

  const updateQuery = useCallback(
    (patch: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (!value) next.delete(key);
        else next.set(key, value);
      }
      router.push(
        `/app/admin/spaces${next.toString() ? `?${next.toString()}` : ""}`,
      );
      setPage(1);
    },
    [router, searchParams],
  );

  const resetUserFilter = () => updateQuery({ userId: undefined });

  return (
    <main className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
      <div className="flex-shrink-0 px-6 pt-6 bg-white z-10">
        <AdminPageHeader
          title="Пространства"
          description="Все пространства на платформе"
          actions={
            <SearchBox
              value={searchFilter}
              onSearch={(value) => updateQuery({ search: value || undefined })}
              placeholder="Поиск по названию..."
              className="w-72"
            />
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
            Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} columns={SKELETON_COLUMNS} />
            ))
          ) : !data?.spaces?.length ? (
            <div className="px-4 py-16 text-center">
              <p className="text-sm text-gray-400">Ничего не найдено</p>
            </div>
          ) : (
            data.spaces.map((space) => (
              <div
                key={space.id}
                className="grid grid-cols-12 gap-4 px-4 py-4 hover:bg-gray-100 items-center transition cursor-pointer"
                onClick={() => handleOpenSpace(space)}
              >
                <div className="col-span-5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                    {space.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {space.name}
                    </div>
                    <div className="text-xs text-gray-500 font-mono truncate">
                      {space.id}
                    </div>
                  </div>
                </div>
                <div className="col-span-2">
                  <span className="px-2 py-0.5 bg-blue-50 text-xs text-blue-600 rounded font-medium">
                    {space.membersCount}
                  </span>
                </div>
                <div className="col-span-3 text-sm text-gray-700 font-mono truncate">
                  {space.inviteCode}
                </div>
                <div className="col-span-2 text-sm text-gray-700">
                  {new Date(space.createdAt).toLocaleDateString("ru-RU")}
                </div>
              </div>
            ))
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
