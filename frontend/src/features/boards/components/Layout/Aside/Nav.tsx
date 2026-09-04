"use client";
import { NavBar } from "@/shared/ui/NavBar/NavBar";
import { SIDEBAR_NAV_ITEMS } from "../../../constants/dashboard.constant";

// Боковая навигация дашборда.
export function Nav() {
  return <NavBar items={SIDEBAR_NAV_ITEMS} className="mb-6" />;
}
