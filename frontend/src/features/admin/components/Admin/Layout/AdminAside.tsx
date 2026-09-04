"use client";
import { SidebarShell } from "@/shared/ui/SidebarShell/SidebarShell";
import { AdminNav } from "./AdminNav";

// Левый сайдбар админки
export function AdminAside() {
  return (
    <SidebarShell>
      <AdminNav />

      <div className="mt-auto flex items-center gap-2.5 px-3 pt-4">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center flex-shrink-0">
          <svg
            className="w-3.5 h-3.5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <p className="truncate text-sm font-bold text-gray-900">
            Администрирование
          </p>
          <p className="truncate text-[11px] text-gray-400">Управление Nova</p>
        </div>
      </div>
    </SidebarShell>
  );
}
