import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from './AuthContext.js';
import { listMyWorkspaces, type WorkspaceListItem } from '../services/workspaces';

const LS_KEY = 'selectedWorkspaceId';

type WorkspaceContextValue = {
  workspaces: WorkspaceListItem[];
  activeWorkspaceId: string | null;
  setActiveWorkspace: (id: string) => void;
  loading: boolean;
  refresh: () => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function readPick(
  list: WorkspaceListItem[],
  searchParams: URLSearchParams,
  companyId: string | null
): string | null {
  if (!list.length) return null;
  const fromUrl = searchParams.get('workspaceId');
  if (fromUrl && list.some((w) => w.id === fromUrl)) {
    return fromUrl;
  }
  try {
    const ls = localStorage.getItem(LS_KEY);
    if (ls && list.some((w) => w.id === ls)) {
      return ls;
    }
  } catch {
    /* ignore */
  }
  if (companyId && list.some((w) => w.id === companyId)) {
    return companyId;
  }
  return list[0]!.id;
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [workspaces, setWorkspaces] = useState<WorkspaceListItem[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = ['owner', 'platform_admin', 'support', 'finance'].includes(user?.role || '');

  const persist = useCallback((id: string) => {
    try {
      localStorage.setItem(LS_KEY, id);
    } catch {
      /* ignore */
    }
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('workspaceId', id);
        return next;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  const fetchList = useCallback(async () => {
    if (!user || isAdmin) {
      setWorkspaces([]);
      setActiveWorkspaceId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await listMyWorkspaces();
      setWorkspaces(list);
    } catch {
      setWorkspaces([]);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    void fetchList();
  }, [user?.id, isAdmin, fetchList]);

  // After workspaces load (or URL changes), resolve active id once per meaningful change
  useEffect(() => {
    if (isAdmin) {
      setActiveWorkspaceId(null);
      return;
    }
    if (loading) return;
    if (!workspaces.length) {
      setActiveWorkspaceId(null);
      return;
    }

    const urlId = searchParams.get('workspaceId');
    if (urlId && workspaces.some((w) => w.id === urlId)) {
      if (urlId !== activeWorkspaceId) {
        setActiveWorkspaceId(urlId);
        try {
          localStorage.setItem(LS_KEY, urlId);
        } catch {
          /* ignore */
        }
      }
      return;
    }

    if (activeWorkspaceId && workspaces.some((w) => w.id === activeWorkspaceId)) {
      if (!urlId) {
        persist(activeWorkspaceId);
      }
      return;
    }

    const pick = readPick(workspaces, searchParams, user?.companyId ?? null);
    if (pick) {
      setActiveWorkspaceId(pick);
      persist(pick);
    }
  }, [loading, workspaces, isAdmin, user?.companyId, searchParams, activeWorkspaceId, persist]);

  const setActiveWorkspace = useCallback(
    (id: string) => {
      if (!workspaces.some((w) => w.id === id)) {
        return;
      }
      setActiveWorkspaceId(id);
      persist(id);
    },
    [workspaces, persist]
  );

  const value = useMemo(
    () => ({
      workspaces,
      activeWorkspaceId,
      setActiveWorkspace,
      loading,
      refresh: fetchList,
    }),
    [workspaces, activeWorkspaceId, setActiveWorkspace, loading, fetchList]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return ctx;
}
