"use client";
import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import { TModalSize } from "../modal.types";
import { useEscapeKey } from "./useEscapeKey";

const VISIBLE_DELAY_MS = 10;
const UNMOUNT_DELAY_MS = 200;

export interface IModalState {
  mounted: boolean;
  visible: boolean;
  title: string;
  content: ReactNode;
  size: TModalSize;
  noPadding: boolean;
  scrollInner: boolean;
  openModal: (
    title: string,
    content: ReactNode,
    size?: TModalSize,
    noPadding?: boolean,
    scrollInner?: boolean,
  ) => void;
  closeModal: () => void;
}

// State модалки
export function useModalState(): IModalState {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<ReactNode>(null);
  const [size, setSize] = useState<TModalSize>("md");
  const [noPadding, setNoPadding] = useState(false);
  const [scrollInner, setScrollInner] = useState(false);

  const openModal = useCallback(
    (
      newTitle: string,
      newContent: ReactNode,
      newSize: TModalSize = "md",
      newNoPadding = false,
      newScrollInner = false,
    ) => {
      setTitle(newTitle);
      setContent(newContent);
      setSize(newSize);
      setNoPadding(newNoPadding);
      setScrollInner(newScrollInner);
      setMounted(true);
      setTimeout(() => setVisible(true), VISIBLE_DELAY_MS);
    },
    [],
  );

  const closeModal = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      setMounted(false);
      setContent(null);
    }, UNMOUNT_DELAY_MS);
  }, []);

  useEscapeKey(closeModal, visible);

  return {
    mounted,
    visible,
    title,
    content,
    size,
    noPadding,
    scrollInner,
    openModal,
    closeModal,
  };
}
