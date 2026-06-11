import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  type UserNotification,
} from '../services/notificationService';

interface NotificationBellProps {
  onNavigate: (page: string, tab?: string) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onNavigate }) => {
  const { user, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<UserNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [list, count] = await Promise.all([
        fetchNotifications(user.id, 8),
        fetchUnreadCount(user.id),
      ]);
      setItems(list);
      setUnread(count);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    void refresh();
    const timer = window.setInterval(() => void refresh(), 45_000);
    return () => window.clearInterval(timer);
  }, [user, isAuthenticated]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (!isAuthenticated) return null;

  const handleItemClick = async (item: UserNotification) => {
    if (!user) return;
    await markNotificationRead(user.id, item.id);
    setUnread((c) => Math.max(0, c - (item.is_read ? 0 : 1)));
    setItems((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)),
    );
    setOpen(false);
    const tab = item.link_payload?.tab;
    onNavigate('profile', tab);
  };

  const handleMarkAll = async () => {
    if (!user) return;
    await markAllNotificationsRead(user.id);
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void refresh();
        }}
        className="relative p-1.5 sm:p-2 hover:bg-white/10 rounded-full transition-all"
        aria-label="Уведомления"
      >
        <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-yellow-400 text-black text-[10px] font-black rounded-full">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[min(100vw-2rem,320px)] bg-[#122e41] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <span className="text-sm font-bold text-white">Уведомления</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => void handleMarkAll()}
                className="text-[10px] text-yellow-400 font-bold uppercase"
              >
                Прочитать все
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="p-4 text-gray-500 text-sm">Загрузка...</p>
            ) : items.length === 0 ? (
              <p className="p-4 text-gray-500 text-sm">Нет уведомлений</p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void handleItemClick(item)}
                  className={`w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors ${
                    !item.is_read ? 'bg-yellow-400/5' : ''
                  }`}
                >
                  <p className="text-sm font-bold text-white">{item.title}</p>
                  {item.body && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{item.body}</p>}
                  <p className="text-[10px] text-gray-600 mt-1">
                    {new Date(item.created_at).toLocaleString('ru-RU')}
                  </p>
                </button>
              ))
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onNavigate('profile', 'notifications');
            }}
            className="w-full py-2.5 text-xs font-bold text-yellow-400 hover:bg-white/5 uppercase tracking-wider"
          >
            Все уведомления
          </button>
        </div>
      )}
    </div>
  );
};
