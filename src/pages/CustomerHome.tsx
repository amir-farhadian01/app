import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Banknote,
  Building2,
  CalendarDays,
  Car,
  ChevronRight,
  HeartPulse,
  Home,
  Landmark,
  MapPin,
  Newspaper,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  Wrench,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';

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

type ProviderHighlight = {
  providerId: string;
  displayName: string;
  avatarUrl: string | null | undefined;
  serviceCount: number;
  topRating: number;
  sampleServiceId: string;
  score: number;
};

const MARKET_CATEGORIES = [
  { slug: 'home', label: 'Building', Icon: Building2 },
  { slug: 'automotive', label: 'Auto', Icon: Car },
  { slug: 'personal-care', label: 'Beauty', Icon: Sparkles },
  { slug: 'transport', label: 'Transport', Icon: Truck },
  { slug: 'health', label: 'Health', Icon: HeartPulse },
];

const PUBLIC_SERVICES = [
  { label: 'TD Bank', Icon: Banknote },
  { label: 'RBC', Icon: Banknote },
  { label: 'Scotiabank', Icon: Banknote },
  { label: 'Credit Score', Icon: Star },
  { label: 'Insurance', Icon: ShieldCheck },
  { label: 'ServiceOntario', Icon: Landmark },
  { label: 'OHIP', Icon: HeartPulse },
];

const LOCAL_NEWS = [
  { tone: 'blue', title: 'Construction rates up 12% this week in Vaughan', meta: '2h' },
  { tone: 'warn', title: 'Police alert: Traffic delay on Major Mackenzie Dr', meta: '45m' },
  { tone: 'green', title: 'Music Festival announced at Vaughan Mills - May 14', meta: '5h' },
  { tone: 'blue', title: 'New auto dealerships opening on Vaughan corridor', meta: '1d' },
  { tone: 'green', title: 'Leasing rates drop for commercial spaces in Woodbridge', meta: '2d' },
];

const LOCAL_EVENTS = [
  { title: 'Craft Festival', date: 'May 10 - Vaughan Mills', className: 'from-emerald-800 to-slate-950' },
  { title: 'Concert Night', date: 'May 14 - Club District', className: 'from-orange-800 to-slate-950' },
  { title: 'Auto Expo', date: 'May 18 - Convention Ctr', className: 'from-violet-800 to-slate-950' },
];

function picsumUrl(seed: string, w: number, h: number) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
}

function buildTopProviders(services: ServiceRow[]): ProviderHighlight[] {
  const byPid = new Map<string, ServiceRow[]>();
  for (const service of services) {
    if (!service.providerId) continue;
    byPid.set(service.providerId, [...(byPid.get(service.providerId) || []), service]);
  }

  const providers: ProviderHighlight[] = [];
  for (const [providerId, list] of byPid) {
    const best = list.reduce((a, b) => (Number(a.rating || 0) >= Number(b.rating || 0) ? a : b));
    providers.push({
      providerId,
      displayName: best.provider?.displayName || 'Local provider',
      avatarUrl: best.provider?.avatarUrl,
      serviceCount: list.length,
      topRating: Number(best.rating || 0),
      sampleServiceId: best.id,
      score: Number(best.rating || 0) + list.length * 0.01,
    });
  }

  return providers.sort((a, b) => b.score - a.score).slice(0, 8);
}

function slugifyCategory(raw: string | null | undefined): string {
  const value = (raw || '').trim().toLowerCase().replace(/\s+/g, '-');
  return value.replace(/[^a-z0-9-]/g, '') || 'services';
}

function orderParamsFromService(service: ServiceRow): string {
  const params = new URLSearchParams();
  params.set('from', 'direct');
  if (service.serviceCatalogId) params.set('serviceCatalogId', service.serviceCatalogId);
  params.set('homeCategory', slugifyCategory(service.category));
  if (service.providerId) params.set('prefillProviderId', service.providerId);
  return params.toString();
}

