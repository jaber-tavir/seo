/** Shared application types */

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResult<T> = ApiSuccess<T> | ApiError;

export type { PaginatedResult } from "@/repositories/base";

/** Serialized user returned to the client (never includes password hash) */
export interface SessionUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  avatar: string | null;
  role: string;
  email_verified: boolean;
  status: string;
  created_at: string;
}

/** Google OIDC userinfo response */
export interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}
