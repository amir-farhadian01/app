import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Car, Heart, Home, Laptop, LucideIcon, Plus, Search, Star, UserRound } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';

type ServiceRow = {
  id: string;
  providerId: string;
  serviceCatalogId?: string | null;
  title: string;
  category?: string | null;
  price: number;
  rating?: number | null;
  reviewsCount?: number | null;
  provider?: { id?: string; displayName?: string | null; avatarUrl?: string | null } | null;
};

/** Top-level marketplace groups; `homeCategory` matches OrderWizard deep-link resolution (slugified names). */
const SHOP_TOP_CATEGORIES: { slug: string; label: string; Icon: LucideIcon }[] = [
  { slug: 'automotive', label: 'Automotive', Icon: Car },
  { slug: 'home', label: 'Home', Icon: Home },
  { slug: 'personal-care', label: 'Personal Care', Icon: Heart },
  { slug: 'tech', label: 'Tech', Icon: Laptop },
];

type BannerSlide = {
  key: string;
  title: string;
  subtitle: string;
  cta: string;
  gradient: string;
  homeCategory: string;
  /** Use `topProviders[i].providerId` when present for `prefillProviderId`. */
  prefillProviderIndex: number;
  onCta: () => void;
};

function buildOrderNewDeepLink(homeCategory: string, prefillProviderId?: string | null): string {
  const p = new URLSearchParams();
  p.set('from', 'direct');
  p.set('homeCategory', homeCategory);
  if (prefillProviderId) p.set('prefillProviderId', prefillProviderId);
  return `/orders/new?${p.toString()}`;
}

function picsumUrl(seed: string, w: number, h: number) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
}

type ProviderHighlight = {
  providerId: string;
  displayName: string;
  avatarUrl: string | null | undefined;
  serviceCount: number;
  topRating: number;
  sampleServiceId: string;
  score: number;
};

function buildTopProviders(services: ServiceRow[]): ProviderHighlight[] {
  const byPid = new Map<string, ServiceRow[]>();
  for (const s of services) {
    if (!s.providerId) continue;
    const arr = byPid.get(s.providerId) || [];
    arr.push(s);
    byPid.set(s.providerId, arr);
  }
  const out: ProviderHighlight[] = [];
  for (const [providerId, list] of byPid) {
    if (!list.length) continue;
    const best = list.reduce((a, b) => (Number(a.rating || 0) >= Number(b.rating || 0) ? a : b));
    const p = best.provider;
    const name = p?.displayName || 'Provider';
    const topRating = Number(best.rating || 0);
    out.push({
      providerId,
      displayName: name,
      avatarUrl: p?.avatarUrl,
      serviceCount: list.length,
      topRating,
      sampleServiceId: best.id,
      score: topRating + list.length * 0.01,
    });
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, 12);
}

function slugifyCategory(raw: string | null | undefined): string {
  const t = (raw || '').trim().toLowerCase().replace(/\s+/g, '-');
  return t.replace(/[^a-z0-9-]/g, '') || 'services';
}

function orderParamsFromService(s: ServiceRow): string {
  const p = new URLSearchParams();
  p.set('from', 'direct');
  if (s.serviceCatalogId) p.set('serviceCatalogId', s.serviceCatalogId);
  p.set('homeCategory', slugifyCategory(s.category));
  if (s.providerId) p.set('prefillProviderId', s.providerId);
  return p.toString();
}

function initialsFromUser(displayName: string | null | undefined, email: string | undefined): string {
  const n = (displayName || '').trim();
  if (n.length) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
    return n.slice(0, 2).toUpperCase();
  }
  const e = (email || '').trim();
  if (e.length) return e.slice(0, 2).toUpperCase();
  return '?';
}