export default function CustomerHome() {
  const navigate = useNavigate();
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);

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

  const popular = useMemo(() => services.slice(0, 12), [services]);
  const topProviders = useMemo(() => buildTopProviders(services), [services]);

  const goCategoryOrder = useCallback(
    (slug: string) => {
      const params = new URLSearchParams();
      params.set('from', 'direct');
      params.set('homeCategory', slug);
      navigate(`/orders/new?${params.toString()}`);
    },
    [navigate],
  );

  const goOrderFromService = useCallback(
    (service: ServiceRow) => {
      navigate(`/orders/new?${orderParamsFromService(service)}`);
    },
    [navigate],
  );

  return (
    <div className="min-h-screen w-full bg-[#0d0f1a] pb-24 text-[#f0f2ff]">
      <section className="px-4 pt-4">
        <button
          type="button"
          onClick={() => navigate('/orders/new?from=direct')}
          className="group relative flex h-36 w-full overflow-hidden rounded-[1.15rem] bg-gradient-to-br from-[#1a3a80] to-[#07101f] text-left"
        >
          <img
            src={picsumUrl('central-park-vaughan', 900, 420)}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-45 transition duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/15 to-slate-950/80" />
          <div className="relative z-10 flex h-full flex-col justify-between p-4">
            <div className="flex w-fit max-w-full items-center gap-1.5 rounded-full bg-slate-950/45 px-3 py-1 text-[11px] font-bold text-blue-100 backdrop-blur">
              <MapPin className="h-3.5 w-3.5 shrink-0 fill-[#2b6eff] stroke-[#2b6eff]" />
              <span className="truncate">Vaughan, ON - Live Location</span>
            </div>
            <div>
            <span className="mb-2 inline-flex w-fit items-center rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold text-blue-100 backdrop-blur">
              Photo of the Week
            </span>
            <h2 className="text-xl font-black tracking-tight text-white">Central Park Vaughan</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold text-blue-100">13 C - Sunny</span>
              <span className="rounded-full bg-amber-400/20 px-3 py-1 text-[11px] font-semibold text-amber-300">Police Alert Active</span>
              <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold text-blue-100">3 Local News</span>
            </div>
            </div>
          </div>
        </button>
      </section>

      <section className="px-4 pt-4">
        <div className="rounded-[1.15rem] border border-[#2a2f4a] bg-[#1e2235] p-4">
          <button
            type="button"
            onClick={() => navigate('/orders/new?from=direct')}
            className="flex h-11 w-full items-center gap-3 rounded-xl border border-[#2a2f4a] bg-[#0d0f1a] px-4 text-left text-sm font-semibold text-[#8b90b0] transition hover:border-[#2b6eff] hover:text-white"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="truncate">Search services in Vaughan...</span>
          </button>

          <div className="mt-4 grid grid-cols-5 gap-2">
            {MARKET_CATEGORIES.map(({ slug, label, Icon }) => (
              <button
                key={slug}
                type="button"
                onClick={() => goCategoryOrder(slug)}
                className="group flex min-w-0 flex-col items-center gap-1.5"
              >
                <span className="flex h-12 w-full min-w-[44px] items-center justify-center rounded-xl border border-[#2a2f4a] bg-[#1a1d2e] text-[#8b90b0] transition group-hover:border-[#2b6eff] group-hover:bg-[#1a3f99]/50 group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="w-full truncate text-center text-[10px] font-semibold text-[#8b90b0]">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <SectionTitle icon={Landmark} title="Public & Government Services" />
      <div className="flex gap-2 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PUBLIC_SERVICES.map(({ label, Icon }) => (
          <button
            key={label}
            type="button"
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border border-[#2a2f4a] bg-[#1e2235] px-3 text-xs font-semibold text-[#8b90b0] transition hover:border-[#2b6eff] hover:text-white"
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      <SectionTitle icon={Wrench} title="Popular Services" action="Book" onAction={() => navigate('/orders/new?from=direct')} />
      <div className="min-h-[158px] px-4">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2a2f4a] border-t-[#2b6eff]" />
          </div>
        ) : !popular.length ? (
          <EmptyCard title="No public listings yet" description="Provider services will appear here as soon as they are published." />
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {popular.map((service) => (
              <button
                key={service.id}
                type="button"
                onClick={() => goOrderFromService(service)}
                className="w-36 shrink-0 text-left"
              >
                <div className="relative aspect-[7/5] overflow-hidden rounded-xl bg-[#1e2235]">
                  <img src={picsumUrl(service.id, 320, 230)} alt="" className="h-full w-full object-cover" loading="lazy" />
                  <span className="absolute left-2 top-2 rounded-full bg-slate-950/60 px-2 py-1 text-[10px] font-bold text-white backdrop-blur">
                    ${Number(service.price || 0).toFixed(0)}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-xs font-bold leading-snug text-white">{service.title}</p>
                <p className="mt-1 truncate text-[11px] font-semibold text-[#8b90b0]">{service.category || 'Local service'}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <SectionTitle icon={Newspaper} title="Local News" />
      <section className="space-y-2 px-4">
        {LOCAL_NEWS.map((item) => (
          <button
            key={item.title}
            type="button"
            className="flex w-full items-center gap-3 rounded-xl border border-transparent bg-[#1e2235] px-4 py-3 text-left transition hover:border-[#2a2f4a]"
          >
            <span
              className={cn(
                'h-2 w-2 shrink-0 rounded-full',
                item.tone === 'warn' ? 'bg-[#ffb800]' : item.tone === 'green' ? 'bg-[#0fc98a]' : 'bg-[#2b6eff]',
              )}
            />
            <span className="min-w-0 flex-1 text-xs font-semibold leading-5 text-white">{item.title}</span>
            <span className="shrink-0 text-[11px] font-semibold text-[#4a4f70]">{item.meta}</span>
          </button>
        ))}
      </section>

      <SectionTitle icon={CalendarDays} title="Local Events" />
      <section className="grid grid-cols-3 gap-2 px-4">
        {LOCAL_EVENTS.map((event) => (
          <button
            key={event.title}
            type="button"
            className={cn('flex h-24 min-w-0 flex-col justify-end rounded-xl bg-gradient-to-br p-3 text-left', event.className)}
          >
            <span className="truncate text-xs font-black text-white">{event.title}</span>
            <span className="mt-1 line-clamp-2 text-[10px] font-semibold leading-4 text-white/70">{event.date}</span>
          </button>
        ))}
      </section>

      <section className="px-4 pt-4">
        <div className="rounded-[1.15rem] border border-[#2a2f4a] bg-[#1e2235] p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#8b90b0]">Your Interaction Score</p>
              <p className="mt-1 text-3xl font-black tracking-tight text-[#0fc98a]">2,840 pts</p>
            </div>
            <div className="rounded-xl border border-[#2b6eff]/30 bg-[#2b6eff]/10 px-4 py-3 text-center">
              <p className="text-xl font-black text-[#2b6eff]">3.2 km</p>
              <p className="mt-1 text-[10px] font-semibold text-[#8b90b0]">Your Reach</p>
            </div>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#0d0f1a]">
            <div className="h-full w-[56%] rounded-full bg-gradient-to-r from-[#0fc98a] to-[#2b6eff]" />
          </div>
          <p className="mt-2 text-[11px] font-medium text-[#8b90b0]">
            Keep engaging to expand your neighborhood radius and reach more people.
          </p>
        </div>
      </section>

      <SectionTitle icon={Star} title="Top Providers" />
      <section className="px-4">
        {!loading && topProviders.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {topProviders.map((provider) => (
              <button
                key={provider.providerId}
                type="button"
                onClick={() => {
                  const service = services.find((item) => item.id === provider.sampleServiceId);
                  if (service) goOrderFromService(service);
                }}
                className="w-36 shrink-0 rounded-xl border border-[#2a2f4a] bg-[#1e2235] p-3 text-left transition hover:border-[#2b6eff]"
              >
                <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[#1a3f99] text-sm font-black text-blue-100">
                  {provider.avatarUrl ? <img src={provider.avatarUrl} alt="" className="h-full w-full object-cover" /> : provider.displayName[0]?.toUpperCase()}
                </div>
                <p className="mt-3 line-clamp-2 text-xs font-black leading-snug text-white">{provider.displayName}</p>
                <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-[#8b90b0]">
                  <span className="inline-flex items-center gap-1 text-amber-300">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    {provider.topRating.toFixed(1)}
                  </span>
                  <span>{provider.serviceCount} svc</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <EmptyCard title="Provider highlights are warming up" description="They will appear when services are listed." />
        )}
      </section>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  action,
  onAction,
}: {
  icon: typeof Home;
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-5">
      <div className="flex min-w-0 items-center gap-2 text-sm font-bold text-[#8b90b0]">
        <Icon className="h-4 w-4 shrink-0" />
        <h2 className="truncate">{title}</h2>
      </div>
      {action && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-1 text-xs font-black text-[#2b6eff]"
        >
          {action}
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function EmptyCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-[#2a2f4a] bg-[#1e2235] p-4">
      <p className="text-sm font-black text-white">{title}</p>
      <p className="mt-1 text-xs font-medium leading-5 text-[#8b90b0]">{description}</p>
    </div>
  );
}
