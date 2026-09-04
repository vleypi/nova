"use client";
import { createContext } from "react";
import { IModalContextType, IModalProviderProps } from "./modal.types";
import { useModalState } from "./hooks/useModalState";
import { ModalRenderer } from "./ModalRenderer";

export const ModalContext = createContext<IModalContextType | null>(null);

// Глобальный provider модалки: один instance на app, шарится через context.
export function ModalProvider({ children }: IModalProviderProps) {
  const {
    mounted,
    visible,
    title,
    content,
    size,
    noPadding,
    scrollInner,
    openModal,
    closeModal,
  } = useModalState();

  return (
    <ModalContext.Provider value={{ openModal, closeModal }}>
      {children}
      <ModalRenderer
        mounted={mounted}
        visible={visible}
        title={title}
        content={content}
        size={size}
        noPadding={noPadding}
        scrollInner={scrollInner}
        onClose={closeModal}
      />
    </ModalContext.Provider>
  );
}