export default function CustomerHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [bannerIndex, setBannerIndex] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.get<ServiceRow[]>('/api/services');
      setServices(Array.isArray(list) ? list : []);
    } catch {
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setBannerIndex((i) => (i + 1) % 3);
    }, 6000);
    return () => window.clearInterval(id);
  }, []);

  const topProviders = useMemo(() => buildTopProviders(services), [services]);

  const goOrderFromService = useCallback(
    (s: ServiceRow) => {
      navigate(`/orders/new?${orderParamsFromService(s)}`);
    },
    [navigate],
  );

  const goCategoryOrder = useCallback(
    (slug: string) => {
      const p = new URLSearchParams();
      p.set('from', 'direct');
      p.set('homeCategory', slug);
      navigate(`/orders/new?${p.toString()}`);
    },
    [navigate],
  );

  const slides: BannerSlide[] = useMemo(() => {
    const prefillId = (i: number) => topProviders[i]?.providerId ?? null;
    const go = (homeCategory: string, prefillIdx: number) => {
      navigate(buildOrderNewDeepLink(homeCategory, prefillId(prefillIdx)));
    };
    return [
      {
        key: 'banner-home',
        title: 'Trusted help nearby',
        subtitle: 'Book vetted local pros for home repairs, cleaning, and more.',
        cta: 'Start a booking',
        gradient: 'from-blue-600 to-blue-800 dark:from-slate-800 dark:to-slate-950',
        homeCategory: 'home',
        prefillProviderIndex: 0,
        onCta: () => go('home', 0),
      },
      {
        key: 'banner-auto',
        title: 'Keep your vehicle ready',
        subtitle: 'Maintenance and fixes from providers near you.',
        cta: 'Book automotive help',
        gradient: 'from-violet-600 to-violet-900 dark:from-violet-950 dark:to-slate-950',
        homeCategory: 'automotive',
        prefillProviderIndex: 1,
        onCta: () => go('automotive', 1),
      },
      {
        key: 'banner-personal-tech',
        title: 'Personal care & tech',
        subtitle: 'Wellness, grooming, and help with devices and setup.',
        cta: 'Explore services',
        gradient: 'from-teal-600 to-teal-900 dark:from-teal-950 dark:to-slate-950',
        homeCategory: 'personal-care',
        prefillProviderIndex: 2,
        onCta: () => go('personal-care', 2),
      },
    ];
  }, [navigate, topProviders]);

  const popular = services.slice(0, 20);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-28 pt-3 sm:px-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          to={user ? '/account' : '/auth'}
          className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-app-border bg-app-card text-neutral-500 transition hover:border-neutral-400"
          aria-label={user ? 'Account' : 'Sign in'}
        >
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : user ? (
            <span className="text-sm font-extrabold text-app-text">{initialsFromUser(user.displayName, user.email)}</span>
          ) : (
            <UserRound className="h-6 w-6 stroke-[1.75]" aria-hidden />
          )}
        </Link>
        <button
          type="button"
          onClick={() => navigate('/orders/new?from=direct&newOffer=1')}
          className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full border border-app-border bg-app-card text-app-text shadow-sm transition hover:bg-neutral-50 dark:hover:bg-neutral-800/80"
          aria-label="New offer"
          title="New offer"
        >
          <Plus className="h-6 w-6" strokeWidth={2.5} />
        </button>
      </div>

      {/* Search pill */}
      <button
        type="button"
        onClick={() => navigate('/orders/new?from=direct')}
        className="flex h-12 w-full min-h-[44px] items-center gap-3 rounded-full border border-app-border bg-app-card px-4 text-left shadow-md shadow-neutral-900/5 transition hover:border-neutral-300 dark:hover:border-neutral-600"
      >
        <Search className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
        <span className="truncate text-sm font-medium text-neutral-500 dark:text-neutral-400">
          Try &quot;deck repair&quot; or &quot;deep clean&quot;
        </span>
      </button>

      {/* Banner carousel */}
      <div className="mt-5">
        <div className="relative aspect-[16/9] overflow-hidden rounded-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={slides[bannerIndex].key}
              role="link"
              tabIndex={0}
              aria-label={`${slides[bannerIndex].title}: ${slides[bannerIndex].cta}`}
              onClick={() => slides[bannerIndex].onCta()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  slides[bannerIndex].onCta();
                }
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className={cn(
                'absolute inset-0 cursor-pointer bg-gradient-to-br p-5 sm:p-6 flex flex-col justify-end',
                slides[bannerIndex].gradient,
              )}
            >
              <div className="max-w-[90%] space-y-2">
                <h2 className="text-xl font-extrabold leading-tight text-white sm:text-2xl">{slides[bannerIndex].title}</h2>
                <p className="text-sm font-medium leading-relaxed text-white/90">{slides[bannerIndex].subtitle}</p>
                <span
                  className="mt-2 inline-flex min-h-[44px] cursor-pointer items-center rounded-full bg-white px-4 py-2.5 text-sm font-extrabold text-neutral-900 shadow-sm pointer-events-none"
                >
                  {slides[bannerIndex].cta}
                </span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="mt-3 flex justify-center gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.key}
              type="button"
              aria-label={`Banner ${i + 1}`}
              onClick={() => setBannerIndex(i)}
              className={cn(
                'min-h-[44px] min-w-[44px] flex items-center justify-center',
              )}
            >
              <span
                className={cn(
                  'h-1.5 rounded-full transition-all block',
                  i === bannerIndex ? 'w-5 bg-blue-600 dark:bg-blue-400' : 'w-1.5 bg-neutral-300 dark:bg-neutral-600',
                )}
              />
            </button>
          ))}
        </div>
      </div>

      <h2 className="mt-8 text-base font-extrabold text-app-text">Browse by category</h2>
      <div className="mt-3 grid grid-cols-4 gap-2 sm:gap-3">
        {SHOP_TOP_CATEGORIES.map((c) => (
          <button
            key={c.slug}
            type="button"
            onClick={() => goCategoryOrder(c.slug)}
            className="flex min-h-[44px] flex-col items-center gap-1.5 text-center"
          >
            <span className="flex h-14 w-14 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-blue-100 text-blue-900 dark:bg-blue-950/80 dark:text-blue-100">
              <c.Icon className="h-6 w-6" aria-hidden />
            </span>
            <span className="line-clamp-2 w-full text-[10px] font-bold leading-tight text-app-text sm:text-[11px]">
              {c.label}
            </span>
          </button>
        ))}
      </div>

      <h2 className="mt-8 text-base font-extrabold text-app-text">Popular services</h2>
      <div className="mt-3 h-[168px]">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-800 dark:border-neutral-700 dark:border-t-white" />
          </div>
        ) : !popular.length ? (
          <p className="text-sm font-semibold text-neutral-500">No public listings yet. Check back soon.</p>
        ) : (
          <div className="flex h-full gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {popular.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => goOrderFromService(s)}
                className="flex w-[140px] shrink-0 flex-col text-left"
              >
                <div className="relative aspect-[280/200] w-full overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800">
                  <img
                    src={picsumUrl(s.id, 280, 200)}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <p className="mt-1.5 line-clamp-2 text-xs font-bold leading-snug text-app-text">{s.title}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <h2 className="mt-8 text-base font-extrabold text-app-text">Top providers</h2>
      <div className="mt-3 min-h-[132px]">
        {loading ? null : !topProviders.length ? (
          <p className="text-sm font-semibold text-neutral-500">
            Provider highlights will appear when services are listed.
          </p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {topProviders.map((p) => (
              <button
                key={p.providerId}
                type="button"
                onClick={() => {
                  const s = services.find((x) => x.id === p.sampleServiceId);
                  if (s) goOrderFromService(s);
                }}
                className="flex w-[148px] shrink-0 flex-col rounded-xl border border-app-border bg-app-card p-3 text-left transition hover:border-neutral-300 dark:hover:border-neutral-600"
              >
                <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-neutral-100 text-sm font-extrabold dark:bg-neutral-800">
                  {p.avatarUrl ? (
                    <img src={p.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (p.displayName[0] || '?').toUpperCase()
                  )}
                </div>
                <p className="mt-2 line-clamp-2 text-[13px] font-extrabold leading-tight text-app-text">{p.displayName}</p>
                <div className="mt-auto flex items-center justify-between pt-2 text-xs">
                  <span className="flex items-center gap-1 font-bold">
                    <Star className="h-3.5 w-3.5 text-amber-500" />
                    {p.topRating.toFixed(1)}
                  </span>
                  <span className="font-semibold text-neutral-500">{p.serviceCount} svc</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
