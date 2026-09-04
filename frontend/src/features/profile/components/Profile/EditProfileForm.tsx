"use client";
import { useMe } from "@/shared/identity";
import { UserAvatar } from "@/shared/ui/UserAvatar/UserAvatar";
import {
  TabbedSettingsModal,
  ITabbedModalTab,
} from "@/shared/ui/TabbedSettingsModal/TabbedSettingsModal";
import { ProfileGeneralTab } from "./ProfileGeneralTab";
import { ProfileIntegrationsTab } from "./ProfileIntegrationsTab";
import { ProfileDangerZone } from "./ProfileDangerZone";

interface IEditProfileFormProps {
  onClose: () => void;
}

// Модалка редактирования профиля. Композирует табы: общее, интеграции, опасная зона.
export function EditProfileForm({ onClose }: IEditProfileFormProps) {
  const { data: me } = useMe();

  if (!me) return null;

  const tabs: ITabbedModalTab[] = [
    {
      id: "general",
      label: "Основное",
      icon: "fa-sliders-h",
      description: "Имя, email и основная информация",
      content: <ProfileGeneralTab />,
    },
    {
      id: "integrations",
      label: "Интеграции",
      icon: "fa-plug",
      description: "Подключение сторонних аккаунтов для входа",
      content: <ProfileIntegrationsTab />,
    },
    {
      id: "danger",
      label: "Опасная зона",
      icon: "fa-exclamation-triangle",
      description: "Необратимые действия — будьте осторожны",
      danger: true,
      content: <ProfileDangerZone onLoggedOut={onClose} />,
    },
  ];

  return (
    <TabbedSettingsModal
      sidebarHeader={
        <div className="flex items-center gap-2.5">
          <UserAvatar user={me} size="sm" shape="rounded" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {me.name || "Без имени"}
            </p>
            <p className="text-xs text-gray-400">Профиль</p>
          </div>
        </div>
      }
      tabs={tabs}
    />
  );
}
