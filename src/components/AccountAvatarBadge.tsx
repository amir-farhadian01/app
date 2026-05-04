import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import type { ApiUser } from '../lib/api';

function initialsFromUser(u: Pick<ApiUser, 'displayName' | 'firstName' | 'lastName' | 'email'>): string {
  const fn = u.firstName?.trim();
  const ln = u.lastName?.trim();
  if (fn && ln) return `${fn[0]!}${ln[0]!}`.toUpperCase();
  const d = u.displayName?.trim();
  if (d) {
    const parts = d.split(/\s+/).filter(Boolean);
    if (parts.length >= 2 && parts[0]![0] && parts[1]![0]) {
      return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
    }
    if (parts[0]?.length) return parts[0]!.slice(0, 2).toUpperCase();
  }
  const em = u.email?.trim();
  if (em && em.length >= 2) return em.slice(0, 2).toUpperCase();
  return '?';
}

export function accountProfileHref(user: ApiUser, role: string | null): string {
  const adminish = ['owner', 'platform_admin', 'support', 'finance'].includes(role || '');
  if (role === 'customer' || (!adminish && user.role === 'customer')) {
    return '/account?section=account';
  }
  return '/profile';
}

export interface AccountAvatarBadgeProps {
  user: ApiUser;
  role: string | null;
  className?: string;
  /** Pixel-ish size tier */
  size?: 'sm' | 'md';
}

/**
 * Circular framed account photo (or initials) for persistent top-bar identity.
 */
export function AccountAvatarBadge({ user, role, className, size = 'md' }: AccountAvatarBadgeProps) {
  const href = accountProfileHref(user, role);
  const label =
    user.displayName?.trim() ||
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
    user.email;
  const box = size === 'sm' ? 'h-9 w-9 min-h-9 min-w-9' : 'h-10 w-10 min-h-10 min-w-10';
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';

  return (
    <Link
      to={href}
      title={label}
      aria-label={`Account: ${label}`}
      className={cn(
        'shrink-0 rounded-full p-0.5 ring-2 ring-app-border bg-app-card shadow-sm',
        'hover:ring-neutral-400 dark:hover:ring-neutral-500 transition-[box-shadow,ring-color]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:focus-visible:outline-white',
        className
      )}
    >
      <span
        className={cn(
          'flex items-center justify-center rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-100 font-bold',
          box,
          textSize
        )}
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="select-none flex items-center justify-center w-full h-full">{initialsFromUser(user)}</span>
        )}
      </span>
    </Link>
  );
}
