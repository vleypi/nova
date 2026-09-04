import type { ReactNode } from "react";

export type TModalSize = "md" | "lg" | "xl";

export interface IModalProps {
  title: string;
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: TModalSize;
  noPadding?: boolean;
  scrollInner?: boolean;
}

export interface IModalContextType {
  openModal: (
    title: string,
    content: ReactNode,
    size?: TModalSize,
    noPadding?: boolean,
    scrollInner?: boolean,
  ) => void;
  closeModal: () => void;
}

export interface IModalProviderProps {
  children: ReactNode;
}
