"use client";
import { useState, type SubmitEventHandler } from "react";
import { useMe, ROLE_LABELS_FULL } from "@/shared/identity";
import { UserAvatar } from "@/shared/ui/UserAvatar/UserAvatar";
import { useUpdateProfile } from "../../hooks/useUpdateProfile";

// Таб «Общие»: имя, email, роль, дата регистрации.
export function ProfileGeneralTab() {
  const { data: me } = useMe();
  const { mutate: updateProfile, isPending } = useUpdateProfile();

  const [name, setName] = useState(me?.name ?? "");
  const [lastServerName, setLastServerName] = useState(me?.name ?? "");

  // Sync local state с server-truth без cascading effect.
  if ((me?.name ?? "") !== lastServerName) {
    setLastServerName(me?.name ?? "");
    setName(me?.name ?? "");
  }

  if (!me) return null;

  const trimmedName = name.trim();
  const hasChanges = trimmedName !== "" && trimmedName !== (me.name ?? "");

  const handleSave: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    if (!hasChanges) return;

    updateProfile({ name: trimmedName });
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-5">
        <UserAvatar user={me} size="xl" shape="rounded" />
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-gray-900 truncate">
            {me.name || "Без имени"}
          </p>
          <p className="text-sm text-gray-400 truncate mt-0.5">{me.email}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="px-2 py-0.5 text-xs font-medium bg-nova-blue/10 text-nova-blue rounded-md">
              {ROLE_LABELS_FULL[me.role]}
            </span>
            {me.isBlocked ? (
              <span className="px-2 py-0.5 text-xs font-medium bg-red-50 text-red-500 rounded-md">
                Заблокирован
              </span>
            ) : (
              <span className="px-2 py-0.5 text-xs font-medium bg-green-50 text-green-600 rounded-md">
                Активен
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="h-px bg-gray-100" />

      <form onSubmit={handleSave} className="flex flex-col gap-3">
        <div>
          <p className="text-sm font-medium text-gray-700">Имя</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Отображается для других участников пространства
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={isPending}
            placeholder="Введите имя"
            className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-nova-blue/30 focus:border-nova-blue transition disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isPending || !hasChanges}
            className="px-4 py-2.5 text-sm font-medium bg-nova-blue text-white rounded-lg hover:bg-nova-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition flex-shrink-0"
          >
            {isPending ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </form>

      <div className="h-px bg-gray-100" />

      <div className="flex flex-col gap-3">
        <div>
          <p className="text-sm font-medium text-gray-700">Email</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Привязан к аккаунту и не может быть изменён
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-lg">
          <svg
            className="w-4 h-4 text-gray-400 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <span className="text-sm text-gray-500">{me.email}</span>
        </div>
      </div>

      <div className="h-px bg-gray-100" />

      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-gray-700">Дата регистрации</p>
        <p className="text-sm text-gray-400">
          {new Date(me.createdAt).toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>
    </div>
  );
}
