"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import {
  COOKIE_KEYS,
  COOKIE_MAX_AGE_YEAR_SECONDS,
} from "@/shared/config/cookies.constant";

const MOBILE_BREAKPOINT = 768;

interface ISidebarContext {
  isOpen: boolean;
  isMobile: boolean;
  isReady: boolean;
  toggle: () => void;
}

interface ISidebarProviderProps {
  children: ReactNode;
  defaultOpen?: boolean;
}

const SidebarContext = createContext<ISidebarContext | null>(null);

// Записать persistent cookie с year-сроком.
function setCookie(value: boolean) {
  document.cookie = `${COOKIE_KEYS.SIDEBAR_OPEN}=${value};path=/;max-age=${COOKIE_MAX_AGE_YEAR_SECONDS}`;
}

// Провайдер sidebar-state с разделением desktop/mobile и cookie-persist.
export function SidebarProvider({
  children,
  defaultOpen = true,
}: ISidebarProviderProps) {
  const [desktopOpen, setDesktopOpen] = useState(defaultOpen);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const wasMobileRef = useRef(false);

  useEffect(() => {
    const initialMobile = window.innerWidth < MOBILE_BREAKPOINT;
    wasMobileRef.current = initialMobile;
    setIsMobile(initialMobile);
    requestAnimationFrame(() => setIsReady(true));

    const handleResize = () => {
      const nowMobile = window.innerWidth < MOBILE_BREAKPOINT;
      if (nowMobile !== wasMobileRef.current) {
        setIsReady(false);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setIsReady(true));
        });
      }
      if (nowMobile && !wasMobileRef.current) {
        setMobileOpen(false);
      }
      wasMobileRef.current = nowMobile;
      setIsMobile(nowMobile);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isOpen = isMobile ? mobileOpen : desktopOpen;

  const toggle = () => {
    if (isMobile) {
      setMobileOpen((prev) => !prev);
    } else {
      setDesktopOpen((prev) => {
        const next = !prev;
        setCookie(next);
        return next;
      });
    }
  };

  return (
    <SidebarContext.Provider value={{ isOpen, isMobile, isReady, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
}

// Хук-getter контекста sidebar. Бросает, если вне SidebarProvider.
export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}
