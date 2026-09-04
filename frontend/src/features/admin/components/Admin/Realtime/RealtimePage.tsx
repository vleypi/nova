"use client";
import { useState } from "react";
import { useMe } from "@/shared/identity";
import { useAdminRealtime } from "../../../hooks/useAdminRealtime";
import { useAdminDisconnect } from "../../../hooks/useAdminDisconnect";
import { useAdminBroadcast } from "../../../hooks/useAdminBroadcast";
import { AdminPageHeader } from "../UI/AdminPageHeader";

// Страница мониторинга
export function RealtimePage() {
  const { data: me } = useMe();
  const { data: boards, isLoading } = useAdminRealtime();
  const { mutate: disconnect } = useAdminDisconnect();
  const { mutate: broadcast, isPending: isBroadcasting } = useAdminBroadcast();

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  const isSuperAdmin = me?.role === "SUPER_ADMIN";
  const isAdmin = me?.role === "ADMIN" || isSuperAdmin;

  const handleBroadcast = () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    broadcast(
      { message: trimmed, type: messageType },
      { onSuccess: () => setMessage("") },
    );
  };

  return (
    <main className="flex-1 overflow-y-auto p-8">
      <AdminPageHeader
        title="Реалтайм"
        description="Активные доски и онлайн пользователи (обновляется каждые 10 сек)"
      />

      {isSuperAdmin && (
        <div className="bg-white border border-gray-100 rounded-xl p-5 mb-6">
          <p className="text-sm font-medium text-gray-900 mb-3">
            Системное сообщение
          </p>
          <div className="flex gap-2">
            <select
              value={messageType}
              onChange={(event) => setMessageType(event.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none"
            >
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="maintenance">Maintenance</option>
            </select>
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Введите сообщение для рассылки..."
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-nova-blue/30"
            />
            <button
              onClick={handleBroadcast}
              disabled={isBroadcasting || !message.trim()}
              className="px-4 py-2 text-sm font-medium bg-nova-blue text-white rounded-lg hover:bg-nova-blue/90 disabled:opacity-50 transition"
            >
              {isBroadcasting ? "Отправка..." : "Отправить"}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-white border border-gray-100 rounded-xl p-5 animate-pulse"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="space-y-1.5">
                  <div className="h-3.5 w-40 bg-gray-100 rounded" />
                  <div className="h-3 w-24 bg-gray-100 rounded" />
                </div>
                <div className="h-5 w-16 bg-gray-100 rounded" />
              </div>
              <div className="flex gap-2">
                {[1, 2, 3].map((groupIndex) => (
                  <div
                    key={groupIndex}
                    className="h-7 w-24 bg-gray-50 rounded-lg"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : !boards || boards.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-8 text-center">
          <p className="text-sm text-gray-400">Нет активных досок</p>
        </div>
      ) : (
        <div className="space-y-3">
          {boards.map((board) => (
            <div
              key={board.boardId}
              className="bg-white border border-gray-100 rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {board.boardName}
                  </p>
                  <p className="text-xs text-gray-400">{board.boardId}</p>
                </div>
                <span className="px-2 py-0.5 text-xs font-medium bg-green-50 text-green-600 rounded">
                  {board.users.length} онлайн
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {board.users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-50 rounded-lg"
                  >
                    <span className="w-2 h-2 rounded-full bg-green-400" />
                    <span className="text-xs text-gray-700">
                      {user.name || user.id}
                    </span>
                    {isAdmin && (
                      <button
                        onClick={() => disconnect(user.id)}
                        className="text-xs text-red-400 hover:text-red-600 ml-1"
                        title="Отключить"
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
