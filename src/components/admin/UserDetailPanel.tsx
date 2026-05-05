import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Mail,
  Phone,
  MapPin,
  Activity,
  FileText,
  ShieldCheck,
  ScrollText,
  ShoppingCart,
  History,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../lib/api';
import { fetchAdminUserFull, type AdminUserFullPayload } from '../../services/adminUsers';
import { cn } from '../../lib/utils.js';
import type { AdminUserRow } from '../../../lib/adminUsersTypes';

type Tab = 'overview' | 'workspaces' | 'orders' | 'activity' | 'kyc' | 'audit';

const tabs: { id: Tab; label: string; icon: typeof Activity }[] = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'workspaces', label: 'Workspaces', icon: FileText },
  { id: 'orders', label: 'Orders', icon: ShoppingCart },
  { id: 'activity', label: 'Activity', icon: History },
  { id: 'kyc', label: 'KYC', icon: ShieldCheck },
  { id: 'audit', label: 'Audit Log', icon: ScrollText },
];

type Props = {
  userId: string | null;
  onClose: () => void;
  showSuccess: (message: string) => void;
  showError?: (message: string) => void;
  onConfirm: (opts: { title: string; message: string; type: 'danger' | 'warning' | 'info'; onConfirm: () => void | Promise<void> }) => void;
  onEdit: (u: AdminUserRow) => void;
  onKycReview?: (kycId: string) => void;
  onRefreshList: () => void;
  canDelete: boolean;
  onViewUserOrders?: (userId: string) => void;
};

function rtlSlideX(): { initial: { x: string }; animate: { x: string }; exit: { x: string } } {
  if (typeof document === 'undefined') {
    return { initial: { x: '100%' }, animate: { x: '0%' }, exit: { x: '100%' } };
  }
  const rtl =
    document.documentElement.dir === 'rtl' || getComputedStyle(document.body).direction === 'rtl';
  const from = rtl ? '-100%' : '100%';
  return { initial: { x: from }, animate: { x: '0%' }, exit: { x: from } };
}

export function UserDetailPanel({
  userId,
  onClose,
  showSuccess,
  showError,
  onConfirm,
  onEdit,
  onKycReview,
  onRefreshList,
  canDelete,
  onViewUserOrders,
}: Props) {
  const [tab, setTab] = useState<Tab>('overview');
  const [data, setData] = useState<AdminUserFullPayload | null>(null);
  const [load, setLoad] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const slide = rtlSlideX();

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoad(true);
    setErr(null);
    try {
      const d = await fetchAdminUserFull(userId);
      setData(d);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load user');
      setData(null);
    } finally {
      setLoad(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      setTab('overview');
      void loadData();
    } else {
      setData(null);
    }
  }, [userId, loadData]);

  useEffect(() => {
    if (!userId) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [userId, onClose]);

  if (!userId) return null;

  const u = data?.user;
  const name =
    u?.displayName || [u?.firstName, u?.lastName].filter(Boolean).join(' ') || u?.email || '—';

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-40 bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        aria-hidden
      />
      <motion.aside
        className="fixed end-0 top-0 z-50 flex h-full w-full max-w-[min(100vw,520px)] flex-col border-s border-app-border bg-app-card shadow-2xl"
        role="dialog"
        aria-modal
        aria-labelledby="user-panel-title"
        initial={slide.initial}
        animate={slide.animate}
        exit={slide.exit}
        transition={{ type: 'tween', duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-app-border px-4 py-3">
          <h2 id="user-panel-title" className="truncate pr-2 text-lg font-bold text-app-text">
            {load ? 'Loading…' : name}
          </h2>
          <button
            type="button"
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Close panel"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {err && <div className="px-4 py-2 text-sm text-red-600">{err}</div>}

        {load && !u && !err && (
          <div className="flex flex-1 items-center justify-center p-8 text-sm text-neutral-500">Loading…</div>
        )}

        {u && !err && (
          <>
            <div className="flex gap-0 overflow-x-auto border-b border-app-border px-1">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-semibold',
                    tab === t.id
                      ? 'border-neutral-900 text-app-text dark:border-white'
                      : 'border-transparent text-neutral-500 hover:text-app-text'
                  )}
                  onClick={() => setTab(t.id)}
                >
                  <t.icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 text-sm text-app-text">
              {tab === 'overview' && (
                <OverviewTab
                  u={u}
                  ordersSummary={data?.ordersSummary}
                  showSuccess={showSuccess}
                  showError={showError}
                  onConfirm={onConfirm}
                  onEdit={onEdit}
                  onClose={onClose}
                  onRefreshList={onRefreshList}
                  canDelete={canDelete}
                  onViewUserOrders={onViewUserOrders}
                />
              )}
              {tab === 'workspaces' && <WorkspacesTab u={u} />}
              {tab === 'orders' && (
                <OrdersSummaryTab
                  userId={u.id}
                  summary={data?.ordersSummary}
                  onViewUserOrders={onViewUserOrders}
                />
              )}
              {tab === 'activity' && <ActivityTab data={data} />}
              {tab === 'kyc' && (
                <KycTab u={u} kycRecord={data?.kycRecord ?? null} onKycReview={onKycReview} />
              )}
              {tab === 'audit' && <AuditTab logs={data?.auditLogs ?? []} />}
            </div>
          </>
        )}
      </motion.aside>
    </AnimatePresence>
  );
}

