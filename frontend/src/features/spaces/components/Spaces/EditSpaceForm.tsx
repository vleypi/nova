"use client";
import {
  TabbedSettingsModal,
  ITabbedModalTab,
} from "@/shared/ui/TabbedSettingsModal/TabbedSettingsModal";
import type { IEditSpaceFormProps } from "../../interfaces/space.interface";
import { useSpaceById } from "../../hooks/useSpaceById";
import { SpaceNameForm } from "./SpaceNameForm";
import { SpaceInviteCode } from "./SpaceInviteCode";
import { SpaceDangerZone } from "./SpaceDangerZone";
import { SpaceMembersList } from "./SpaceMembersList";

// Модалка управления пространством с табами.
export function EditSpaceForm({
  space: initialSpace,
  onRemoved,
}: IEditSpaceFormProps) {
  const { data: liveSpace } = useSpaceById(initialSpace.id);

  const space = liveSpace ?? initialSpace;

  const tabs: ITabbedModalTab[] = [
    {
      id: "general",
      label: "Основное",
      icon: "fa-sliders-h",
      description: "Название и основные параметры пространства",
      content: (
        <div className="flex flex-col gap-8">
          <SpaceNameForm space={space} />
          <div className="h-px bg-gray-100" />
          <SpaceInviteCode space={space} />
          <div className="h-px bg-gray-100" />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-gray-700">Дата создания</p>
            <p className="text-sm text-gray-400">
              {new Date(space.createdAt).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "members",
      label: "Участники",
      icon: "fa-users",
      description: "Управляйте участниками и их правами доступа",
      content: (
        <SpaceMembersList spaceId={space.id} ownerId={space.ownerId} />
      ),
    },
    {
      id: "danger",
      label: "Опасная зона",
      icon: "fa-exclamation-triangle",
      description: "Необратимые действия — будьте осторожны",
      danger: true,
      content: (
        <SpaceDangerZone
          spaceId={space.id}
          ownerId={space.ownerId}
          onRemoved={onRemoved}
        />
      ),
    },
  ];

  return (
    <TabbedSettingsModal
      sidebarHeader={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {space.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {space.name}
            </p>
            <p className="text-xs text-gray-400">Пространство</p>
          </div>
        </div>
      }
      tabs={tabs}
    />
  );
}
