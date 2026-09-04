"use client";
import { useContext } from "react";
import { ModalContext } from "../ModalProvider";

// Хук-getter контекста модалки. Бросает, если вне ModalProvider.
export function useModal() {
  const context = useContext(ModalContext);
  if (!context) throw new Error("useModal must be used within ModalProvider");
  return context;
}
