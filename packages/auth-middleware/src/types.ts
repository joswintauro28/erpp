export interface UserOrganization {
  id: number;
  name: string;
  role: string | null;
  status: string;
  parent_id: number | null;
  parent_name: string | null;
}

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  last_login: string | null;
  organization_id: number | null;
  organization_name: string | null;
  role: string | null;
  permissions: string[];
  active_organization_id?: number | null;
  organizations?: UserOrganization[];
}

export interface ApiError {
  status: number;
  detail: string;
}

export class ApiClientError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiClientError";
    this.status = status;
    this.detail = detail;
  }
}
