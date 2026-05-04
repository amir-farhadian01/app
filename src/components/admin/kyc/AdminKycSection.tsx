import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MoreHorizontal, XCircle, Eye, UserCheck } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useAuth } from '../../../lib/AuthContext';
import {
  acknowledgeLevel0,
  bulkBusiness,
  bulkPersonal,
  listBusiness,
  listLevel0,
  listPersonal,
  type BusinessSubmissionRow,
  type KycStatusUi,
  type Level0Row,
  type PersonalSubmissionRow,
} from '../../../services/adminKyc';
import type { ReviewAction } from '../../../services/adminKyc';
import { KycSimpleTable, type SimpleColumn } from './KycSimpleTable';
import { KycStatusBadge } from './KycStatusBadge';
import { KycReviewDrawer, type DrawerPayload } from './KycReviewDrawer';
import { FormBuilder } from './formBuilder/FormBuilder';

type KycSub = 'level0' | 'personal' | 'business' | 'builder';

const DOC_TYPES = ['national_id', 'passport', 'drivers_license'] as const;

function readCsv(sp: URLSearchParams, key: string): string[] {
  const v = sp.get(key);
  if (!v) return [];
  return v.split(',').map((s) => s.trim()).filter(Boolean);
}

function initials(email: string, name: string | null) {
  if (name?.trim()) return name.slice(0, 2).toUpperCase();
  return email.slice(0, 2).toUpperCase();
}

