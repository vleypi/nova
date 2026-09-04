"use client";
import { SidebarShell } from "@/shared/ui/SidebarShell/SidebarShell";
import { Spaces } from "@/features/spaces";
import { Nav } from "./Nav";

// Левый сайдбар дашборда: nav-меню плюс список пространств.
export function Aside() {
  return (
    <SidebarShell>
      <Nav />
      <Spaces />
    </SidebarShell>
  );
}
