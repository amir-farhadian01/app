import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listAll, getPackage, type AdminPackageListItem, type AdminPackageDetail } from '../../../services/adminServicePackages';
import { PackagesGlobalTable } from './PackagesGlobalTable';
import { PackageDetailDrawer } from './PackageDetailDrawer';

const DEBOUNCE_MS = 400;

type Props = {
  setNotification: (n: { show: boolean; message: string; type: 'success' | 'error' } | null) => void;
  showSuccess: (m: string) => void;
};

export function AdminServicePackagesSection({ setNotification, showSuccess }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const catalogFromUrl = searchParams.get('serviceCatalogId') || '';

  const [rows, setRows] = useState<AdminPackageListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);

  const [searchQ, setSearchQ] = useState('');
  const [qApplied, setQApplied] = useState('');

  const [workspaceFilter, setWorkspaceFilter] = useState('');
  const [serviceCatalogFilter, setServiceCatalogFilter] = useState(catalogFromUrl);
  const [bookingModes, setBookingModes] = useState<string[]>([]);
  const [isActive, setIsActive] = useState<boolean | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState<AdminPackageDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const packageIdFromUrl = searchParams.get('id') ?? '';

  useEffect(() => {
    setServiceCatalogFilter(catalogFromUrl);
  }, [catalogFromUrl]);

  useEffect(() => {
    if (!packageIdFromUrl) return;
    let cancelled = false;
    setDrawerOpen(true);
    setDetail(null);
    setDetailLoading(true);
    void (async () => {
      try {
        const d = await getPackage(packageIdFromUrl);
        if (!cancelled) setDetail(d);
      } catch (e) {
        if (!cancelled) {
          setNotification({
            show: true,
            message: e instanceof Error ? e.message : 'Load failed',
            type: 'error',
          });
          setTimeout(() => setNotification(null), 5000);
          setDrawerOpen(false);
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [packageIdFromUrl, setNotification]);

  useEffect(() => {
    const t = setTimeout(() => setQApplied(searchQ), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchQ]);

  const listParams = useMemo(
    () => ({
      page,
      pageSize,
      q: qApplied || undefined,
      workspaceId: workspaceFilter.trim() || undefined,
      serviceCatalogId: serviceCatalogFilter.trim() || undefined,
      bookingMode: bookingModes.length ? bookingModes : undefined,
      isActive: isActive ?? undefined,
    }),
    [page, pageSize, qApplied, workspaceFilter, serviceCatalogFilter, bookingModes, isActive]
  );

  useEffect(() => {
    setPage(1);
  }, [qApplied]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAll(listParams);
      setRows(res.items);
      setTotal(res.total);
    } catch (e) {
      setNotification({
        show: true,
        message: e instanceof Error ? e.message : 'Failed to load packages',
        type: 'error',
      });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setLoading(false);
    }
  }, [listParams, setNotification]);

  useEffect(() => {
    void load();
  }, [load]);

  const onApplyFilters = useCallback(() => {
    setPage(1);
    setLoading(true);
    void (async () => {
      try {
        const res = await listAll({ ...listParams, page: 1 });
        setRows(res.items);
        setTotal(res.total);
      } catch (e) {
        setNotification({
          show: true,
          message: e instanceof Error ? e.message : 'Failed to load packages',
          type: 'error',
        });
        setTimeout(() => setNotification(null), 5000);
      } finally {
        setLoading(false);
      }
    })();
  }, [listParams, setNotification]);

  const onRowOpen = (row: AdminPackageListItem) => {
    setDrawerOpen(true);
    setDetail(null);
    setDetailLoading(true);
    void (async () => {
      try {
        const d = await getPackage(row.id);
        setDetail(d);
      } catch (e) {
        setNotification({
          show: true,
          message: e instanceof Error ? e.message : 'Load failed',
          type: 'error',
        });
        setTimeout(() => setNotification(null), 5000);
        setDrawerOpen(false);
      } finally {
        setDetailLoading(false);
      }
    })();
  };

  const onForceArchive = (row: AdminPackageListItem) => {
    onRowOpen(row);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight text-app-text">Provider packages</h1>
        <p className="mt-1 text-sm text-neutral-500">All workspace packages, filters, and read-only detail.</p>
      </div>
      {catalogFromUrl && (
        <p className="text-xs text-neutral-500">
          Filtered by catalog ID:{' '}
          <code className="rounded bg-app-input px-1 py-0.5 font-mono text-app-text">{catalogFromUrl}</code>
          <button
            type="button"
            className="ml-2 text-sky-600 underline"
            onClick={() => {
              setServiceCatalogFilter('');
              setSearchParams((prev) => {
                const n = new URLSearchParams(prev);
                n.delete('serviceCatalogId');
                return n;
              });
            }}
          >
            Clear
          </button>
        </p>
      )}
      <PackagesGlobalTable
        rows={rows}
        total={total}
        loading={loading}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onRowOpen={onRowOpen}
        onForceArchive={onForceArchive}
        searchQ={searchQ}
        onSearchQChange={setSearchQ}
        workspaceFilter={workspaceFilter}
        serviceCatalogFilter={serviceCatalogFilter}
        onWorkspaceFilterChange={setWorkspaceFilter}
        onServiceCatalogFilterChange={setServiceCatalogFilter}
        bookingModes={bookingModes}
        onBookingModesChange={setBookingModes}
        isActive={isActive}
        onIsActiveChange={setIsActive}
        onApplyFilters={onApplyFilters}
      />
      <PackageDetailDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSearchParams((prev) => {
            const n = new URLSearchParams(prev);
            n.delete('id');
            return n;
          });
        }}
        row={detail}
        loading={detailLoading}
        onArchived={() => {
          showSuccess('Package archived');
          void load();
        }}
        showMessage={(m, t) => {
          if (t === 'success') showSuccess(m);
          else {
            setNotification({ show: true, message: m, type: 'error' });
            setTimeout(() => setNotification(null), 5000);
          }
        }}
      />
    </div>
  );
}
