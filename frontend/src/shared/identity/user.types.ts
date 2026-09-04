export type TUserRole = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "USER";

export interface IUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  role: TUserRole;
  googleId?: string;
  githubId?: string;
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
}
