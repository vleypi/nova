import { Observable } from 'rxjs';
import { Role } from '../enums/role.enum';

export interface UserPayload {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  role: Role;
  googleId?: string;
  githubId?: string;
  createdAt: string;
  updatedAt: string;
  isBlocked: boolean;
}

export interface IUsersService {
  findById(data: { id: string }): Observable<UserPayload>;
  findByEmail(data: { email: string }): Observable<UserPayload>;
  findByProviderId(data: { provider: string; providerId: string }): Observable<UserPayload>;
  findAll(data: {
    page?:   number;
    limit?:  number;
    search?: string;
    role?:   string;
    status?: 'active' | 'blocked' | '';
  }): Observable<UserListPayload>;
  create(data: { email: string }): Observable<UserPayload>;
  updateProfile(data: { id: string; name?: string; avatar?: string }): Observable<UserPayload>;
  updateRole(data: { id: string; role: Role }): Observable<UserPayload>;
  findManyByIds(data: { ids: string[] }): Observable<{ users: UserPayload[] }>;
  blockUser(data: { id: string; isBlocked: boolean }): Observable<UserPayload>;
  deleteUser(data: { id: string }): Observable<{ success: boolean }>;
  linkProvider(data: { id: string; provider: string; providerId: string }): Observable<UserPayload>;
  unlinkProvider(data: { id: string; provider: string }): Observable<UserPayload>;
  getStats(data: Record<string, never>): Observable<{ totalUsers: number; todayUsers: number; blockedUsers: number }>;
  createAuditLog(data: {
    actorId: string; actorEmail: string; action: string;
    targetId?: string; targetType?: string; details?: string;
  }): Observable<AuditLogPayload>;
  getAuditLogs(data: {
    page: number; limit: number; action?: string; actorId?: string; targetId?: string;
  }): Observable<AuditLogListPayload>;
  getUsersTimeseries(data: { months: number; days: number }): Observable<UsersTimeseriesPayload>;
}

export interface UsersTimeseriesPayload {
  usersMonthly:  number[];
  activityDaily: number[];
  activityTotal: number;
}

export interface UserListPayload {
  users:      UserPayload[];
  total:      number;
  page:       number;
  totalPages: number;
}

export interface AuditLogPayload {
  id:         string;
  actorId:    string;
  actorEmail: string;
  action:     string;
  targetId:   string;
  targetType: string;
  details:    string;
  createdAt:  string;
}

export interface AuditLogListPayload {
  logs:       AuditLogPayload[];
  total:      number;
  page:       number;
  totalPages: number;
}
