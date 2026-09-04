import { IUser, TUserRole } from "@/shared/identity";

export interface IAdminTimeseries {
  usersMonthly: number[];
  boardsMonthly: number[];
  spacesMonthly: number[];
  activityDaily: number[];
  activityTotal: number;
}

export interface IAdminOverview {
  users: {
    total: number;
    today: number;
    blocked: number;
  };
  boards: {
    total: number;
    today: number;
  };
  spaces: {
    total: number;
    today: number;
  };
  online: {
    users: number;
    boards: number;
  };
}

export interface IAdminUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: TUserRole;
  status?: "active" | "blocked";
}

export interface IAdminUserList {
  users: IUser[];
  total: number;
  page: number;
  totalPages: number;
}

export interface IAdminUserActivity {
  user: IUser;
  stats: {
    boardsCreated: number;
    spacesCount: number;
    memberSince: string;
  };
}

export interface IAdminBoard {
  id: string;
  name: string;
  spaceId: string;
  isPrivate: boolean;
  thumbnail: string;
  isFavorite: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  createdByUser?: {
    id: string;
    name: string;
    avatar: string;
  } | null;
}

export interface IAdminBoardList {
  boards: IAdminBoard[];
  total: number;
  page: number;
  totalPages: number;
}

export interface IAdminBoardsParams {
  page?: number;
  limit?: number;
  search?: string;
  createdBy?: string;
  privacy?: "public" | "private";
  spaceId?: string;
}

export interface IAdminSpace {
  id: string;
  name: string;
  ownerId: string;
  inviteCode: string;
  membersCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface IAdminSpaceList {
  spaces: IAdminSpace[];
  total: number;
  page: number;
  totalPages: number;
}

export interface IAdminSpacesParams {
  page?: number;
  limit?: number;
  search?: string;
  memberId?: string;
}

export interface IAuditLog {
  id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  targetId: string;
  targetType: string;
  details: string;
  createdAt: string;
}

export interface IAuditLogList {
  logs: IAuditLog[];
  total: number;
  page: number;
  totalPages: number;
}

export interface IAuditParams {
  page?: number;
  limit?: number;
  action?: string;
  actorId?: string;
  targetId?: string;
}

export interface IServiceHealth {
  name: string;
  status: "ok" | "error";
}

export interface ISystemHealth {
  healthy: boolean;
  services: IServiceHealth[];
}

export interface IOnlineBoard {
  boardId: string;
  boardName: string;
  users: {
    id: string;
    name: string;
    avatar?: string;
  }[];
}
