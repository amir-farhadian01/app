import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Loader2,
  Mail,
  Shield,
  UserCircle2,
  Users,
} from 'lucide-react';
import { useAuth } from '../../../lib/AuthContext.js';
import { useWorkspace } from '../../../lib/WorkspaceContext.js';
import { cn } from '../../../lib/utils.js';
import { listMembers, type WorkspaceMember } from '../../../services/workspaces.js';

const WORKSPACE_ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  staff: 'Staff',
  client: 'Client',
};

function labelWorkspaceRole(role: string): string {
  const known = WORKSPACE_ROLE_LABELS[role];
  if (known) return known;
  if (!role) return 'Member';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function formatPlatformRole(role: string): string {
  return role.replace(/_/g, ' ');
}

function memberDisplayName(m: WorkspaceMember): string {
  const u = m.user;
  if (u.displayName?.trim()) return u.displayName.trim();
  const fn = u.firstName?.trim() ?? '';
  const ln = u.lastName?.trim() ?? '';
  if (fn || ln) return `${fn} ${ln}`.trim();
  const local = u.email.split('@')[0];
  return local ?? u.email;
}

function formatJoinedAt(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
}

export function ProviderStaffSection() {
  const { user } = useAuth();
  const { activeWorkspaceId, loading: wsLoading } = useWorkspace();
  const [members, setMembers] = useState<WorkspaceMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeWorkspaceId) {
      setMembers(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await listMembers(activeWorkspaceId);
      setMembers(rows);
    } catch (e) {
      setMembers(null);
      setError(e instanceof Error ? e.message : 'Could not load team members');
    } finally {
      setLoading(false);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (wsLoading) return;
    void load();
  }, [load, wsLoading]);

  const focusRing =
    'focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:ring-offset-2';

  if (wsLoading || (loading && activeWorkspaceId)) {
    return (
      <div
        className="rounded-2xl border border-app-border bg-app-card p-10 flex flex-col items-center justify-center gap-3 text-neutral-500"
        aria-busy="true"
      >
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        <p className="text-sm font-medium">Loading team…</p>
      </div>
    );
  }

  if (!activeWorkspaceId) {
    return (
      <div className="rounded-2xl border border-app-border bg-app-card p-6 space-y-2" role="region">
        <h2 className="text-lg font-black text-app-text">Team</h2>
        <p className="text-sm text-neutral-500">
          Select a workspace from the switcher above to see who belongs to it.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-xl font-black tracking-tight text-app-text">Team</h2>
        <p className="text-sm text-neutral-500">
          People linked to this workspace. <span className="text-app-text/80">Workspace role</span> controls
          access inside the company; <span className="text-app-text/80">Account type</span> is the user&apos;s
          platform profile (for example provider vs customer).
        </p>
      </header>

      {error ? (
        <div
          className="rounded-2xl border border-red-500/40 bg-red-500/5 p-4 flex gap-3 items-start"
          role="alert"
        >
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" aria-hidden />
          <div>
            <p className="text-sm font-bold text-app-text">Could not load members</p>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className={cn(
                'mt-3 inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900',
                focusRing,
              )}
            >
              Try again
            </button>
          </div>
        </div>
      ) : null}

      <section
        className="rounded-2xl border border-app-border bg-app-card overflow-hidden"
        aria-labelledby="staff-list-heading"
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-app-border bg-app-bg/40">
          <Users className="h-4 w-4 text-neutral-500" aria-hidden />
          <h3 id="staff-list-heading" className="text-xs font-black uppercase tracking-widest text-app-text">
            Workspace members ({members?.length ?? 0})
          </h3>
        </div>
        {!members?.length && !error ? (
          <p className="p-6 text-sm text-neutral-500">No members returned for this workspace.</p>
        ) : members?.length ? (
          <ul className="divide-y divide-app-border">
            {members.map((m) => {
              const isYou = user?.id === m.userId;
              const initials = memberDisplayName(m)
                .split(/\s+/)
                .map((p) => p[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();
              return (
                <li key={m.userId} className="flex gap-3 p-4 items-start">
                  <div className="shrink-0">
                    {m.user.avatarUrl ? (
                      <img
                        src={m.user.avatarUrl}
                        alt=""
                        className="h-11 w-11 rounded-full object-cover border border-app-border"
                      />
                    ) : (
                      <div
                        className="h-11 w-11 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-xs font-black text-neutral-700 dark:text-neutral-200 border border-app-border"
                        aria-hidden
                      >
                        {initials || <UserCircle2 className="h-6 w-6 opacity-60" />}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-app-text truncate">{memberDisplayName(m)}</span>
                      {isYou ? (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
                          You
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-neutral-500 truncate">{m.user.email}</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30"
                        title="Role for this workspace (CompanyUser)"
                      >
                        <Shield className="h-3 w-3" aria-hidden />
                        {labelWorkspaceRole(m.role)}
                      </span>
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-lg bg-app-bg border border-app-border text-neutral-600 dark:text-neutral-400"
                        title="User.role on the platform"
                      >
                        Account: {formatPlatformRole(m.user.role)}
                      </span>
                      {m.user.status !== 'active' ? (
                        <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-lg bg-amber-500/15 text-amber-900 dark:text-amber-100 border border-amber-500/25">
                          {m.user.status}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[10px] text-neutral-400 pt-0.5">Joined {formatJoinedAt(m.joinedAt)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>

      <section
        className="rounded-2xl border border-dashed border-app-border bg-app-card/60 p-5 space-y-4"
        aria-labelledby="invite-heading"
      >
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-app-bg border border-app-border p-2">
            <Mail className="h-5 w-5 text-neutral-500" aria-hidden />
          </div>
          <div className="space-y-1 min-w-0">
            <h3 id="invite-heading" className="text-sm font-black text-app-text">
              Invite by email
            </h3>
            <p className="text-xs text-amber-800 dark:text-amber-200/90 font-medium">
              Not yet connected — outbound invites are not wired to an API in this release.
            </p>
            <p className="text-sm text-neutral-500">
              When invite flows ship, you will send a link from here. Until then, new teammates must be added
              through supported onboarding paths; they appear in the list once their account is linked to this
              workspace.
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <label htmlFor="staff-invite-email" className="sr-only">
            Email address for invite (disabled)
          </label>
          <input
            id="staff-invite-email"
            type="email"
            disabled
            placeholder="colleague@example.com"
            className="flex-1 rounded-xl border border-app-border bg-app-bg px-3 py-2.5 text-sm text-neutral-400 cursor-not-allowed"
            aria-describedby="invite-help"
          />
          <button
            type="button"
            disabled
            className="shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold border border-app-border bg-neutral-100 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed"
          >
            Send invite — not connected
          </button>
        </div>
        <p id="invite-help" className="text-[11px] text-neutral-500">
          Removing members or changing workspace roles from this screen is not available yet — server endpoints
          must enforce workspace owner/admin checks before those actions are exposed here.
        </p>
      </section>
    </div>
  );
}
