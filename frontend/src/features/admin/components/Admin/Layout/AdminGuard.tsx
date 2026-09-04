"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMe, type TUserRole } from "@/shared/identity";
import { DASHBOARD_ROOT } from "@/shared/config/routes.constant";

const ALLOWED_ROLES: TUserRole[] = ["SUPER_ADMIN", "ADMIN", "MANAGER"];

interface IAdminGuardProps {
  children: React.ReactNode;
}

// Guard для admin-маршрутов: пропускает только разрешённые роли, иначе redirect.
export function AdminGuard({ children }: IAdminGuardProps) {
  const router = useRouter();
  const { data: me, isLoading } = useMe();

  useEffect(() => {
    if (!isLoading && me && !ALLOWED_ROLES.includes(me.role)) {
      router.replace(DASHBOARD_ROOT);
    }
  }, [me, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-nova-blue rounded-full animate-spin" />
      </div>
    );
  }

  if (!me || !ALLOWED_ROLES.includes(me.role)) {
    return null;
  }

  return <>{children}</>;
}
