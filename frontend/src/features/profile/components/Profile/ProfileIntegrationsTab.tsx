"use client";
import Image from "next/image";
import { useMe } from "@/shared/identity";
import { useUnlinkProvider } from "../../hooks/useUnlinkProvider";

// OAuth-провайдеры для linking в профиле (отличаются от LOGIN-провайдеров).
const OAUTH_PROVIDERS = [
  {
    id: "google" as const,
    name: "Google",
    icon: "/providers/google.svg",
    field: "googleId" as const,
    linkHref: "/api/auth/google/link",
    description: "Используйте Google для быстрого входа",
  },
  {
    id: "github" as const,
    name: "GitHub",
    icon: "/providers/github.svg",
    field: "githubId" as const,
    linkHref: "/api/auth/github/link",
    description: "Используйте GitHub для быстрого входа",
  },
];

// Таб «Интеграции»: список OAuth-провайдеров с linking/unlinking.
export function ProfileIntegrationsTab() {
  const { data: me } = useMe();
  const { mutate: unlink, isPending } = useUnlinkProvider();

  if (!me) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-medium text-gray-700">
          Подключённые аккаунты
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          Войти в Nova можно через подключённые провайдеры
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {OAUTH_PROVIDERS.map((provider) => {
          const isConnected = !!me[provider.field];
          return (
            <div
              key={provider.id}
              className="flex items-center justify-between px-4 py-4 border border-gray-100 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <Image
                  src={provider.icon}
                  alt={provider.name}
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {provider.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {isConnected ? "Подключён" : provider.description}
                  </p>
                </div>
              </div>

              {isConnected ? (
                <button
                  onClick={() => unlink(provider.id)}
                  disabled={isPending}
                  className="px-3 py-1.5 text-xs font-medium text-red-500 border border-red-200 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                >
                  Отключить
                </button>
              ) : (
                <button
                  onClick={() => {
                    window.location.href = provider.linkHref;
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-nova-blue border border-nova-blue/20 hover:bg-nova-blue/5 rounded-lg transition"
                >
                  Подключить
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