export function AdminKycSection({
  showSuccess,
  setNotification,
}: {
  showSuccess: (m: string) => void;
  setNotification: (n: { show: boolean; message: string; type: 'success' | 'error' } | null) => void;
}) {
  const { user: authUser } = useAuth();
  const canBulk = ['owner', 'platform_admin'].includes(authUser?.role ?? '');
  const [sp, setSp] = useSearchParams();

  const sub = (sp.get('sub') as KycSub) || 'personal';
  const q = sp.get('q') || '';
  const userIdParam = sp.get('userId') || '';

  const [stats, setStats] = useState({ pendingL1: 0, pendingL2: 0, rejected7d: 0 });
  /** Split loading: Personal/Business used to share one flag and re-trigger full table skeleton on every filter/sort change → layout jump. */
  const [loadingL0, setLoadingL0] = useState(false);
  const [loadingP, setLoadingP] = useState(false);
  const [loadingB, setLoadingB] = useState(false);
  const personalHydratedRef = useRef(false);
  const businessHydratedRef = useRef(false);
  const [drawer, setDrawer] = useState<DrawerPayload | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [ackModal, setAckModal] = useState<{ userId: string; note: string } | null>(null);
  const [bulkNote, setBulkNote] = useState('');
  const [bulkOpen, setBulkOpen] = useState<ReviewAction | null>(null);

  /* Level 0 */
  const l0Raw = sp.get('l0filter') || '';
  const l0Filter =
    l0Raw === 'emailMissing' || l0Raw === 'phoneMissing' || l0Raw === 'addressMissing' || l0Raw === 'complete'
      ? l0Raw
      : '';
  const [l0Rows, setL0Rows] = useState<Level0Row[]>([]);
  const [l0Total, setL0Total] = useState(0);
  const [l0Page, setL0Page] = useState(1);
  const l0PageSize = 20;

  /* Personal */
  const pStatus = readCsv(sp, 'status');
  const pStatusEff = pStatus.length ? pStatus : ['pending'];
  const pAiRec = readCsv(sp, 'aiRec');
  const pDocTypes = readCsv(sp, 'docTypes');
  const pFrom = sp.get('subFrom') || '';
  const pTo = sp.get('subTo') || '';
  const [pRows, setPRows] = useState<PersonalSubmissionRow[]>([]);
  const [pTotal, setPTotal] = useState(0);
  const [pPage, setPPage] = useState(1);
  const pPageSize = 20;
  const [pSort, setPSort] = useState<{ id: string; dir: 'asc' | 'desc' } | null>({ id: 'submittedAt', dir: 'desc' });
  const [pSel, setPSel] = useState<Set<string>>(new Set());
  const [pSearch, setPSearch] = useState(q);

  /* Business */
  const bStatus = readCsv(sp, 'bStatus');
  const bStatusEff = bStatus.length ? bStatus : ['pending'];
  const bSchemaVers = readCsv(sp, 'schemaVer').map((x) => parseInt(x, 10)).filter((n) => !Number.isNaN(n));
  const bExpIssue = sp.get('expIssue') === '1';
  const bInqFail = sp.get('inqFail') === '1';
  const bFrom = sp.get('bSubFrom') || '';
  const bTo = sp.get('bSubTo') || '';
  const [bRows, setBRows] = useState<BusinessSubmissionRow[]>([]);
  const [bTotal, setBTotal] = useState(0);
  const [bPage, setBPage] = useState(1);
  const bPageSize = 20;
  const [bSort, setBSort] = useState<{ id: string; dir: 'asc' | 'desc' } | null>({ id: 'submittedAt', dir: 'desc' });
  const [bSel, setBSel] = useState<Set<string>>(new Set());
  const [bSearch, setBSearch] = useState(q);

  const updateSp = useCallback(
    (mut: (next: URLSearchParams) => void) => {
      setSp((prev) => {
        const next = new URLSearchParams(prev);
        mut(next);
        return next;
      });
    },
    [setSp],
  );

  useEffect(() => {
    setPSearch(q);
    setBSearch(q);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [l1, l2] = await Promise.all([
          listPersonal({ status: ['pending'], page: 1, pageSize: 1 }),
          listBusiness({ status: ['pending'], page: 1, pageSize: 1 }),
        ]);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 7);
        const [pr, br] = await Promise.all([
          listPersonal({ status: ['rejected'], page: 1, pageSize: 400 }),
          listBusiness({ status: ['rejected'], page: 1, pageSize: 400 }),
        ]);
        const rejected7d =
          [...pr.rows, ...br.rows].filter((r) => r.reviewedAt && new Date(r.reviewedAt) >= cutoff).length;
        if (!cancelled) setStats({ pendingL1: l1.total, pendingL2: l2.total, rejected7d });
      } catch {
        if (!cancelled) setStats({ pendingL1: 0, pendingL2: 0, rejected7d: 0 });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshL0 = useCallback(async () => {
    setLoadingL0(true);
    try {
      const res = await listLevel0({
        page: l0Page,
        pageSize: l0PageSize,
        q: q || undefined,
        filter: l0Filter ? l0Filter : undefined,
        sortBy: 'lastUpdated',
        sortDir: 'desc',
      });
      setL0Rows(res.rows);
      setL0Total(res.total);
    } catch (e) {
      setNotification({ show: true, message: e instanceof Error ? e.message : 'Level 0 load failed', type: 'error' });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setLoadingL0(false);
    }
  }, [l0Page, l0PageSize, q, l0Filter, setNotification]);

  const refreshP = useCallback(async () => {
    const showSkeleton = !personalHydratedRef.current;
    if (showSkeleton) setLoadingP(true);
    try {
      const aiRecApi = pAiRec.filter((x) => x !== 'none');
      const res = await listPersonal({
        page: pPage,
        pageSize: pPageSize,
        q: pSearch || userIdParam || undefined,
        userId: userIdParam || undefined,
        status: pStatusEff as KycStatusUi[],
        sortBy: pSort?.id === 'status' ? 'status' : 'submittedAt',
        sortDir: pSort?.dir ?? 'desc',
        aiRecommendation: aiRecApi.length ? aiRecApi : undefined,
      });
      let rows = res.rows;
      if (pAiRec.includes('none')) {
        rows = rows.filter((r) => !r.aiAnalysis || !(r.aiAnalysis as { recommendation?: string }).recommendation);
      }
      if (pDocTypes.length) {
        rows = rows.filter((r) => pDocTypes.includes(r.idDocumentType));
      }
      if (pFrom) {
        const t = new Date(pFrom).getTime();
        rows = rows.filter((r) => new Date(r.submittedAt).getTime() >= t);
      }
      if (pTo) {
        const t = new Date(pTo).getTime();
        rows = rows.filter((r) => new Date(r.submittedAt).getTime() <= t);
      }
      const clientOnlyFilters = pDocTypes.length > 0 || !!pFrom || !!pTo || pAiRec.includes('none');
      setPRows(rows);
      setPTotal(clientOnlyFilters ? rows.length : res.total);
      personalHydratedRef.current = true;
    } catch (e) {
      setNotification({ show: true, message: e instanceof Error ? e.message : 'Personal load failed', type: 'error' });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      if (showSkeleton) setLoadingP(false);
    }
  }, [
    pPage,
    pPageSize,
    pSearch,
    userIdParam,
    pStatusEff,
    pSort,
    pAiRec,
    pDocTypes,
    pFrom,
    pTo,
    setNotification,
  ]);

  const countExpiryFails = (r: BusinessSubmissionRow) => {
    const f = r.expiryFlags;
    if (!f || typeof f !== 'object') return 0;
    return Object.values(f).filter((v) => v && typeof v === 'object' && v.passesThreshold === false).length;
  };

  const countInqFails = (r: BusinessSubmissionRow) => {
    const ir = r.inquiryResults;
    if (!ir || typeof ir !== 'object') return 0;
    return Object.values(ir).filter((v) => v && typeof v === 'object' && (v as { success?: boolean }).success === false).length;
  };

  const refreshB = useCallback(async () => {
    const showSkeleton = !businessHydratedRef.current;
    if (showSkeleton) setLoadingB(true);
    try {
      const res = await listBusiness({
        page: bPage,
        pageSize: bPageSize,
        q: bSearch || userIdParam || undefined,
        userId: userIdParam || undefined,
        status: bStatusEff as KycStatusUi[],
        sortBy: bSort?.id === 'submittedAt' ? 'submittedAt' : 'submittedAt',
        sortDir: bSort?.dir ?? 'desc',
      });
      let rows = res.rows;
      if (bSchemaVers.length) {
        rows = rows.filter((r) => bSchemaVers.includes(r.schemaVersion));
      }
      if (bExpIssue) {
        rows = rows.filter((r) => countExpiryFails(r) > 0);
      }
      if (bInqFail) {
        rows = rows.filter((r) => countInqFails(r) > 0);
      }
      if (bFrom) {
        const t = new Date(bFrom).getTime();
        rows = rows.filter((r) => new Date(r.submittedAt).getTime() >= t);
      }
      if (bTo) {
        const t = new Date(bTo).getTime();
        rows = rows.filter((r) => new Date(r.submittedAt).getTime() <= t);
      }
      const bClientOnly =
        bSchemaVers.length > 0 || bExpIssue || bInqFail || !!bFrom || !!bTo;
      setBRows(rows);
      setBTotal(bClientOnly ? rows.length : res.total);
      businessHydratedRef.current = true;
    } catch (e) {
      setNotification({ show: true, message: e instanceof Error ? e.message : 'Business load failed', type: 'error' });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      if (showSkeleton) setLoadingB(false);
    }
  }, [
    bPage,
    bPageSize,
    bSearch,
    userIdParam,
    bStatusEff,
    bSort,
    bSchemaVers,
    bExpIssue,
    bInqFail,
    bFrom,
    bTo,
    setNotification,
  ]);

  useEffect(() => {
    if (sub !== 'level0') return;
    void refreshL0();
  }, [sub, refreshL0]);

  useEffect(() => {
    if (sub !== 'personal') return;
    void refreshP();
  }, [sub, refreshP]);

  useEffect(() => {
    if (sub !== 'business') return;
    void refreshB();
  }, [sub, refreshB]);

  const setSub = (s: KycSub) => {
    updateSp((n) => {
      n.set('sub', s);
    });
  };

  const l0Columns: SimpleColumn<Level0Row>[] = useMemo(
    () => [
      {
        id: 'user',
        header: 'User',
        accessor: (r) => r.user.email,
        cell: (r) => (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-[10px] font-bold">
              {initials(r.user.email, r.user.displayName)}
            </div>
            <div>
              <p className="font-semibold text-app-text truncate max-w-[140px]">{r.user.displayName || '—'}</p>
              <p className="text-[10px] text-neutral-500 truncate max-w-[160px]">{r.user.email}</p>
            </div>
          </div>
        ),
      },
      {
        id: 'emailV',
        header: 'Email',
        accessor: (r) => r.emailVerified,
        cell: (r) => <span aria-label={r.emailVerified ? 'Email verified' : 'Email not verified'}>{r.emailVerified ? '✓' : '✗'}</span>,
      },
      {
        id: 'phoneV',
        header: 'Phone',
        accessor: (r) => r.phoneVerified,
        cell: (r) => <span aria-label={r.phoneVerified ? 'Phone verified' : 'Phone not verified'}>{r.phoneVerified ? '✓' : '✗'}</span>,
      },
      {
        id: 'addr',
        header: 'Address',
        accessor: (r) => r.address,
        cell: (r) => <span className="truncate block max-w-[120px]">{r.address || '—'}</span>,
      },
      {
        id: 'addrVer',
        header: 'Addr. ver.',
        accessor: (r) => r.addressVerified,
        cell: (r) => (r.addressVerified ? '✓' : '✗'),
      },
      {
        id: 'lu',
        header: 'Updated',
        accessor: (r) => r.lastUpdated,
        sortable: true,
        cell: (r) => <span className="text-xs text-neutral-500">{new Date(r.lastUpdated).toLocaleString()}</span>,
      },
      {
        id: 'act',
        header: 'Actions',
        accessor: () => '',
        cell: (r) => (
          <div className="flex gap-1">
            <button
              type="button"
              className="text-[10px] font-bold px-2 py-1 rounded-lg border border-app-border hover:bg-app-bg"
              aria-label="View level 0 details"
              onClick={(e) => {
                e.stopPropagation();
                setDrawer({ kind: 'level0', userId: r.user.id, snapshot: r });
              }}
            >
              <Eye className="w-3 h-3 inline" />
            </button>
            <button
              type="button"
              className="text-[10px] font-bold px-2 py-1 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
              aria-label="Acknowledge level 0"
              onClick={(e) => {
                e.stopPropagation();
                setAckModal({ userId: r.user.id, note: '' });
              }}
            >
              Ack
            </button>
          </div>
        ),
      },
    ],
    [],
  );

  const personalColumns: SimpleColumn<PersonalSubmissionRow>[] = useMemo(
    () => [
      {
        id: 'user',
        header: 'User',
        accessor: (r) => r.user.email,
        cell: (r) => (
          <div>
            <p className="font-semibold text-sm">{r.user.displayName || r.user.email}</p>
            <p className="text-[10px] text-neutral-500">{r.user.email}</p>
          </div>
        ),
      },
      {
        id: 'name',
        header: 'Legal name',
        accessor: (r) => r.declaredLegalName,
      },
      {
        id: 'docType',
        header: 'ID type',
        accessor: (r) => r.idDocumentType,
      },
      {
        id: 'submittedAt',
        header: 'Submitted',
        accessor: (r) => r.submittedAt,
        sortable: true,
        cell: (r) => <span className="text-xs">{new Date(r.submittedAt).toLocaleString()}</span>,
      },
      {
        id: 'status',
        header: 'Status',
        accessor: (r) => r.status,
        sortable: true,
        cell: (r) => <KycStatusBadge status={r.status} />,
      },
      {
        id: 'aiRec',
        header: 'AI rec.',
        accessor: (r) => (r.aiAnalysis as { recommendation?: string } | null)?.recommendation ?? '',
        cell: (r) => (
          <span className="text-xs">{((r.aiAnalysis as { recommendation?: string } | null)?.recommendation ?? '—').replace(/_/g, ' ')}</span>
        ),
      },
      {
        id: 'aiConf',
        header: 'AI conf.',
        accessor: (r) => (r.aiAnalysis as { confidence?: number } | null)?.confidence ?? '',
        cell: (r) => {
          const c = (r.aiAnalysis as { confidence?: number } | null)?.confidence;
          return <span className="text-xs">{c != null ? `${c <= 1 ? Math.round(c * 100) : c}%` : '—'}</span>;
        },
      },
      {
        id: 'reviewer',
        header: 'Reviewer',
        accessor: (r) => r.reviewedById ?? '',
        cell: (r) => <span className="text-[10px] font-mono">{r.reviewedById ? r.reviewedById.slice(0, 8) : '—'}</span>,
      },
      {
        id: 'menu',
        header: '',
        accessor: () => '',
        cell: (r) => (
          <div className="relative">
            <button
              type="button"
              aria-label="Row actions"
              className="p-1 rounded hover:bg-app-bg"
              onClick={(e) => {
                e.stopPropagation();
                setMenuId((id) => (id === r.id ? null : r.id));
              }}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menuId === r.id ? (
              <div className="absolute right-0 z-50 mt-1 w-44 rounded-xl border border-app-border bg-app-card shadow-lg py-1 text-xs">
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-app-bg"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuId(null);
                    setDrawer({ kind: 'personal', id: r.id });
                  }}
                >
                  Open
                </button>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-app-bg text-emerald-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuId(null);
                    setBSel(new Set());
                    setBulkOpen('approve');
                    setPSel(new Set([r.id]));
                  }}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-app-bg text-red-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuId(null);
                    setBSel(new Set());
                    setBulkOpen('reject');
                    setPSel(new Set([r.id]));
                  }}
                >
                  Reject
                </button>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-app-bg"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuId(null);
                    setBSel(new Set());
                    setBulkOpen('request_resubmit');
                    setPSel(new Set([r.id]));
                  }}
                >
                  Request resubmit
                </button>
              </div>
            ) : null}
          </div>
        ),
      },
    ],
    [menuId],
  );

  const businessColumns: SimpleColumn<BusinessSubmissionRow>[] = useMemo(
    () => [
      {
        id: 'user',
        header: 'User',
        accessor: (r) => r.user.email,
        cell: (r) => (
          <div>
            <p className="font-semibold text-sm">{r.user.displayName || r.user.email}</p>
            <p className="text-[10px] text-neutral-500">{r.user.email}</p>
          </div>
        ),
      },
      {
        id: 'co',
        header: 'Company',
        accessor: (r) => r.company?.name ?? '',
        cell: (r) => <span className="text-sm">{r.company?.name ?? '—'}</span>,
      },
      {
        id: 'ver',
        header: 'Schema',
        accessor: (r) => r.schemaVersion,
      },
      {
        id: 'sub',
        header: 'Submitted',
        accessor: (r) => r.submittedAt,
        sortable: true,
        cell: (r) => <span className="text-xs">{new Date(r.submittedAt).toLocaleString()}</span>,
      },
      {
        id: 'st',
        header: 'Status',
        accessor: (r) => r.status,
        cell: (r) => <KycStatusBadge status={r.status} />,
      },
      {
        id: 'exp',
        header: 'Expiry Δ',
        accessor: (r) => countExpiryFails(r),
        cell: (r) => {
          const n = countExpiryFails(r);
          return <span className={cn('text-xs font-bold', n > 0 ? 'text-amber-600' : '')}>{n}</span>;
        },
      },
      {
        id: 'inq',
        header: 'Inq. Δ',
        accessor: (r) => countInqFails(r),
        cell: (r) => {
          const n = countInqFails(r);
          return <span className={cn('text-xs font-bold', n > 0 ? 'text-red-600' : '')}>{n}</span>;
        },
      },
      {
        id: 'rev',
        header: 'Reviewer',
        accessor: (r) => r.reviewedById ?? '',
        cell: (r) => <span className="text-[10px] font-mono">{r.reviewedById ? r.reviewedById.slice(0, 8) : '—'}</span>,
      },
      {
        id: 'menu',
        header: '',
        accessor: () => '',
        cell: (r) => (
          <button
            type="button"
            aria-label="Open business review"
            className="p-1 rounded hover:bg-app-bg"
            onClick={(e) => {
              e.stopPropagation();
              setDrawer({ kind: 'business', id: r.id });
            }}
          >
            <Eye className="w-4 h-4" />
          </button>
        ),
      },
    ],
    [],
  );

  const runBulkPersonal = async (action: ReviewAction) => {
    if (!canBulk) {
      setNotification({ show: true, message: 'Bulk actions require owner or platform admin.', type: 'error' });
      setTimeout(() => setNotification(null), 4000);
      return;
    }
    if (bulkNote.trim().length < 10 && action !== 'approve') {
      setNotification({ show: true, message: 'Note must be at least 10 characters.', type: 'error' });
      setTimeout(() => setNotification(null), 4000);
      return;
    }
    try {
      await bulkPersonal([...pSel], action, bulkNote);
      showSuccess(`Bulk ${action} completed`);
      setBulkOpen(null);
      setBulkNote('');
      setPSel(new Set());
      await refreshP();
    } catch (e) {
      setNotification({ show: true, message: e instanceof Error ? e.message : 'Bulk failed', type: 'error' });
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const runBulkBusiness = async (action: ReviewAction) => {
    if (!canBulk) {
      setNotification({ show: true, message: 'Bulk actions require owner or platform admin.', type: 'error' });
      setTimeout(() => setNotification(null), 4000);
      return;
    }
    if (bulkNote.trim().length < 10 && action !== 'approve') {
      setNotification({ show: true, message: 'Note must be at least 10 characters.', type: 'error' });
      setTimeout(() => setNotification(null), 4000);
      return;
    }
    try {
      await bulkBusiness([...bSel], action, bulkNote);
      showSuccess(`Bulk ${action} completed`);
      setBulkOpen(null);
      setBulkNote('');
      setBSel(new Set());
      await refreshB();
    } catch (e) {
      setNotification({ show: true, message: e instanceof Error ? e.message : 'Bulk failed', type: 'error' });
      setTimeout(() => setNotification(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { label: 'Pending L1 (Personal)', value: stats.pendingL1, icon: UserCheck, tone: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
          { label: 'Pending L2 (Business)', value: stats.pendingL2, icon: UserCheck, tone: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Rejected (7 days)', value: stats.rejected7d, icon: XCircle, tone: 'text-red-600 bg-red-50 dark:bg-red-900/20' },
        ].map((s) => (
          <div key={s.label} className="rounded-3xl border border-app-border bg-app-card p-6 shadow-sm">
            <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center mb-2', s.tone)}>
              <s.icon className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{s.label}</p>
            <p className="text-3xl font-black text-app-text mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 p-1 rounded-2xl bg-app-bg border border-app-border">
        {(
          [
            ['level0', 'Level 0'],
            ['personal', 'Personal'],
            ['business', 'Business'],
            ['builder', 'Form Builder'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-label={`KYC sub-tab ${label}`}
            aria-current={sub === id ? 'true' : undefined}
            onClick={() => setSub(id)}
            className={cn(
              'flex-1 min-w-[100px] px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-colors',
              sub === id
                ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow'
                : 'text-neutral-500 hover:text-app-text',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {sub === 'builder' && <FormBuilder showSuccess={showSuccess} setNotification={setNotification} />}

      {sub === 'level0' && (
        <>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['', 'All'],
                ['emailMissing', 'Email missing'],
                ['phoneMissing', 'Phone missing'],
                ['addressMissing', 'Address missing'],
                ['complete', 'Complete'],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val || 'all'}
                type="button"
                aria-label={`Filter ${label}`}
                onClick={() =>
                  updateSp((n) => {
                    if (val) n.set('l0filter', val);
                    else n.delete('l0filter');
                  })
                }
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-bold border',
                  (l0Filter || '') === val
                    ? 'border-neutral-900 dark:border-white bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                    : 'border-app-border text-app-text hover:bg-app-bg',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <KycSimpleTable<Level0Row>
            columns={l0Columns}
            data={l0Rows}
            total={l0Total}
            page={l0Page}
            pageSize={l0PageSize}
            onPageChange={setL0Page}
            sort={null}
            onSortChange={() => {}}
            loading={loadingL0}
            rowKey={(r) => r.user.id}
            globalSearch={q}
            onGlobalSearchChange={(s) =>
              updateSp((n) => {
                if (s) n.set('q', s);
                else n.delete('q');
              })
            }
            serverSorted
          />
        </>
      )}

      {sub === 'personal' && (
        <>
          <div className="rounded-2xl border border-app-border bg-app-card p-4 space-y-4">
            <p className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Filters</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <fieldset className="rounded-xl border border-app-border bg-app-bg/60 p-3 min-h-[5.5rem]">
                <legend className="text-[10px] font-bold uppercase text-neutral-500 px-1">Status</legend>
                <div className="mt-2 flex flex-col gap-2">
                  {(['pending', 'approved', 'rejected', 'resubmit_requested'] as const).map((st) => (
                    <label key={st} className="flex items-center gap-2 text-xs text-app-text cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded border-app-border text-neutral-900 focus:ring-2 focus:ring-neutral-400 shrink-0"
                        checked={pStatusEff.includes(st)}
                        onChange={() => {
                          updateSp((n) => {
                            const next = new Set(pStatusEff);
                            if (next.has(st)) next.delete(st);
                            else next.add(st);
                            const arr = [...next];
                            if (arr.length) n.set('status', arr.join(','));
                            else n.delete('status');
                          });
                        }}
                      />
                      <span>{st.replace(/_/g, ' ')}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className="rounded-xl border border-app-border bg-app-bg/60 p-3 min-h-[5.5rem]">
                <legend className="text-[10px] font-bold uppercase text-neutral-500 px-1">AI recommendation</legend>
                <div className="mt-2 flex flex-col gap-2">
                  {(['approve', 'reject', 'manual_review', 'none'] as const).map((r) => (
                    <label key={r} className="flex items-center gap-2 text-xs text-app-text cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded border-app-border text-neutral-900 focus:ring-2 focus:ring-neutral-400 shrink-0"
                        checked={pAiRec.includes(r)}
                        onChange={() => {
                          updateSp((n) => {
                            const next = new Set(pAiRec);
                            if (next.has(r)) next.delete(r);
                            else next.add(r);
                            const arr = [...next];
                            if (arr.length) n.set('aiRec', arr.join(','));
                            else n.delete('aiRec');
                          });
                        }}
                      />
                      <span className="font-mono text-[11px]">{r}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className="rounded-xl border border-app-border bg-app-bg/60 p-3 min-h-[5.5rem]">
                <legend className="text-[10px] font-bold uppercase text-neutral-500 px-1">ID document type</legend>
                <div className="mt-2 flex flex-col gap-2">
                  {DOC_TYPES.map((dt) => (
                    <label key={dt} className="flex items-center gap-2 text-xs text-app-text cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded border-app-border text-neutral-900 focus:ring-2 focus:ring-neutral-400 shrink-0"
                        checked={pDocTypes.includes(dt)}
                        onChange={() => {
                          updateSp((n) => {
                            const next = new Set(pDocTypes);
                            if (next.has(dt)) next.delete(dt);
                            else next.add(dt);
                            const arr = [...next];
                            if (arr.length) n.set('docTypes', arr.join(','));
                            else n.delete('docTypes');
                          });
                        }}
                      />
                      <span className="font-mono text-[11px]">{dt}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className="rounded-xl border border-app-border bg-app-bg/60 p-3 min-h-[5.5rem]">
                <legend className="text-[10px] font-bold uppercase text-neutral-500 px-1">Submitted date</legend>
                <div className="mt-2 flex flex-col gap-2 text-xs">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] text-neutral-500">From</span>
                    <input
                      type="date"
                      value={pFrom}
                      onChange={(e) =>
                        updateSp((n) => {
                          if (e.target.value) n.set('subFrom', e.target.value);
                          else n.delete('subFrom');
                        })
                      }
                      className="rounded-lg border border-app-border bg-app-bg px-2 py-1.5 w-full"
                      aria-label="Submitted from date"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] text-neutral-500">To</span>
                    <input
                      type="date"
                      value={pTo}
                      onChange={(e) =>
                        updateSp((n) => {
                          if (e.target.value) n.set('subTo', e.target.value);
                          else n.delete('subTo');
                        })
                      }
                      className="rounded-lg border border-app-border bg-app-bg px-2 py-1.5 w-full"
                      aria-label="Submitted to date"
                    />
                  </label>
                </div>
              </fieldset>
            </div>
          </div>

          {canBulk && pSel.size > 0 && (
            <div className="flex flex-wrap gap-2 items-center rounded-xl border border-app-border bg-app-bg p-3">
              <span className="text-xs font-bold">{pSel.size} selected</span>
              <button
                type="button"
                aria-label="Bulk approve"
                className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold"
                onClick={() => {
                  setBSel(new Set());
                  setBulkOpen('approve');
                  setBulkNote('');
                }}
              >
                Approve
              </button>
              <button
                type="button"
                aria-label="Bulk reject"
                className="px-3 py-1 rounded-lg bg-red-100 text-red-800 text-xs font-bold"
                onClick={() => {
                  setBSel(new Set());
                  setBulkOpen('reject');
                  setBulkNote('');
                }}
              >
                Reject
              </button>
              <button
                type="button"
                aria-label="Bulk request resubmit"
                className="px-3 py-1 rounded-lg bg-violet-100 text-violet-800 text-xs font-bold"
                onClick={() => {
                  setBSel(new Set());
                  setBulkOpen('request_resubmit');
                  setBulkNote('');
                }}
              >
                Resubmit
              </button>
            </div>
          )}

          <KycSimpleTable<PersonalSubmissionRow>
            columns={personalColumns}
            data={pRows}
            total={pTotal}
            page={pPage}
            pageSize={pPageSize}
            onPageChange={setPPage}
            sort={pSort}
            onSortChange={setPSort}
            loading={loadingP}
            rowKey={(r) => r.id}
            onRowClick={(r) => setDrawer({ kind: 'personal', id: r.id })}
            globalSearch={pSearch}
            onGlobalSearchChange={(s) => {
              setPSearch(s);
              updateSp((n) => {
                if (s) n.set('q', s);
                else n.delete('q');
              });
            }}
            selectable={canBulk}
            selectedIds={pSel}
            onSelectionChange={setPSel}
            serverSorted
          />
        </>
      )}

      {sub === 'business' && (
        <>
          <div className="rounded-2xl border border-app-border bg-app-card p-4 space-y-4">
            <p className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Filters</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <fieldset className="rounded-xl border border-app-border bg-app-bg/60 p-3">
                <legend className="text-[10px] font-bold uppercase text-neutral-500 px-1">Status</legend>
                <div className="mt-2 flex flex-col gap-2">
                  {(['pending', 'approved', 'rejected', 'resubmit_requested'] as const).map((st) => (
                    <label key={st} className="flex items-center gap-2 text-xs text-app-text cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded border-app-border text-neutral-900 shrink-0"
                        checked={bStatusEff.includes(st)}
                        onChange={() => {
                          updateSp((n) => {
                            const next = new Set(bStatusEff);
                            if (next.has(st)) next.delete(st);
                            else next.add(st);
                            const arr = [...next];
                            if (arr.length) n.set('bStatus', arr.join(','));
                            else n.delete('bStatus');
                          });
                        }}
                      />
                      {st.replace(/_/g, ' ')}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className="rounded-xl border border-app-border bg-app-bg/60 p-3">
                <legend className="text-[10px] font-bold uppercase text-neutral-500 px-1">Schema version</legend>
                <div className="mt-2 flex flex-col gap-2">
                  {[1, 2, 3].map((v) => (
                    <label key={v} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded border-app-border shrink-0"
                        checked={bSchemaVers.includes(v)}
                        onChange={() => {
                          updateSp((n) => {
                            const next = new Set(bSchemaVers);
                            if (next.has(v)) next.delete(v);
                            else next.add(v);
                            const arr = [...next].sort();
                            if (arr.length) n.set('schemaVer', arr.join(','));
                            else n.delete('schemaVer');
                          });
                        }}
                      />
                      v{v}
                    </label>
                  ))}
                </div>
                <div className="mt-3 flex flex-col gap-2 border-t border-app-border pt-3">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-app-border shrink-0"
                      checked={bExpIssue}
                      onChange={() =>
                        updateSp((n) => {
                          if (!bExpIssue) n.set('expIssue', '1');
                          else n.delete('expIssue');
                        })
                      }
                    />
                    Has expiry issue
                  </label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-app-border shrink-0"
                      checked={bInqFail}
                      onChange={() =>
                        updateSp((n) => {
                          if (!bInqFail) n.set('inqFail', '1');
                          else n.delete('inqFail');
                        })
                      }
                    />
                    Has failed inquiry
                  </label>
                </div>
              </fieldset>
              <fieldset className="rounded-xl border border-app-border bg-app-bg/60 p-3">
                <legend className="text-[10px] font-bold uppercase text-neutral-500 px-1">Submitted date</legend>
                <div className="mt-2 flex flex-col gap-2 text-xs">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] text-neutral-500">From</span>
                    <input
                      type="date"
                      value={bFrom}
                      onChange={(e) =>
                        updateSp((n) => {
                          if (e.target.value) n.set('bSubFrom', e.target.value);
                          else n.delete('bSubFrom');
                        })
                      }
                      className="rounded-lg border border-app-border bg-app-bg px-2 py-1.5 w-full"
                      aria-label="Business submitted from"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] text-neutral-500">To</span>
                    <input
                      type="date"
                      value={bTo}
                      onChange={(e) =>
                        updateSp((n) => {
                          if (e.target.value) n.set('bSubTo', e.target.value);
                          else n.delete('bSubTo');
                        })
                      }
                      className="rounded-lg border border-app-border bg-app-bg px-2 py-1.5 w-full"
                      aria-label="Business submitted to"
                    />
                  </label>
                </div>
              </fieldset>
            </div>
          </div>

          {canBulk && bSel.size > 0 && (
            <div className="flex flex-wrap gap-2 items-center rounded-xl border border-app-border bg-app-bg p-3">
              <span className="text-xs font-bold">{bSel.size} selected</span>
              <button
                type="button"
                className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold"
                aria-label="Bulk approve business"
                onClick={() => {
                  setPSel(new Set());
                  setBulkOpen('approve');
                  setBulkNote('');
                }}
              >
                Approve
              </button>
              <button
                type="button"
                className="px-3 py-1 rounded-lg bg-red-100 text-red-800 text-xs font-bold"
                aria-label="Bulk reject business"
                onClick={() => {
                  setPSel(new Set());
                  setBulkOpen('reject');
                  setBulkNote('');
                }}
              >
                Reject
              </button>
              <button
                type="button"
                className="px-3 py-1 rounded-lg bg-violet-100 text-violet-800 text-xs font-bold"
                aria-label="Bulk request resubmit business"
                onClick={() => {
                  setPSel(new Set());
                  setBulkOpen('request_resubmit');
                  setBulkNote('');
                }}
              >
                Resubmit
              </button>
            </div>
          )}

          <KycSimpleTable<BusinessSubmissionRow>
            columns={businessColumns}
            data={bRows}
            total={bTotal}
            page={bPage}
            pageSize={bPageSize}
            onPageChange={setBPage}
            sort={bSort}
            onSortChange={setBSort}
            loading={loadingB}
            rowKey={(r) => r.id}
            onRowClick={(r) => setDrawer({ kind: 'business', id: r.id })}
            globalSearch={bSearch}
            onGlobalSearchChange={(s) => {
              setBSearch(s);
              updateSp((n) => {
                if (s) n.set('q', s);
                else n.delete('q');
              });
            }}
            selectable={canBulk}
            selectedIds={bSel}
            onSelectionChange={setBSel}
            serverSorted
          />
        </>
      )}

      {bulkOpen && canBulk && ((sub === 'personal' && pSel.size > 0) || (sub === 'business' && bSel.size > 0)) ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true">
          <div className="bg-app-card border border-app-border rounded-2xl p-6 max-w-md w-full space-y-3">
            <h4 className="font-bold text-app-text">Bulk {bulkOpen.replace(/_/g, ' ')}</h4>
            {bulkOpen !== 'approve' ? (
              <textarea
                value={bulkNote}
                onChange={(e) => setBulkNote(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-app-border bg-app-bg p-2 text-sm"
                placeholder="Note (min 10 chars)"
                aria-label="Bulk note"
              />
            ) : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-xl border border-app-border text-sm font-bold"
                onClick={() => {
                  setBulkOpen(null);
                  setBulkNote('');
                }}
                aria-label="Cancel bulk"
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-bold"
                onClick={() => {
                  if (sub === 'personal' && pSel.size) void runBulkPersonal(bulkOpen);
                  else if (sub === 'business' && bSel.size) void runBulkBusiness(bulkOpen);
                }}
                aria-label="Confirm bulk"
              >
                Run
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {ackModal ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true">
          <div className="bg-app-card border border-app-border rounded-2xl p-6 max-w-md w-full space-y-3">
            <h4 className="font-bold text-app-text">Acknowledge Level 0</h4>
            <textarea
              value={ackModal.note}
              onChange={(e) => setAckModal({ ...ackModal, note: e.target.value })}
              rows={3}
              className="w-full rounded-xl border border-app-border bg-app-bg p-2 text-sm"
              placeholder="Optional note"
              aria-label="Acknowledge note"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-xl border border-app-border text-sm font-bold"
                onClick={() => setAckModal(null)}
                aria-label="Cancel acknowledge"
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-bold"
                onClick={async () => {
                  try {
                    await acknowledgeLevel0(ackModal.userId, ackModal.note);
                    showSuccess('Level 0 acknowledged');
                    setAckModal(null);
                    await refreshL0();
                  } catch (e) {
                    setNotification({ show: true, message: e instanceof Error ? e.message : 'Failed', type: 'error' });
                    setTimeout(() => setNotification(null), 4000);
                  }
                }}
                aria-label="Submit acknowledge"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <KycReviewDrawer
        open={drawer}
        onClose={() => setDrawer(null)}
        onActionComplete={() => {
          void refreshP();
          void refreshB();
          void refreshL0();
          showSuccess('Updated');
        }}
      />
    </div>
  );
}
