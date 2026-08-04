import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Bell, Check, Package, Heart, Info } from 'lucide-react';
import type { Notification } from '@/lib/types';
import { timeAgo } from '@/lib/utils';

const iconForType: Record<string, typeof Bell> = {
  order: Package,
  price_alert: Info,
  wishlist: Heart,
  system: Bell,
};

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    const notifs = data as Notification[] ?? [];
    setNotifications(notifs);
    setUnreadCount(notifs.filter((n) => !n.is_read).length);
  }, [user]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function markAllRead() {
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    load();
  }

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-xl p-2.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-primary-600"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 px-1 text-xs font-bold text-white animate-bounce-in">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-100 bg-white shadow-lg animate-slide-up z-50">
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <h3 className="text-sm font-bold text-slate-800">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary-600 hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No notifications yet</p>
            ) : (
              notifications.map((notif) => {
                const Icon = iconForType[notif.type] ?? Bell;
                return (
                  <Link
                    key={notif.id}
                    to={notif.link ?? '#'}
                    onClick={() => setOpen(false)}
                    className={`flex gap-3 border-b border-slate-50 p-4 transition-colors hover:bg-slate-50 ${!notif.is_read ? 'bg-primary-50/50' : ''}`}
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${notif.type === 'order' ? 'bg-primary-100 text-primary-600' : notif.type === 'price_alert' ? 'bg-secondary-100 text-secondary-600' : 'bg-slate-100 text-slate-500'}`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700">{notif.title}</p>
                      {notif.body && <p className="line-clamp-2 text-xs text-slate-500">{notif.body}</p>}
                      <p className="mt-0.5 text-xs text-slate-400">{timeAgo(notif.created_at)}</p>
                    </div>
                    {!notif.is_read && <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent-500" />}
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
