export interface Notification {
  type: string;
  title: string;
  severity: "high" | "medium" | "info";
  count: number;
}

export interface NotificationResponse {
  notifications: Notification[];
  summary: Record<string, number>;
}
