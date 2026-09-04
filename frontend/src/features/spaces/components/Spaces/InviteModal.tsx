"use client";
import { useState } from "react";
import { getInviteLink } from "@/shared/config/routes.constant";
import { useSpaces } from "../../hooks/useSpaces";
import { CreateSpaceForm } from "./CreateSpaceForm";

// Модалка с invite-ссылками по всем пространствам пользователя.
export function InviteModal() {
  const { data: spaces, isLoading } = useSpaces();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const handleCopy = (inviteCode: string, spaceId: string) => {
    navigator.clipboard.writeText(getInviteLink(inviteCode));
    setCopiedId(spaceId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!spaces?.length) {
    if (creating) {
      return (
        <CreateSpaceForm
          onSuccess={() => setCreating(false)}
          onCancel={() => setCreating(false)}
        />
      );
    }
    return (
      <div className="flex flex-col items-center py-8 gap-3">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">Нет пространств</p>
          <p className="text-xs text-gray-400 mt-1">
            Создайте пространство, чтобы пригласить участников
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="mt-1 px-4 py-2 text-sm font-medium bg-nova-blue text-white rounded-lg hover:bg-nova-blue/90 transition"
        >
          Создать пространство
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-500">
        Поделитесь ссылкой — участник получит доступ к пространству сразу после
        перехода.
      </p>
      <div className="flex flex-col gap-3">
        {spaces.map((space) => (
          <div
            key={space.id}
            className="flex flex-col gap-2.5 p-4 rounded-xl border border-gray-100 bg-gray-50"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-nova-blue flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                {space.name[0].toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-800">
                {space.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-400 truncate font-mono select-all">
                {getInviteLink(space.inviteCode)}
              </div>
              <button
                onClick={() => handleCopy(space.inviteCode, space.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition ${
                  copiedId === space.id
                    ? "bg-green-50 text-green-600"
                    : "bg-nova-blue text-white hover:bg-nova-blue/90"
                }`}
              >
                {copiedId === space.id ? (
                  <>
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Скопировано
                  </>
                ) : (
                  <>
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    Копировать
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
