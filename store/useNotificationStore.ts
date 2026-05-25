import { create } from 'zustand';
import type { Notification } from '../types';

interface NotificationState {
  notifications: Notification[];
  add: (n: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
  remove: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  unreadCount: () => number;
}

const genId = () => `notif-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],

  add: (n) =>
    set((state) => ({
      notifications: [
        {
          ...n,
          id: genId(),
          read: false,
          createdAt: new Date().toISOString(),
        },
        ...state.notifications,
      ],
    })),

  remove: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((x) => x.id !== id),
    })),

  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((x) =>
        x.id === id ? { ...x, read: true } : x
      ),
    })),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((x) => ({ ...x, read: true })),
    })),

  clearAll: () => set({ notifications: [] }),

  unreadCount: () => get().notifications.filter((n) => !n.read).length,
}));
