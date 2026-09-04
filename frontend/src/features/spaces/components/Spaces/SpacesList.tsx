"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useModal } from "@/shared/modal/hooks/useModal";
import {
  DASHBOARD_ROOT,
  getSpaceUrl,
} from "@/shared/config/routes.constant";
import type {
  ISpace,
  ISpacesListProps,
} from "../../interfaces/space.interface";
import { EditSpaceForm } from "./EditSpaceForm";

// Список пространств в сайдбаре с кнопкой настроек по hover.
export function SpacesList({ spaces }: ISpacesListProps) {
  const params = useParams();
  const router = useRouter();
  const { openModal, closeModal } = useModal();

  const handleEditSpace = (space: ISpace) => {
    openModal(
      "Редактировать пространство",
      <EditSpaceForm
        space={space}
        onRemoved={() => {
          closeModal();
          router.push(DASHBOARD_ROOT);
        }}
      />,
      "xl",
      true,
      true,
    );
  };

  return (
    <nav className="space-y-1">
      {spaces.map((space) => {
        const isActive = space.id === params.spaceId;
        return (
          <div
            key={space.id}
            className={`relative group flex items-center rounded-lg transition overflow-hidden ${isActive ? "bg-blue-50" : "hover:bg-gray-100"}`}
          >
            <Link
              href={getSpaceUrl(space.id)}
              className={`flex items-center gap-3 px-3 py-2.5 font-medium text-sm flex-1 min-w-0 overflow-hidden ${isActive ? "text-nova-blue" : "text-gray-700"}`}
            >
              <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {space.name.charAt(0).toUpperCase()}
              </div>
              <span className="truncate min-w-0 pr-2">{space.name}</span>
            </Link>

            <button
              onClick={(event) => {
                event.preventDefault();
                handleEditSpace(space);
              }}
              className="space-edit-btn absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-nova-dark opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Настройки пространства"
            >
              <i className="fas fa-ellipsis-v text-xs" />
            </button>
          </div>
        );
      })}
    </nav>
  );
}
