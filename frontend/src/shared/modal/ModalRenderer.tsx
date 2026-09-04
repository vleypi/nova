import type { ReactNode } from "react";
import { Modal } from "./Modal/Modal";
import { TModalSize } from "./modal.types";

interface IModalRendererProps {
  mounted: boolean;
  visible: boolean;
  title: string;
  content: ReactNode;
  size: TModalSize;
  noPadding: boolean;
  scrollInner: boolean;
  onClose: () => void;
}

// Условный рендер модалки: ничего, пока не mounted; иначе делегирует Modal.
export function ModalRenderer({
  mounted,
  visible,
  title,
  content,
  size,
  noPadding,
  scrollInner,
  onClose,
}: IModalRendererProps) {
  if (!mounted) return null;
  return (
    <Modal
      title={title}
      visible={visible}
      onClose={onClose}
      size={size}
      noPadding={noPadding}
      scrollInner={scrollInner}
    >
      {content}
    </Modal>
  );
}
