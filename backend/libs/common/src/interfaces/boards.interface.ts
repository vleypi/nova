import { Observable } from 'rxjs';


export interface BoardPayload {
  id: string;
  name: string;
  createdBy: string;
  spaceId: string;
  isPrivate: boolean;
  thumbnail: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BoardListPayload {
  boards: BoardPayload[];
}

export interface CanvasElementPayload {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  opacity: number;
  data: string;
  isLocked: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExportBoardPayload {
  id: string;
  name: string;
  createdBy: string;
  spaceId: string;
  isPrivate: boolean;
  thumbnail: string;
  createdAt: string;
  updatedAt: string;
  elements: CanvasElementPayload[];
}

export interface FavoritePayload {
  isFavorite: boolean;
  boardId: string;
}

export interface JoinByInvitePayload {
  space: SpacePayload;
  alreadyMember: boolean;
}

export interface SpacePayload {
  id: string;
  name: string;
  ownerId: string;
  inviteCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface SpaceDetailPayload {
  id: string;
  name: string;
  ownerId: string;
  inviteCode: string;
  userRole: string;
  createdAt: string;
  updatedAt: string;
}

export interface SpaceListPayload {
  spaces: SpacePayload[];
}

export interface MemberPayload {
  id: string;
  userId: string;
  spaceId: string;
  role: string;
  canCreateBoards: boolean;
  canEditBoards: boolean;
  canDraw: boolean;
  canDeleteBoards: boolean;
  joinedAt: string;
}

export interface MemberListPayload {
  members: MemberPayload[];
}

export interface InviteCodePayload {
  inviteCode: string;
}

export interface SuccessPayload {
  success: boolean;
  message: string;
}

export interface TransferOwnershipPayload {
  spaceId:         string;
  newOwnerId:      string;
  previousOwnerId: string;
}

export interface AdminBoardListPayload {
  boards:     BoardPayload[];
  total:      number;
  page:       number;
  totalPages: number;
}

export interface AdminSpacePayload {
  id:           string;
  name:         string;
  ownerId:      string;
  inviteCode:   string;
  membersCount: number;
  createdAt:    string;
  updatedAt:    string;
}

export interface AdminSpaceListPayload {
  spaces:     AdminSpacePayload[];
  total:      number;
  page:       number;
  totalPages: number;
}

export interface BoardStatsPayload {
  totalBoards: number;
  todayBoards: number;
  totalSpaces: number;
  todaySpaces: number;
}

export interface BoardsTimeseriesPayload {
  boardsMonthly: number[];
  spacesMonthly: number[];
}


export interface IBoardsService {
  getBoards(data: { userId: string; spaceId?: string }): Observable<BoardListPayload>;
  getFavorites(data: { userId: string }): Observable<BoardListPayload>;
  getBoard(data: { id: string; userId: string }): Observable<BoardPayload>;
  createBoard(data: { name: string; createdBy: string; spaceId: string }): Observable<BoardPayload>;
  updateBoard(data: { id: string; userId: string; name?: string; isPrivate?: boolean; thumbnail?: string }): Observable<BoardPayload>;
  deleteBoard(data: { id: string; userId: string }): Observable<SuccessPayload>;
  duplicateBoard(data: { id: string; userId: string }): Observable<BoardPayload>;
  toggleFavorite(data: { userId: string; boardId: string }): Observable<FavoritePayload>;
  exportBoard(data: { id: string; userId: string }): Observable<ExportBoardPayload>;
  moveBoard(data: { id: string; userId: string; targetSpaceId: string }): Observable<BoardPayload>;

  getSpaces(data: { userId: string }): Observable<SpaceListPayload>;
  getSpace(data: { id: string; userId: string }): Observable<SpaceDetailPayload>;
  createSpace(data: { name: string; ownerId: string }): Observable<SpacePayload>;
  updateSpace(data: { id: string; userId: string; name: string }): Observable<SpacePayload>;
  deleteSpace(data: { id: string; userId: string }): Observable<SuccessPayload>;

  getSpaceMembers(data: { spaceId: string; userId: string }): Observable<MemberListPayload>;
  joinByInvite(data: { inviteCode: string; userId: string }): Observable<JoinByInvitePayload>;
  removeMember(data: { spaceId: string; userId: string; targetUserId: string }): Observable<SuccessPayload>;
  leaveSpace(data: { spaceId: string; userId: string }): Observable<SuccessPayload>;
  updateMemberPermissions(data: {
    spaceId: string;
    userId: string;
    targetUserId: string;
    canCreateBoards: boolean;
    canEditBoards: boolean;
    canDraw: boolean;
    canDeleteBoards: boolean;
  }): Observable<MemberPayload>;
  regenerateInviteCode(data: { spaceId: string; userId: string }): Observable<InviteCodePayload>;
  transferOwnership(data: { spaceId: string; userId: string; targetUserId: string }): Observable<TransferOwnershipPayload>;

  adminGetBoards(data: { page: number; limit: number; search?: string; createdBy?: string; privacy?: 'public' | 'private' | ''; spaceId?: string }): Observable<AdminBoardListPayload>;
  adminDeleteSpace(data: { id: string }): Observable<SuccessPayload>;
  adminGetSpaces(data: { page: number; limit: number; search?: string; memberId?: string }): Observable<AdminSpaceListPayload>;
  adminGetSpaceMembers(data: { spaceId: string }): Observable<MemberListPayload>;
  getBoardsTimeseries(data: { months: number }): Observable<BoardsTimeseriesPayload>;
  getBoardStats(data: Record<string, never>): Observable<BoardStatsPayload>;
  adminDeleteBoard(data: { id: string }): Observable<SuccessPayload>;
  getUserBoardStats(data: { userId: string }): Observable<{ boardsCreated: number; spacesCount: number }>;
}
