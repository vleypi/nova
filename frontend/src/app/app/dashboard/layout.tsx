import { cookies } from "next/headers";
import { ModalProvider } from "@/shared/modal/ModalProvider";
import { COOKIE_KEYS } from "@/shared/config/cookies.constant";
import {
  Aside,
  AppBar,
  SidebarProvider,
  FiltersProvider,
  FILTER_VALUES,
  SORT_VALUES,
  VIEW_MODE_VALUES,
} from "@/features/boards";
import type { TFilter, TSortBy, TViewMode } from "@/features/boards";
import { OAuthLinkToastWatcher } from "@/features/profile";

// Layout дашборда
export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();

  const sidebarCookie = cookieStore.get(COOKIE_KEYS.SIDEBAR_OPEN)?.value;
  const defaultOpen = sidebarCookie !== "false";

  const rawFilter = cookieStore.get(COOKIE_KEYS.BOARD_FILTER)?.value as TFilter;
  const rawSort = cookieStore.get(COOKIE_KEYS.BOARD_SORT)?.value as TSortBy;
  const rawViewMode = cookieStore.get(COOKIE_KEYS.BOARD_VIEW_MODE)
    ?.value as TViewMode;

  const defaultFilter: TFilter = FILTER_VALUES.includes(rawFilter)
    ? rawFilter
    : "all";
  const defaultSortBy: TSortBy = SORT_VALUES.includes(rawSort)
    ? rawSort
    : "last_created";
  const defaultViewMode: TViewMode = VIEW_MODE_VALUES.includes(rawViewMode)
    ? rawViewMode
    : "list";

  return (
    <ModalProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <FiltersProvider
          defaultFilter={defaultFilter}
          defaultSortBy={defaultSortBy}
          defaultViewMode={defaultViewMode}
        >
          <div className="font-inter bg-white h-screen flex flex-col overflow-hidden">
            <AppBar />
            <div className="layout-container flex flex-1 overflow-hidden">
              <Aside />
              {children}
            </div>
            <OAuthLinkToastWatcher />
          </div>
        </FiltersProvider>
      </SidebarProvider>
    </ModalProvider>
  );
}
