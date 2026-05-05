import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  Check,
  Trash2,
  Clock,
  MessageSquare,
  Briefcase,
  CreditCard,
  Info,
  Calendar,
  CheckCircle2,
  FileText,
  UserCheck,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/api';
import { handleApiError, OperationType } from '../lib/errors';
import { fetchNotifications, isOrderLifecycleType, type AppNotification } from '../services/notifications';

export default function Notifications() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'alerts';
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    const tick = async () => {
      try {
        const list = await fetchNotifications();
        if (cancelled) return;
        setNotifications(list);
      } catch (e) {
        await handleApiError(e, OperationType.LIST, 'notifications');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    tick();
    const id = setInterval(tick, 8000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [user?.id]);

  const markAsRead = async (nid: string) => {
    try {
      await api.put(`/api/notifications/${nid}/read`, {});
      setNotifications((prev) => prev.map((n) => (n.id === nid ? { ...n, read: true } : n)));
    } catch (error) {
      await handleApiError(error, OperationType.UPDATE, 'notifications');
    }
  };

  const deleteNotification = async (nid: string) => {
    try {
      await api.delete(`/api/notifications/${nid}`);
      setNotifications((prev) => prev.filter((n) => n.id !== nid));
    } catch (error) {
      await handleApiError(error, OperationType.DELETE, 'notifications');
    }
  };

  const navigate = useNavigate();

  const openNotification = async (n: AppNotification) => {
    if (!n.read) {
      try {
        await api.put(`/api/notifications/${n.id}/read`, {});
        setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      } catch (error) {
        await handleApiError(error, OperationType.UPDATE, 'notifications');
      }
    }
    const href = n.link?.trim();
    if (href) navigate(href);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'order_matched':
        return UserCheck;
      case 'order_completed':
        return CheckCircle2;
      case 'contract_approved':
        return FileText;
      case 'request':
        return Briefcase;
      case 'ticket':
        return MessageSquare;
      case 'payment':
        return CreditCard;
      default:
        return Info;
    }
  };

  const getColor = (type: string) => {
    if (isOrderLifecycleType(type)) {
      if (type === 'order_matched') return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-200';
      if (type === 'order_completed') return 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-200';
      return 'text-sky-600 bg-sky-50 dark:bg-sky-950/40 dark:text-sky-100';
    }
    switch (type) {
      case 'request':
        return 'text-blue-500 bg-blue-50';
      case 'ticket':
        return 'text-purple-500 bg-purple-50';
      case 'payment':
        return 'text-emerald-500 bg-emerald-50';
      default:
        return 'text-neutral-500 bg-neutral-50';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-800 rounded-full animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-neutral-400">Loading Events...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20">
      <header className="flex items-center justify-between px-2">
        <div className="space-y-1">
          <h1 className="text-4xl font-black italic uppercase tracking-tighter">Events Hub</h1>
          <p className="text-neutral-500 text-sm font-medium">Manage your alerts, tickets, and schedule.</p>
        </div>
      </header>

      <div className="flex gap-2 p-1 bg-neutral-100 rounded-2xl">
        {[
          { id: 'alerts', label: 'Alerts', icon: Bell },
          { id: 'tickets', label: 'Tickets', icon: MessageSquare },
          { id: 'schedule', label: 'Schedule', icon: Calendar },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              if (tab.id === 'tickets') navigate('/tickets');
              else if (tab.id === 'schedule') navigate('/dashboard?tab=schedule');
              else navigate('/notifications?tab=alerts');
            }}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
              activeTab === tab.id ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400 hover:text-neutral-600',
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'alerts' &&
        (notifications.length === 0 ? (
          <div className="text-center py-32 bg-white border border-neutral-100 rounded-[3rem] space-y-6">
            <div className="w-20 h-20 bg-neutral-50 rounded-full flex items-center justify-center mx-auto">
              <Bell className="w-10 h-10 text-neutral-200" />
            </div>
            <p className="text-neutral-400 font-bold uppercase tracking-widest text-xs">All caught up!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {notifications.map((n) => {
                const Icon = getIcon(n.type);
                return (
                  <motion.div
                    key={n.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={cn(
                      'group relative bg-white p-6 rounded-[2rem] border transition-all flex items-start gap-4',
                      n.read ? 'border-neutral-100 opacity-60' : 'border-neutral-200 shadow-sm',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => void openNotification(n)}
                      className={cn(
                        'flex flex-1 items-start gap-4 text-left min-w-0 rounded-[1.5rem] outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2',
                        n.link ? 'cursor-pointer' : 'cursor-default',
                      )}
                      aria-label={n.link ? `${n.title}. Open linked order.` : n.title}
                    >
                      <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shrink-0', getColor(n.type))}>
                        <Icon className="w-6 h-6" />
                      </div>

                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-black text-sm uppercase tracking-tight">{n.title}</h4>
                          <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest flex items-center gap-1 shrink-0">
                            <Clock className="w-3 h-3" />
                            {new Date(n.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-neutral-600 leading-relaxed">{n.message}</p>
                        {n.link ? (
                          <p className="pt-1 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                            Open order →
                          </p>
                        ) : null}
                      </div>
                    </button>

                    <div className="flex shrink-0 flex-col items-end gap-2 pt-1">
                      {!n.read && <div className="h-2 w-2 rounded-full bg-red-500" aria-hidden />}
                      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        {!n.read && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void markAsRead(n.id);
                            }}
                            className="flex items-center gap-2 rounded-xl bg-neutral-900 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:scale-105"
                          >
                            <Check className="w-3 h-3" />
                            Mark Read
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void deleteNotification(n.id);
                          }}
                          className="p-2 text-neutral-400 transition-colors hover:text-red-500"
                          aria-label="Delete notification"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ))}
    </div>
  );
}
