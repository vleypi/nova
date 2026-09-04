"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface INavItem {
  id: string;
  label: string;
  href: string;
  iconPath: string;
  exact?: boolean;
}

interface INavBarProps {
  items: INavItem[];
  className?: string;
}

// Вертикальный navbar с подсветкой активного маршрута и SVG-иконкой.
export function NavBar({ items, className = "" }: INavBarProps) {
  const pathname = usePathname();

  return (
    <nav className={`space-y-1 ${className}`}>
      {items.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.id}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm ${
              isActive
                ? "bg-blue-50 text-nova-blue"
                : "text-gray-700 hover:bg-gray-100 transition"
            }`}
          >
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d={item.iconPath}
              />
            </svg>
            <span className="truncate min-w-0">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
