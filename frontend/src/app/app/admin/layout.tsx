import { cookies } from "next/headers";
import { ModalProvider } from "@/shared/modal/ModalProvider";
import { COOKIE_KEYS } from "@/shared/config/cookies.constant";
import { AppBar, SidebarProvider } from "@/features/boards";
import { AdminAside, AdminGuard } from "@/features/admin";

// Layout админк
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sidebarCookie = cookieStore.get(COOKIE_KEYS.SIDEBAR_OPEN)?.value;
  const defaultOpen = sidebarCookie !== "false";

  return (
    <ModalProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <div className="font-inter bg-white h-screen flex flex-col overflow-hidden">
          <AppBar showPlanBadge={false} showInviteButton={false} />
          <div className="layout-container flex flex-1 overflow-hidden">
            <AdminGuard>
              <AdminAside />
              {children}
            </AdminGuard>
          </div>
        </div>
      </SidebarProvider>
    </ModalProvider>
  );
}
