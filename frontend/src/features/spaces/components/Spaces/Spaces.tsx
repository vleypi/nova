"use client";
import { useRouter } from "next/navigation";
import { useModal } from "@/shared/modal/hooks/useModal";
import { getSpaceUrl } from "@/shared/config/routes.constant";
import { useSpaces } from "../../hooks/useSpaces";
import { CreateSpaceForm } from "./CreateSpaceForm";
import { SpacesHeader } from "./SpacesHeader";
import { SpacesSkeleton } from "./SpacesSkeleton";
import { SpacesList } from "./SpacesList";
import { SpacesEmptyState } from "./SpacesEmptyState";

// Корневой блок списка пространств в сайдбаре дашборда.
export function Spaces() {
  const router = useRouter();
  const { data: spaces, isLoading } = useSpaces();
  const { openModal, closeModal } = useModal();

  const handleOpenCreateModal = () => {
    openModal(
      "Новое пространство",
      <CreateSpaceForm
        onSuccess={(space) => {
          closeModal();
          router.push(getSpaceUrl(space.id));
        }}
        onCancel={closeModal}
      />,
    );
  };

  return (
    <div className="spaces-section">
      <SpacesHeader onOpen={handleOpenCreateModal} />

      {isLoading ? (
        <SpacesSkeleton />
      ) : spaces?.length ? (
        <SpacesList spaces={spaces} />
      ) : (
        <SpacesEmptyState />
      )}
    </div>
  );
}
