"use client";
import { NavBar } from "@/shared/ui/NavBar/NavBar";
import { ADMIN_NAV_ITEMS } from "../../../constants/admin.constant";

// Боковая навигация админки
export function AdminNav() {
  return <NavBar items={ADMIN_NAV_ITEMS} />;
}
