import { ApiClientError } from "@datavex/auth-middleware";
import type { User, ApiError } from "@datavex/auth-middleware";

export type { User, ApiError };
export { ApiClientError };

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  refreshUser: () => Promise<User | null>;
  logout: () => Promise<void>;
}
