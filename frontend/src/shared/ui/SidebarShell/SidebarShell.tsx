"use client";
import type { ReactNode } from "react";
import { useSidebar } from "./SidebarProvider";

interface ISidebarShellProps {
  children: ReactNode;
}

// Обёртка sidebar с responsive desktop/mobile поведением и backdrop-overlay.
export function SidebarShell({ children }: ISidebarShellProps) {
  const { isOpen, isMobile, isReady, toggle } = useSidebar();

  const sidebarClass = isMobile
    ? `sidebar-mobile ${isOpen ? "open" : ""} ${isReady ? "ready" : ""}`
    : `sidebar-desktop ${isOpen ? "" : "collapsed"} ${isReady ? "ready" : ""}`;

  return (
    <>
      {isMobile && isOpen && (
        <div className="sidebar-backdrop" onClick={toggle} />
      )}
      <aside className={sidebarClass}>
        {isMobile && (
          <div className="sidebar-mobile-header">
            <button onClick={toggle} aria-label="Закрыть меню">
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}
        <div className="h-full overflow-y-auto p-4 flex flex-col">
          {children}
        </div>
      </aside>
    </>
  );
}
