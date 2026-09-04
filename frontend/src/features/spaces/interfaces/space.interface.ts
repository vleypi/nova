export type TSpaceRole = "OWNER" | "MEMBER";

export type TGlobalRole = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "USER";

export interface ISpaceMemberUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

export interface ISpaceMemberPermissions {
  canCreateBoards: boolean;
  canEditBoards: boolean;
  canDraw: boolean;
  canDeleteBoards: boolean;
}

export interface ISpaceMember extends ISpaceMemberPermissions {
  id: string;
  userId: string;
  spaceId: string;
  role: TSpaceRole;
  joinedAt: string;
  user: ISpaceMemberUser | null;
}

export interface ISpace {
  id: string;
  name: string;
  ownerId: string;
  inviteCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface ISpaceDetail extends ISpace {
  userRole: TSpaceRole;
}

export interface ICreateSpaceDto {
  name: string;
}

export interface IUpdateSpaceDto {
  name: string;
}

export type TUpdateMemberPermissionsDto = ISpaceMemberPermissions;

export interface ISpaceActionResponse {
  message: string;
  success: boolean;
}

export interface IRegenerateInviteResponse {
  inviteCode: string;
}

export interface ITransferOwnershipDto {
  targetUserId: string;
}

export interface ITransferOwnershipResponse {
  spaceId: string;
  newOwnerId: string;
  previousOwnerId: string;
}

export interface ICreateSpaceFormProps {
  onSuccess: (space: ISpace) => void;
  onCancel: () => void;
}

export interface IEditSpaceFormProps {
  space: ISpace;
  onRemoved: () => void;
}

export interface ISpacesListProps {
  spaces: ISpace[];
}