function OverviewTab({
  u,
  ordersSummary,
  showSuccess,
  showError,
  onConfirm,
  onEdit,
  onClose,
  onRefreshList,
  canDelete,
  onViewUserOrders,
}: {
  u: AdminUserRow;
  ordersSummary?: AdminUserFullPayload['ordersSummary'] | null;
  showSuccess: (m: string) => void;
  showError?: (m: string) => void;
  onConfirm: Props['onConfirm'];
  onEdit: (r: AdminUserRow) => void;
  onClose: () => void;
  onRefreshList: () => void;
  canDelete: boolean;
  onViewUserOrders?: (userId: string) => void;
}) {
  const label = u.displayName || [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email;

  const chPwd = () => {
    const np = window.prompt('New password (min 8 chars):');
    if (np == null) return;
    if (np.length < 8) {
      showError?.('Password too short');
      return;
    }
    void (async () => {
      try {
        await api.post('/api/admin/change-password', { userId: u.id, newPassword: np });
        showSuccess('Password updated.');
        onClose();
      } catch (e) {
        showError?.(e instanceof Error ? e.message : 'Failed to reset password');
      }
    })();
  };

  const susp = () => {
    const next = u.status === 'suspended' ? 'active' : 'suspended';
    onConfirm({
      type: 'warning',
      title: next === 'suspended' ? 'Suspend user' : 'Activate user',
      message: `Set status to ${next}?`,
      onConfirm: async () => {
        try {
          await api.put(`/api/admin/users/${u.id}`, { status: next });
          showSuccess(`User is now ${next}.`);
          onRefreshList();
          onClose();
        } catch (e) {
          showError?.(e instanceof Error ? e.message : 'Update failed');
        }
      },
    });
  };

  const del = () => {
    if (!canDelete) {
      showError?.('Not permitted to delete users.');
      return;
    }
    onConfirm({
      type: 'danger',
      title: 'Delete user',
      message: `Permanently delete ${u.email}? This cannot be undone.`,
      onConfirm: async () => {
        try {
          await api.delete(`/api/admin/users/${u.id}`);
          showSuccess('User deleted.');
          onRefreshList();
          onClose();
        } catch (e) {
          showError?.(e instanceof Error ? e.message : 'Delete failed');
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-3">
        {u.avatarUrl ? (
          <img src={u.avatarUrl} alt="" className="h-20 w-20 rounded-2xl object-cover" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-neutral-200 text-2xl font-bold dark:bg-neutral-700">
            {(label[0] || '?').toUpperCase()}
          </div>
        )}
        <div className="text-center">
          <p className="text-xl font-bold">{label}</p>
          <p className="text-xs text-neutral-500">{u.email}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-1.5">
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium dark:bg-neutral-800">
            {u.role}
          </span>
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium dark:bg-neutral-800">
            {u.status}
          </span>
          {u.isVerified && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
              verified
            </span>
          )}
          {u.mfaEnabled && (
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800 dark:bg-sky-900/30 dark:text-sky-300">
              MFA
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2 rounded-2xl border border-app-border p-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Contact</h3>
        <div className="flex items-center gap-2 text-app-text">
          <Mail className="h-4 w-4 shrink-0 text-neutral-400" />
          <span className="break-all">{u.email}</span>
        </div>
        {u.phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 shrink-0 text-neutral-400" />
            {u.phone}
          </div>
        )}
        {u.address && (
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
            {u.address}
          </div>
        )}
        {(u.gender || u.birthDate) && (
          <p className="text-xs text-neutral-500">
            {u.gender && <span>Gender: {u.gender} · </span>}
            {u.birthDate && <span>Born: {new Date(u.birthDate).toLocaleDateString()}</span>}
          </p>
        )}
        {(u.bio || u.location) && (
          <div className="space-y-1 border-t border-app-border pt-2 text-xs text-app-text">
            {u.location && (
              <p>
                <span className="font-semibold text-neutral-500">Location: </span>
                {u.location}
              </p>
            )}
            {u.bio && (
              <p>
                <span className="font-semibold text-neutral-500">Bio: </span>
                {u.bio}
              </p>
            )}
          </div>
        )}
        <p className="text-xs text-neutral-500">
          Registered: {new Date(u.createdAt).toLocaleString()}
        </p>
        {u.lastLoginAt && (
          <p className="text-xs text-neutral-500" title={new Date(u.lastLoginAt).toLocaleString()}>
            Last login: {new Date(u.lastLoginAt).toLocaleString()} {u.lastDevice && `· ${u.lastDevice}`}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-app-border bg-app-input px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Orders (wizard)</p>
          <p className="text-lg font-bold tabular-nums">{ordersSummary?.total ?? '—'}</p>
          <p className="text-[10px] text-neutral-500">
            {ordersSummary != null
              ? `${ordersSummary.asCustomer} as customer · ${ordersSummary.asMatchedProvider} as provider`
              : 'Load detail to refresh'}
          </p>
        </div>
        <div className="rounded-xl border border-app-border bg-app-input px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Legacy requests</p>
          <p className="text-lg font-bold tabular-nums">{u.counts.requestsAsCustomer + u.counts.requestsAsProvider}</p>
          <p className="text-[10px] text-neutral-500">
            {u.counts.requestsAsCustomer} cust · {u.counts.requestsAsProvider} prov
          </p>
        </div>
        <div className="rounded-xl border border-app-border bg-app-input px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Contracts</p>
          <p className="text-lg font-bold tabular-nums">{u.counts.contracts}</p>
          <p className="text-[10px] text-neutral-500">{u.counts.services} listed services</p>
        </div>
      </div>

      {onViewUserOrders && (
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-app-border py-2.5 text-sm font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800"
          onClick={() => onViewUserOrders(u.id)}
        >
          <ExternalLink className="h-4 w-4" />
          Open Admin Orders (filtered to this user)
        </button>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-xl border border-app-border px-3 py-2 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
          onClick={() => onEdit(u)}
        >
          Edit
        </button>
        <button
          type="button"
          className="rounded-xl border border-app-border px-3 py-2 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
          onClick={chPwd}
        >
          Change password
        </button>
        <button
          type="button"
          className="rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
          onClick={susp}
        >
          {u.status === 'suspended' ? 'Activate' : 'Suspend'}
        </button>
        {canDelete && (
          <button
            type="button"
            className="rounded-xl border border-red-200/80 bg-red-50 px-3 py-2 text-sm font-medium text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
            onClick={del}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

function WorkspacesTab({ u }: { u: AdminUserRow }) {
  if (!u.ownedCompany && u.memberships.length === 0) {
    return <p className="text-neutral-500">No workspace (company) memberships.</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-neutral-500">
        Provider workspaces are represented as companies. Owned workspace rows are highlighted.
      </p>
      <div className="overflow-x-auto rounded-xl border border-app-border">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-app-border bg-neutral-50/80 dark:bg-neutral-900/50">
              <th className="p-2 font-semibold">Workspace</th>
              <th className="p-2 font-semibold">Role</th>
            </tr>
          </thead>
        <tbody>
          {u.ownedCompany && (
            <tr className="border-b border-app-border bg-amber-50/50 dark:bg-amber-950/20">
              <td className="p-2 font-bold">{u.ownedCompany.name}</td>
              <td className="p-2">Owner</td>
            </tr>
          )}
          {u.memberships.map((m) => (
            <tr key={m.companyId} className="border-b border-app-border last:border-0">
              <td className="p-2">{m.companyName}</td>
              <td className="p-2">{m.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function OrdersSummaryTab({
  userId,
  summary,
  onViewUserOrders,
}: {
  userId: string;
  summary?: AdminUserFullPayload['ordersSummary'] | null;
  onViewUserOrders?: (userId: string) => void;
}) {
  if (!summary) {
    return <p className="text-neutral-500">No order data loaded.</p>;
  }

  const statusEntries = Object.entries(summary.byStatus).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-app-border px-3 py-2">
          <p className="text-[10px] font-bold uppercase text-neutral-500">Total</p>
          <p className="text-xl font-bold">{summary.total}</p>
        </div>
        <div className="rounded-xl border border-app-border px-3 py-2">
          <p className="text-[10px] font-bold uppercase text-neutral-500">As customer</p>
          <p className="text-xl font-bold">{summary.asCustomer}</p>
        </div>
        <div className="rounded-xl border border-app-border px-3 py-2">
          <p className="text-[10px] font-bold uppercase text-neutral-500">As provider</p>
          <p className="text-xl font-bold">{summary.asMatchedProvider}</p>
        </div>
      </div>

      {statusEntries.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-bold uppercase text-neutral-500">By status</h3>
          <div className="flex flex-wrap gap-1.5">
            {statusEntries.map(([st, n]) => (
              <span
                key={st}
                className="rounded-full border border-app-border bg-app-input px-2 py-1 text-xs font-medium"
              >
                {st}: <strong>{n}</strong>
              </span>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="mb-2 text-xs font-bold uppercase text-neutral-500">Recent orders</h3>
        <ul className="space-y-2">
          {summary.recent.map((o) => (
            <li key={o.id} className="rounded-lg border border-app-border px-2 py-2 text-xs">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{o.serviceName}</p>
                  <p className="text-neutral-500">
                    {o.relation === 'customer' ? 'Customer' : 'Matched provider'} · {o.status}
                    {o.phase ? ` · ${o.phase}` : ''}
                  </p>
                  {o.workspaceName && (
                    <p className="text-[10px] text-neutral-500">Workspace: {o.workspaceName}</p>
                  )}
                </div>
                <span className="shrink-0 text-[10px] text-neutral-400">
                  {new Date(o.updatedAt).toLocaleString()}
                </span>
              </div>
            </li>
          ))}
          {summary.recent.length === 0 && <p className="text-neutral-500">No orders yet.</p>}
        </ul>
      </section>

      {onViewUserOrders && (
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-app-border py-2.5 text-sm font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800"
          onClick={() => onViewUserOrders(userId)}
        >
          <ExternalLink className="h-4 w-4" />
          Admin Orders queue (same filter)
        </button>
      )}
    </div>
  );
}

function ActivityTab({ data }: { data: AdminUserFullPayload | null }) {
  if (!data) return null;
  const { transactions, contracts, requests } = data;
  return (
    <div className="space-y-6">
      <p className="text-xs text-neutral-500">
        Wizard marketplace orders (F5) live under the Orders tab. This tab shows legacy requests/contracts
        and internal transaction rows for historical context.
      </p>
      <section>
        <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-neutral-500">
          <Activity className="h-3.5 w-3.5" />
          Last transactions
        </h3>
        <ul className="space-y-2">
          {transactions.slice(0, 10).map((t) => (
            <li key={t.id} className="rounded-lg border border-app-border px-2 py-1.5 text-xs">
              {new Date(t.timestamp).toLocaleString()} — {t.type} — {t.amount}
            </li>
          ))}
          {transactions.length === 0 && <p className="text-neutral-500">None.</p>}
        </ul>
      </section>
      <section>
        <h3 className="mb-2 text-xs font-bold uppercase text-neutral-500">Contracts (recent)</h3>
        <ul className="space-y-2">
          {contracts.slice(0, 10).map((c) => (
            <li key={c.id} className="rounded-lg border border-app-border px-2 py-1.5 text-xs">
              {c.status} — {c.amount} — {new Date(c.createdAt).toLocaleDateString()}
            </li>
          ))}
          {contracts.length === 0 && <p className="text-neutral-500">None.</p>}
        </ul>
      </section>
      <section>
        <h3 className="mb-2 text-xs font-bold uppercase text-neutral-500">Requests (recent)</h3>
        <ul className="space-y-2">
          {requests.slice(0, 10).map((r) => (
            <li key={r.id} className="rounded-lg border border-app-border px-2 py-1.5 text-xs">
              {r.service?.title} — {r.status} — {new Date(r.createdAt).toLocaleString()}
            </li>
          ))}
          {requests.length === 0 && <p className="text-neutral-500">None.</p>}
        </ul>
      </section>
    </div>
  );
}

function KycTab({
  u,
  kycRecord,
  onKycReview,
}: {
  u: AdminUserRow;
  kycRecord: AdminUserFullPayload['kycRecord'];
  onKycReview?: (id: string) => void;
}) {
  const kycId = kycRecord?.id;

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-xl border border-app-border p-3">
        <h3 className="text-xs font-bold uppercase tracking-wide text-neutral-500">Verification summary</h3>
        <div className="flex justify-between text-sm">
          <span>Personal</span>
          <span className="font-medium">{u.kyc.personalStatus ?? '—'}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Business</span>
          <span className="font-medium">{u.kyc.businessStatus ?? '—'}</span>
        </div>
        {u.ownedCompany?.kycStatus != null && (
          <div className="flex justify-between border-t border-app-border pt-2 text-sm">
            <span>Owned workspace KYC</span>
            <span className="font-medium">{u.ownedCompany.kycStatus}</span>
          </div>
        )}
      </div>

      {kycRecord && (
        <div className="rounded-xl border border-app-border p-3 text-xs">
          <p className="font-semibold text-app-text">Latest submission row</p>
          <p className="mt-1 text-neutral-600 dark:text-neutral-400">
            Type <span className="font-medium">{kycRecord.type}</span> · Status{' '}
            <span className="font-medium">{kycRecord.status}</span>
          </p>
          <p className="mt-1 text-neutral-500">{new Date(kycRecord.createdAt).toLocaleString()}</p>
        </div>
      )}

      {kycId && onKycReview && (
        <button
          type="button"
          className="w-full rounded-xl border border-app-border py-2 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
          onClick={() => onKycReview(kycId)}
        >
          Open KYC review
        </button>
      )}
    </div>
  );
}

function AuditTab({ logs }: { logs: AdminUserFullPayload['auditLogs'] }) {
  return (
    <ul className="space-y-2">
      {logs.slice(0, 20).map((l) => (
        <li key={l.id} className="rounded-lg border border-app-border p-2 text-xs">
          <p className="font-medium">{l.action}</p>
          <p className="text-neutral-500">
            {new Date(l.timestamp).toLocaleString()}
            {l.actor && (
              <>
                {' '}
                · Actor: {l.actor.displayName || l.actor.email || l.actor.id}
              </>
            )}
          </p>
          <p className="mt-1 text-[10px] text-neutral-500">
            {l.resourceType} · {l.resourceId}
          </p>
          {l.metadata != null && (
            <pre className="mt-1 max-h-24 overflow-auto rounded bg-neutral-100/80 p-1.5 text-[10px] dark:bg-neutral-900/80">
              {typeof l.metadata === 'string' ? l.metadata : JSON.stringify(l.metadata, null, 0)}
            </pre>
          )}
        </li>
      ))}
      {logs.length === 0 && <p className="text-neutral-500">No audit rows matched this user.</p>}
    </ul>
  );
}
