import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { CrmTable } from '../crm/CrmTable.js';
import { bulkUserAction, fetchAdminUserIds } from '../../services/adminUsers';
import { useAdminUsersController, type UserSegment } from '../../hooks/useAdminUsersController';
import { getAdminUserColumns, tableIdForSegment } from './adminUserColumns';
import { UserDetailPanel } from './UserDetailPanel';
import type { AdminUserRow } from '../../../lib/adminUsersTypes';
import { UserCheck, UserX, ShieldCheck, ShieldOff, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils.js';
import { api } from '../../lib/api';

// Avoid circular imports with AdminDashboard: keep notify callbacks as props
const closedConfirmModal = {
  show: false,
  title: '',
  message: '',
  onConfirm: () => {},
  type: 'info' as const,
};

type SectionProps = {
  showSuccess: (message: string) => void;
  setNotification: (n: { show: boolean; message: string; type: 'success' | 'error' } | null) => void;
  setShowConfirmModal: (s: {
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    type: 'danger' | 'warning' | 'info';
  }) => void;
  onEditUser: (u: AdminUserRow) => void;
  onKycReview?: (kycId: string) => void;
  /** Navigate to Admin Orders with this user pre-filtered (CRM handoff). */
  onViewUserOrders?: (userId: string) => void;
  fetchDashboardUsers: () => void | Promise<void>;
};

const segments: { id: UserSegment; label: string }[] = [
  { id: 'all', label: 'All users' },
  { id: 'clients', label: 'Clients' },
  { id: 'providers', label: 'Providers' },
];

function notifyError(
  setNotification: SectionProps['setNotification'],
  message: string
) {
  setNotification({ show: true, message, type: 'error' });
  setTimeout(() => setNotification(null), 4000);
}

export function AdminUsersSection({
  showSuccess: onSuccess,
  setNotification,
  setShowConfirmModal,
  onEditUser,
  onKycReview,
  onViewUserOrders,
  fetchDashboardUsers,
}: SectionProps) {
  const { user: authUser } = useAuth();
  const canDelete = ['owner', 'platform_admin'].includes(authUser?.role ?? '');
  const [panelUserId, setPanelUserId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);

  const c = useAdminUsersController();
  const {
    data,
    total,
    facets,
    segment,
    page,
    pageSize,
    globalSearch,
    sort,
    filters,
    loading,
    error,
    setPage,
    setPageSize,
    setGlobalSearch,
    onSortChange,
    onFiltersChange,
    setSegment,
    listQuery,
    refetch,
  } = c;

  const onCopied = (msg: string) => onSuccess(msg);

  const runBulk = useCallback(
    async (ids: string[], action: 'activate' | 'suspend' | 'verify' | 'unverify' | 'delete') => {
      if (action === 'delete' && !canDelete) {
        notifyError(setNotification, 'Not permitted to delete users.');
        return;
      }
      if (action === 'delete') {
        setShowConfirmModal({
          show: true,
          type: 'danger',
          title: 'Delete users',
          message: `Delete ${ids.length} user(s)? This cannot be undone.`,
          onConfirm: async () => {
            try {
              const res = await bulkUserAction(ids, 'delete');
              onSuccess(res.affected ? `Deleted ${res.affected} user(s).` : 'No users deleted.');
              setShowConfirmModal(closedConfirmModal);
              await refetch();
              void fetchDashboardUsers();
              setPanelUserId(null);
            } catch (e) {
              notifyError(setNotification, e instanceof Error ? e.message : 'Bulk delete failed');
            }
          },
        });
        return;
      }
      try {
        const res = await bulkUserAction(ids, action);
        onSuccess(`Updated ${res.affected} user(s).`);
        await refetch();
        void fetchDashboardUsers();
      } catch (e) {
        notifyError(setNotification, e instanceof Error ? e.message : 'Bulk action failed');
      }
    },
    [canDelete, fetchDashboardUsers, onSuccess, refetch, setNotification, setShowConfirmModal]
  );

  const columns = useMemo(
    () =>
      getAdminUserColumns(segment, {
        onView: (u) => {
          setMenuId(null);
          setPanelUserId(u.id);
        },
        onEdit: (u) => {
          setMenuId(null);
          onEditUser(u);
        },
        onResetPassword: (u) => {
          setMenuId(null);
          const np = window.prompt('New password for ' + u.email);
          if (np == null || np.length < 8) {
            if (np !== null) notifyError(setNotification, 'Password must be at least 8 characters.');
            return;
          }
          void (async () => {
            try {
              await api.post('/api/admin/change-password', { userId: u.id, newPassword: np });
              onSuccess('Password updated.');
            } catch (e) {
              notifyError(setNotification, e instanceof Error ? e.message : 'Failed');
            }
          })();
        },
        onToggleSuspend: (u) => {
          setMenuId(null);
          const next = u.status === 'suspended' ? 'active' : 'suspended';
          setShowConfirmModal({
            show: true,
            type: 'warning',
            title: next === 'suspended' ? 'Suspend' : 'Activate',
            message: `Set ${u.email} to ${next}?`,
            onConfirm: async () => {
              try {
                await api.put(`/api/admin/users/${u.id}`, { status: next });
                onSuccess('User updated.');
                setShowConfirmModal(closedConfirmModal);
                await refetch();
                void fetchDashboardUsers();
                setPanelUserId((id) => (id === u.id ? null : id));
              } catch (e) {
                notifyError(setNotification, e instanceof Error ? e.message : 'Update failed');
              }
            },
          });
        },
        onDelete: (u) => {
          setMenuId(null);
          if (!canDelete) {
            notifyError(setNotification, 'Not permitted.');
            return;
          }
          setShowConfirmModal({
            show: true,
            type: 'danger',
            title: 'Delete user',
            message: `Delete ${u.email}?`,
            onConfirm: async () => {
              try {
                await api.delete(`/api/admin/users/${u.id}`);
                onSuccess('User deleted.');
                setShowConfirmModal(closedConfirmModal);
                await refetch();
                void fetchDashboardUsers();
                setPanelUserId((id) => (id === u.id ? null : id));
              } catch (e) {
                notifyError(setNotification, e instanceof Error ? e.message : 'Delete failed');
              }
            },
          });
        },
        onCopied,
        openMenuId: menuId,
        setOpenMenuId: setMenuId,
      }),
    [canDelete, fetchDashboardUsers, menuId, onEditUser, onSuccess, refetch, setShowConfirmModal, setNotification]
  );

  const onSelectAllMatching = useCallback(async () => {
    const q = listQuery();
    delete q.page;
    delete q.pageSize;
    const { ids } = await fetchAdminUserIds(q);
    return ids;
  }, [listQuery]);

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-bold tracking-tight text-app-text" id="user-mgmt-bc">
        User Management
      </h2>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          className="inline-flex rounded-2xl border border-app-border bg-app-input p-1"
          role="tablist"
          aria-label="User segments"
        >
          {segments.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={segment === s.id}
              className={cn(
                'rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wider',
                segment === s.id
                  ? 'bg-app-card text-app-text shadow-sm'
                  : 'text-neutral-500 hover:text-app-text'
              )}
              onClick={() => setSegment(s.id)}
            >
              {s.id === 'all' ? 'All users' : s.id === 'clients' ? 'Clients' : 'Providers'}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
          <span className="rounded-full border border-app-border bg-app-card px-2.5 py-1 font-bold text-app-text">
            {total} total
          </span>
          {facets?.status?.['active'] != null && (
            <span className="rounded-full border border-app-border px-2 py-0.5">
              active: {facets.status['active']}
            </span>
          )}
          {facets?.role?.['provider'] != null && (
            <span className="rounded-full border border-app-border px-2 py-0.5">
              provider: {facets.role['provider']}
            </span>
          )}
        </div>
      </div>

      <CrmTable<AdminUserRow>
        key={segment}
        tableId={tableIdForSegment(segment)}
        columns={columns}
        data={data}
        total={total}
        loading={loading}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        sort={sort}
        onSortChange={onSortChange}
        filters={filters}
        onFiltersChange={onFiltersChange}
        globalSearch={globalSearch}
        onGlobalSearchChange={setGlobalSearch}
        rowKey={(r) => r.id}
        onRowClick={(r) => setPanelUserId(r.id)}
        onSelectAllMatching={onSelectAllMatching}
        error={error}
        bulkActions={[
          {
            id: 'activate',
            label: 'Activate',
            icon: <UserCheck className="h-4 w-4" />,
            variant: 'default',
            onRun: (ids) => runBulk(ids, 'activate'),
          },
          {
            id: 'suspend',
            label: 'Suspend',
            icon: <UserX className="h-4 w-4" />,
            variant: 'default',
            onRun: (ids) => runBulk(ids, 'suspend'),
          },
          {
            id: 'verify',
            label: 'Verify',
            icon: <ShieldCheck className="h-4 w-4" />,
            variant: 'primary',
            onRun: (ids) => runBulk(ids, 'verify'),
          },
          {
            id: 'unverify',
            label: 'Unverify',
            icon: <ShieldOff className="h-4 w-4" />,
            variant: 'default',
            onRun: (ids) => runBulk(ids, 'unverify'),
          },
          {
            id: 'delete',
            label: 'Delete',
            icon: <Trash2 className="h-4 w-4" />,
            variant: 'danger',
            onRun: (ids) => runBulk(ids, 'delete'),
          },
        ]}
        rightToolbar={
          <div className="text-xs text-neutral-500" title="All matching in current segment">
            Segment: {segment}
          </div>
        }
      />

      {panelUserId && (
        <UserDetailPanel
          key={panelUserId}
          userId={panelUserId}
          onClose={() => setPanelUserId(null)}
          showSuccess={onSuccess}
          showError={(m) => notifyError(setNotification, m)}
          onViewUserOrders={onViewUserOrders}
          onConfirm={({ title, message, type, onConfirm: inner }) => {
            setShowConfirmModal({
              show: true,
              title,
              message,
              type,
              onConfirm: () => {
                void (async () => {
                  try {
                    await Promise.resolve(inner());
                    setShowConfirmModal(closedConfirmModal);
                    await refetch();
                    void fetchDashboardUsers();
                  } catch (e) {
                    notifyError(setNotification, e instanceof Error ? e.message : 'Action failed');
                  }
                })();
              },
            });
          }}
          onEdit={onEditUser}
          onKycReview={onKycReview}
          onRefreshList={() => {
            void refetch();
            void fetchDashboardUsers();
          }}
          canDelete={canDelete}
        />
      )}
    </div>
  );
}
