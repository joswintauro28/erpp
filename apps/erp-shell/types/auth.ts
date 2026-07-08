export interface User {
  id: number;
  email: string;
  full_name: string | null;
  last_login: string | null;
  organization_id: number | null;
  organization_name: string | null;
  role: string | null;
  permissions: string[];
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}
