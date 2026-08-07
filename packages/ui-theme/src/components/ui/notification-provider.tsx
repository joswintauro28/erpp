"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { getAccessToken } from "@datavex/auth-middleware";

export interface LiveNotification {
  id: number;
  title: string;
  message: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "ERROR" | string;
  module_source: string;
  entity_ref?: string | null;
  read_status: boolean;
  created_at?: string | null;
}

interface NotificationHistoryResponse {
  total: number;
  unread: number;
  notifications: LiveNotification[];
}

interface NotificationContextValue {
  notifications: LiveNotification[];
  unreadCount: number;
  connected: boolean;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

function resolveEndpoints(props: { restBase?: string; wsUrl?: string }) {
  const restBase =
    props.restBase || process.env.NEXT_PUBLIC_ERP_API_URL || "http://localhost:8000";
  const wsUrl =
    props.wsUrl ||
    process.env.NEXT_PUBLIC_ERP_WS_URL ||
    `${restBase.replace(/^http/, "ws")}/ws/notifications`;
  return { restBase: restBase.replace(/\/$/, ""), wsUrl: wsUrl.replace(/\/$/, "") };
}

export function NotificationProvider({
  children,
  restBase,
  wsUrl,
  connect = true,
}: {
  children: ReactNode;
  restBase?: string;
  wsUrl?: string;
  connect?: boolean;
}) {
  const endpointsRef = useRef(resolveEndpoints({ restBase, wsUrl }));
  const [notifications, setNotifications] = useState<LiveNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const getRestBase = () => endpointsRef.current.restBase;

  const fetchHistory = useCallback(async () => {
    try {
      const token = getAccessToken();
      if (!token) return;
      const res = await fetch(`${getRestBase()}/notifications/history?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = (await res.json()) as NotificationHistoryResponse;
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread || 0);
    } catch {
      // backend unreachable — WS reconnect will handle live mode
    }
  }, []);

  const connectSocket = useCallback(() => {
    if (!mountedRef.current) return;
    const token = getAccessToken();
    if (!token) {
      reconnectAttempts.current += 1;
      return;
    }
    const url = `${endpointsRef.current.wsUrl}?token=${encodeURIComponent(token)}`;
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      scheduleReconnect();
      return;
    }
    socketRef.current = ws;

    ws.onopen = () => {
      reconnectAttempts.current = 0;
      setConnected(true);
    };
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data as string);
        if (data.event === "connected") return;
        if (data.event === "notification.created" && data.notification) {
          const n = data.notification as LiveNotification;
          setNotifications((prev) => {
            if (prev.some((p) => p.id === n.id)) return prev;
            return [n, ...prev].slice(0, 100);
          });
          setUnreadCount((c) => c + 1);
        }
      } catch {
        // ignore malformed frames
      }
    };
    ws.onclose = () => {
      setConnected(false);
      socketRef.current = null;
      scheduleReconnect();
    };
    ws.onerror = () => {
      ws.close();
    };
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current) return;
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    const attempts = reconnectAttempts.current;
    const delay = Math.min(1000 * 2 ** attempts, 30_000);
    reconnectTimer.current = setTimeout(() => {
      reconnectAttempts.current += 1;
      connectSocket();
    }, delay);
  }, [connectSocket]);

  useEffect(() => {
    mountedRef.current = true;
    if (!connect) return;
    fetchHistory();
    connectSocket();
    // Auth resolves asynchronously after mount; poll for the token so the
    // socket (and history) can start as soon as the user is authenticated.
    const tokenPoll = setInterval(() => {
      if (mountedRef.current && !socketRef.current && getAccessToken()) {
        connectSocket();
      }
    }, 2000);
    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      clearInterval(tokenPoll);
      socketRef.current?.close();
    };
  }, [connect, connectSocket, fetchHistory]);

  const refresh = useCallback(async () => {
    await fetchHistory();
  }, [fetchHistory]);

  const markRead = useCallback(
    async (id: number) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_status: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      try {
        const token = getAccessToken();
        if (!token) return;
        await fetch(`${getRestBase()}/notifications/${id}/read`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // optimistic update stands; next refresh reconciles
      }
    },
    []
  );

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read_status: true })));
    setUnreadCount(0);
    try {
      const token = getAccessToken();
      if (!token) return;
      await fetch(`${getRestBase()}/notifications/read-all`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // optimistic
    }
  }, []);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, connected, markRead, markAllRead, refresh }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return ctx;
}
