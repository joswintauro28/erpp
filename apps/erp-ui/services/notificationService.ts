import api from './api';

const STORAGE_KEY = 'vexbill_read_notifications';

const getReadIds = (): any[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const setReadIds = (ids: any[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch (e) {
    console.error("Failed to save notification state", e);
  }
};

export const notificationService = {
  getAlerts: async (): Promise<any> => {
    const res = await api.get('/notifications/');
    const data = res.data;
    
    // Mix in the read/unread state
    const readIds = getReadIds();
    const notifications = (data.notifications || []).map((n: Record<string, unknown>) => ({
      ...n,
      isRead: readIds.includes(n.id)
    }));
    
    return {
      summary: data.summary,
      notifications
    };
  },
  
  markAsRead: (id: any): void => {
    const readIds = getReadIds();
    if (!readIds.includes(id)) {
      readIds.push(id);
      setReadIds(readIds);
    }
  },
  
  markAllAsRead: (notifications: any[]): void => {
    const readIds = getReadIds();
    let changed = false;
    notifications.forEach((n: any) => {
      if (!readIds.includes(n.id)) {
        readIds.push(n.id);
        changed = true;
      }
    });
    if (changed) setReadIds(readIds);
  },
  
  clearReadState: (): void => {
    localStorage.removeItem(STORAGE_KEY);
  }
};

export default notificationService;
