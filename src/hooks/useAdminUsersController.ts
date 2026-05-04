import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchAdminUsers } from '../services/adminUsers';
import type { AdminUsersResponse } from '../../lib/adminUsersTypes';
import type { FilterValue, Sort } from '../components/crm/types';

export type UserSegment = 'all' | 'clients' | 'providers';

function parseSort(s: string | null): Sort | null {
  if (!s) return null;
  const m = s.match(/^([^:]+):(asc|desc)$/);
  if (!m) return null;
  return { id: m[1]!, dir: m[2] as 'asc' | 'desc' };
}

function encodeSort(s: Sort | null): string {
  if (!s) return '';
  return `${s.id}:${s.dir}`;
}

function fKeyForSegment(seg: UserSegment): 'fa' | 'fc' | 'fp' {
  if (seg === 'clients') return 'fc';
  if (seg === 'providers') return 'fp';
  return 'fa';
}

function readFiltersFromParams(
  usp: URLSearchParams,
  seg: UserSegment
): Record<string, FilterValue> {
  const k = fKeyForSegment(seg);
  const fParam = usp.get(k);
  if (!fParam) return {};
  try {
    return JSON.parse(decodeURIComponent(atob(fParam))) as Record<string, FilterValue>;
  } catch {
    return {};
  }
}

/** Map CRM column filters to flat API query (mirrors `buildAdminUserListOpts`). */
export function filtersToQueryParts(
  filters: Record<string, FilterValue>
): Record<string, string | string[] | undefined> {
  const q: Record<string, string | string[] | undefined> = {};
  const kycPersonal: string[] = [];
  const kycBusiness: string[] = [];
  for (const [col, fv] of Object.entries(filters)) {
    if (!fv) continue;
    if (fv.type === 'checkbox' && fv.values.length) {
      if (col === 'role' || col === 'status' || col === 'gender') {
        q[col] = [...fv.values];
      } else if (col === 'kyc.personal') {
        for (const x of fv.values) kycPersonal.push(x);
      } else if (col === 'kyc.business') {
        for (const x of fv.values) kycBusiness.push(x);
      } else {
        (q as Record<string, string>)[col] = fv.values.join(',');
      }
    }
    if (fv.type === 'boolean' && col === 'isVerified' && fv.value !== null) {
      q['isVerified'] = fv.value ? 'true' : 'false';
    }
    if (fv.type === 'text' && 'value' in fv && String(fv.value).trim()) {
      const t = String(fv.value).trim();
      if (col === 'phone') q.phone = t;
      if (col === 'address') q.address = t;
      if (col === 'lastDevice') q.lastDevice = t;
      if (col === 'lastIp') q.lastIp = t;
      if (col === 'ownedCompany' || col === 'ownedCo') q.ownedCompanyName = t;
    }
    if (fv.type === 'dateRange') {
      if (col === 'lastLoginAt') {
        if (fv.from) q.lastLoginFrom = fv.from;
        if (fv.to) q.lastLoginTo = fv.to;
      }
      if (col === 'createdAt') {
        if (fv.from) q.createdFrom = fv.from;
        if (fv.to) q.createdTo = fv.to;
      }
    }
  }
  if (kycPersonal.length) q['kycPersonal'] = [...new Set(kycPersonal)];
  if (kycBusiness.length) q['kycBusiness'] = [...new Set(kycBusiness)];
  return q;
}

function segmentFromParam(s: string | null): UserSegment {
  if (s === 'clients' || s === 'providers') return s;
  return 'all';
}

export function useAdminUsersController() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [response, setResponse] = useState<AdminUsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const segment = segmentFromParam(searchParams.get('segment'));
  const page = Math.max(1, Number(searchParams.get('page') || 1) || 1);
  const pageSize = [25, 50, 100, 200].includes(Number(searchParams.get('ps')))
    ? Number(searchParams.get('ps'))
    : 25;
  const globalSearch = searchParams.get('q') || '';
  const sort = useMemo(
    () => parseSort(searchParams.get('sort')),
    [searchParams]
  );
  const segmentForFilters = segmentFromParam(searchParams.get('segment'));
  const filters = useMemo(
    () => readFiltersFromParams(new URLSearchParams(searchParams), segmentForFilters),
    [searchParams, segmentForFilters]
  );

  const listQuery = useCallback((): Record<string, string | number | string[] | undefined> => {
    const sp = new URLSearchParams(searchParams);
    const s = parseSort(sp.get('sort'));
    const seg = segmentFromParam(sp.get('segment'));
    const f = readFiltersFromParams(sp, seg);
    const p = Math.max(1, Number(sp.get('page') || 1) || 1);
    const ps = [25, 50, 100, 200].includes(Number(sp.get('ps'))) ? Number(sp.get('ps')) : 25;
    const g = sp.get('q') || '';
    const part: Record<string, string | number | string[] | undefined> = {
      page: p,
      pageSize: ps,
    };
    if (s?.id) part.sortBy = s.id;
    if (s?.dir) part.sortDir = s.dir;
    if (g.trim()) part.q = g.trim();
    if (seg !== 'all') part.segment = seg;
    Object.assign(part, filtersToQueryParts(f));
    return part;
  }, [searchParams]);

  const doFetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const part = listQuery();
      const data = await fetchAdminUsers(part);
      setResponse(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setResponse(null);
    } finally {
      setLoading(false);
    }
  }, [listQuery]);

  useEffect(() => {
    if (tRef.current) clearTimeout(tRef.current);
    tRef.current = setTimeout(() => {
      void doFetch();
    }, 300);
    return () => {
      if (tRef.current) clearTimeout(tRef.current);
    };
  }, [searchParams, doFetch]);

  const setPage = (pn: number) => {
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        n.set('page', String(pn));
        return n;
      },
      { replace: true }
    );
  };
  const setPageSize = (ps: number) => {
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        n.set('ps', String(ps));
        n.set('page', '1');
        return n;
      },
      { replace: true }
    );
  };
  const setGlobalSearch = (g: string) => {
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        if (g.trim()) n.set('q', g);
        else n.delete('q');
        n.set('page', '1');
        return n;
      },
      { replace: true }
    );
  };
  const onSortChange = (s: Sort | null) => {
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        if (s) n.set('sort', encodeSort(s));
        else n.delete('sort');
        n.set('page', '1');
        return n;
      },
      { replace: true }
    );
  };
  const onFiltersChange = (next: Record<string, FilterValue>) => {
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        const curSeg = segmentFromParam(n.get('segment'));
        const fk = fKeyForSegment(curSeg);
        for (const key of ['fa', 'fc', 'fp'] as const) n.delete(key);
        if (Object.keys(next).length) {
          try {
            n.set(fk, btoa(encodeURIComponent(JSON.stringify(next))));
          } catch {
            /* */
          }
        }
        n.set('page', '1');
        return n;
      },
      { replace: true }
    );
  };
  const setSegment = (seg: UserSegment) => {
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        if (seg === 'all') n.delete('segment');
        else n.set('segment', seg);
        n.set('page', '1');
        return n;
      },
      { replace: true }
    );
  };

  return {
    data: response?.items ?? [],
    total: response?.total ?? 0,
    facets: response?.facets,
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
    refetch: doFetch,
  };
}
