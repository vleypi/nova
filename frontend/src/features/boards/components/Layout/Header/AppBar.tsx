"use client";
import { useMe } from "@/shared/identity";
import { useModal } from "@/shared/modal/hooks/useModal";
import { UserAvatar } from "@/shared/ui/UserAvatar/UserAvatar";
import { InviteModal } from "@/features/spaces";
import { EditProfileForm } from "@/features/profile";
import { useSidebar } from "../../../providers/SidebarProvider";

interface IAppBarProps {
  showPlanBadge?: boolean;
  showInviteButton?: boolean;
}

// Верхняя шапка приложения с logo, toggle, invite-кнопкой и user-меню.
export function AppBar({
  showPlanBadge = true,
  showInviteButton = true,
}: IAppBarProps = {}) {
  const { data: me } = useMe();
  const { openModal, closeModal } = useModal();
  const { toggle } = useSidebar();

  const handleInvite = () => {
    openModal("Пригласить участников", <InviteModal />);
  };

  const handleOpenProfile = () => {
    openModal("Профиль", <EditProfileForm onClose={closeModal} />, "xl", true, true);
  };

  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-30 flex-shrink-0">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-4">
          <button
            onClick={toggle}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <svg
              className="w-6 h-6 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <svg className="w-20 h-8" viewBox="0 0 80 32" fill="none">
            <rect width="80" height="32" rx="4" fill="#FFD02F" />
            <text
              x="10"
              y="22"
              fontFamily="Inter"
              fontWeight="700"
              fontSize="18"
              fill="#050038"
            >
              nova
            </text>
          </svg>
          {showPlanBadge && (
            <span className="px-2 py-1 bg-gray-100 text-xs font-medium text-gray-600 rounded">
              Free
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {showInviteButton && (
            <button
              onClick={handleInvite}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
              Пригласить участников
            </button>
          )}

          {/* <button className="p-2 hover:bg-gray-100 rounded-lg relative">
            <svg
              className="w-5 h-5 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button> */}

          {me ? (
            <button
              onClick={handleOpenProfile}
              className="hover:opacity-80 transition cursor-pointer"
            >
              <UserAvatar user={me} size="md" />
            </button>
          ) : (
            <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
          )}
        </div>
      </div>
    </header>
  );
}
