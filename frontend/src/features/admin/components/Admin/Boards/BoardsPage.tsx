"use client";
import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useModal } from "@/shared/modal/hooks/useModal";
import { Pagination } from "@/shared/ui/Pagination/Pagination";
import { Select } from "@/shared/ui/Select/Select";
import { SearchBox } from "@/shared/ui/SearchBox/SearchBox";
import { SkeletonRow, ISkeletonColumn } from "@/shared/ui/TableRow/SkeletonRow";
import { formatDateRu } from "@/shared/utils/date.util";
import {
  BOARD_ICON_PATH,
  getBoardGradient,
} from "@/features/boards";
import { useAdminBoards } from "../../../hooks/useAdminBoards";
import { IAdminBoard } from "../../../interfaces/admin.interface";
import { BOARD_PRIVACY_FILTER_OPTIONS } from "../../../constants/admin.constant";
import { AdminPageHeader } from "../UI/AdminPageHeader";
import { UserFilterPill } from "../UI/UserFilterPill";
import { EditBoardForm } from "./EditBoardForm";

const TABLE_COLUMNS = [
  { key: "name", label: "Доска", className: "col-span-5" },
  { key: "author", label: "Автор", className: "col-span-3" },
  { key: "privacy", label: "Приватность", className: "col-span-2" },
  { key: "created", label: "Создана", className: "col-span-2" },
];

const SKELETON_COLUMNS: ISkeletonColumn[] = [
  { span: 5, avatar: "rounded", primary: "w-3/4", secondary: "w-1/2" },
  { span: 3, primary: "w-2/3" },
  { span: 2, primary: "w-20" },
  { span: 2, primary: "w-2/3" },
];

const PAGE_SIZE = 20;

// Страница управления досками
export function BoardsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const userIdFilter = searchParams.get("userId") ?? undefined;
  const searchFilter = searchParams.get("search") ?? "";
  const privacyFilter = (searchParams.get("privacy") ?? "all") as
    | "all"
    | "public"
    | "private";

  const [page, setPage] = useState(1);

  const { data, isLoading } = useAdminBoards({
    page,
    limit: PAGE_SIZE,
    search: searchFilter || undefined,
    createdBy: userIdFilter,
    privacy: privacyFilter === "all" ? undefined : privacyFilter,
  });
  const { openModal, closeModal } = useModal();

  const handleOpenBoard = (board: IAdminBoard) => {
    openModal(
      "Управление доской",
      <EditBoardForm board={board} onClose={closeModal} />,
      "xl",
      true,
      true,
    );
  };

  const updateQuery = useCallback(
    (patch: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (!value || value === "all") next.delete(key);
        else next.set(key, value);
      }
      router.push(
        `/app/admin/boards${next.toString() ? `?${next.toString()}` : ""}`,
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
          title="Доски"
          description="Все доски на платформе"
          actions={
            <SearchBox
              value={searchFilter}
              onSearch={(value) => updateQuery({ search: value || undefined })}
              placeholder="Поиск по названию..."
              className="w-72"
            />
          }
        />

        <div className="flex items-center gap-6 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Приватность</span>
            <Select
              options={BOARD_PRIVACY_FILTER_OPTIONS}
              value={privacyFilter}
              onChange={(value) => updateQuery({ privacy: value })}
            />
          </div>
        </div>
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
          ) : !data?.boards?.length ? (
            <div className="px-4 py-16 text-center">
              <p className="text-sm text-gray-400">Ничего не найдено</p>
            </div>
          ) : (
            data.boards.map((board, index) => (
              <div
                key={board.id}
                className="grid grid-cols-12 gap-4 px-4 py-4 hover:bg-gray-100 items-center transition cursor-pointer"
                onClick={() => handleOpenBoard(board)}
              >
                <div className="col-span-5 flex items-center gap-3">
                  <div
                    className={`w-10 h-10 ${getBoardGradient(board.thumbnail, index)} rounded-lg flex items-center justify-center flex-shrink-0`}
                  >
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d={BOARD_ICON_PATH}
                      />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {board.name}
                    </div>
                    <div className="text-xs text-gray-500 font-mono truncate">
                      {board.id}
                    </div>
                  </div>
                </div>

                <div className="col-span-3 text-sm text-gray-700 truncate">
                  {board.createdByUser?.name || "—"}
                </div>

                <div className="col-span-2">
                  {board.isPrivate ? (
                    <span className="px-2 py-0.5 bg-gray-100 text-xs text-gray-600 rounded">
                      Приватная
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-blue-50 text-xs text-blue-600 rounded">
                      Публичная
                    </span>
                  )}
                </div>

                <div className="col-span-2 text-sm text-gray-700">
                  {formatDateRu(board.createdAt)}
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
