import { create } from 'zustand'

interface Notification {
  id:             string
  titre:          string
  message:        string
  type_evenement: string
  demande_id:     string | null
  lu:             boolean
  created_at:     string
}

interface NotificationsState {
  notifications: Notification[]
  unreadCount:   number

  setNotifications: (notifs: Notification[]) => void
  addNotification:  (notif: Notification) => void
  markAsRead:       (ids: string[]) => void
  markAllAsRead:    () => void
  setUnreadCount:   (count: number) => void
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  unreadCount:   0,

  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.lu).length,
    }),

  addNotification: (notif) =>
    set((s) => ({
      notifications: [notif, ...s.notifications],
      unreadCount:   s.unreadCount + (notif.lu ? 0 : 1),
    })),

  markAsRead: (ids) =>
    set((s) => {
      const updated = s.notifications.map((n) =>
        ids.includes(n.id) ? { ...n, lu: true } : n
      )
      return {
        notifications: updated,
        unreadCount:   updated.filter((n) => !n.lu).length,
      }
    }),

  markAllAsRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, lu: true })),
      unreadCount:   0,
    })),

  setUnreadCount: (count) => set({ unreadCount: count }),
}))
