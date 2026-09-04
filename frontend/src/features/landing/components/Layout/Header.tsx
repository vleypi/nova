import Link from "next/link";
import { AUTH_ROUTE } from "@/shared/config/proxy.constant";
import { HEADER_LINKS } from "@/features/boards/constants/layout.constant";
export function Header() {
  const headerNavLinks = HEADER_LINKS.map((link) => (
    <Link
      key={link.label}
      href={link.href}
      className="text-nova-dark hover:text-nova-blue font-medium"
    >
      {link.label}
    </Link>
  ));
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-8">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-linear-to-r from-nova-blue to-nova-purple flex items-center justify-center">
              <span className="text-white font-bold text-lg">N</span>
            </div>
            <span className="text-xl font-bold text-nova-dark">Nova</span>
          </Link>

          <nav className="hidden lg:flex space-x-6">{headerNavLinks}</nav>
        </div>

        <div className="flex items-center space-x-4">
          <Link
            href={AUTH_ROUTE}
            className="hidden md:inline text-nova-dark hover:text-nova-blue font-medium"
          >
            Войти
          </Link>
          <Link
            href={AUTH_ROUTE}
            className="bg-nova-blue text-white px-5 py-2 rounded-full font-medium hover:bg-blue-600 transition-colors"
          >
            Начать бесплатно
          </Link>
          <button
            type="button"
            className="lg:hidden text-gray-600"
            aria-label="Toggle navigation menu"
          >
            <i className="fas fa-bars text-xl"></i>
          </button>
        </div>
      </div>
    </header>
  );
}
