export interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
  status: "active" | "invited" | "disabled";
  last_active: string;
  permissions: string[];
}

export interface WorkflowRule {
  id: number;
  name: string;
  trigger: string;
  condition: string;
  action: string;
  is_active: boolean;
  last_run: string;
}
