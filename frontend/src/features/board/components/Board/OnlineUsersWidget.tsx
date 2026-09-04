"use client";
import { useState, useRef, useEffect } from "react";
import { IWsOnlineUser } from "@/features/board/engine/types";
const AVATAR_COLORS = [
  "#4262ff",
  "#9d6cff",
  "#ff79d1",
  "#7fd6c2",
  "#ffd233",
  "#f97316",
  "#22c55e",
  "#ef4444",
  "#06b6d4",
  "#8b5cf6",
];
function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++)
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
interface IAvatarProps {
  user: IWsOnlineUser;
  size?: number;
  className?: string;
}
function Avatar({ user, size = 28, className = "" }: IAvatarProps) {
  const color = getAvatarColor(user.id);
  if (user.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.name}
        title={user.name}
        style={{ width: size, height: size }}
        className={`rounded-full object-cover ring-2 ring-white flex-shrink-0 ${className}`}
      />
    );
  }
  return (
    <div
      title={user.name}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        fontSize: size * 0.38,
      }}
      className={`rounded-full ring-2 ring-white flex-shrink-0 flex items-center justify-center font-semibold text-white ${className}`}
    >
      {getInitials(user.name)}
    </div>
  );
}
interface IOnlineUsersWidgetProps {
  users: IWsOnlineUser[];
}
export function OnlineUsersWidget({ users }: IOnlineUsersWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const MAX_VISIBLE = 3;
  const visible = users.slice(0, MAX_VISIBLE);
  const overflow = users.length - MAX_VISIBLE;
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);
  return (
    <div ref={dropdownRef} className="absolute top-4 right-4 z-50">
      <div className="h-12 bg-white rounded-lg shadow-md flex items-center gap-2 px-3">
        <div className="flex items-center">
          {users.length === 0 ? (
            <div
              style={{ width: 30, height: 30, fontSize: 11 }}
              className="rounded-full bg-gray-100 flex items-center justify-center text-gray-400"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
              </svg>
            </div>
          ) : (
            <>
              {visible.map((user, i) => (
                <div
                  key={user.id}
                  style={{ marginLeft: i === 0 ? 0 : -8 }}
                  className="relative"
                >
                  <Avatar user={user} size={30} />
                </div>
              ))}
              {overflow > 0 && (
                <div
                  style={{
                    marginLeft: -8,
                    width: 30,
                    height: 30,
                    fontSize: 11,
                  }}
                  className="rounded-full ring-2 ring-white bg-gray-100 flex items-center justify-center font-semibold text-gray-600 flex-shrink-0"
                >
                  +{overflow}
                </div>
              )}
            </>
          )}
        </div>

        <div className="w-px h-6 bg-gray-200" />

        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors pr-0.5"
        >
          <span className="font-medium">{users.length}</span>
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 py-2 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Онлайн · {users.length}
            </span>
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {users.map((user) => (
              <li
                key={user.id}
                className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors"
              >
                <Avatar user={user} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>

                <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
