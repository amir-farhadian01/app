import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/api';
import { handleApiError, OperationType } from '../lib/errors';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  Bookmark,
  BriefcaseBusiness,
  Check,
  ClipboardList,
  ArrowRight,
  Heart,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  X,
  Loader2,
} from 'lucide-react';
import { cn } from '../lib/utils';

const LS_EXPLORER_SAVED = 'neighborly_explorer_saved_post_ids_v1';

function formatEngagementCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}K`;
  if (n >= 1_000) {
    const v = n / 1_000;
    return Number.isInteger(v) ? `${v}K` : `${v.toFixed(1)}K`;
  }
  return String(n);
}

export default function Services() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'feed'>('feed');
  const [activeTab, setActiveTab] = useState<'explorer' | 'business'>('explorer');
  const [searchSettingsOpen, setSearchSettingsOpen] = useState(false);
  const [radiusKm, setRadiusKm] = useState(3.2);
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [sortMode, setSortMode] = useState<'nearby' | 'latest' | 'popular'>('nearby');
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set());

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const storyItems = useMemo(() => {
    const unique = new Map<string, any>();
    for (const post of posts) {
      if (!post.providerName) continue;
      if (!unique.has(post.providerName)) unique.set(post.providerName, post);
      if (unique.size >= 8) break;
    }
    const fallback = ['AutoFix', 'BeautyX', 'GreenBuild', 'FoodHub', 'TaxPros', 'MoveIt'];
    if (unique.size) return [...unique.values()];
    return fallback.map((name, index) => ({ id: `fallback-${name}`, providerName: name, seen: index > 2 }));
  }, [posts]);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_EXPLORER_SAVED);
      if (raw) setSavedIds(new Set(raw.split(',').filter(Boolean)));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const v = searchParams.get('view');
    if (v === 'grid' || v === 'feed') setViewMode(v);
  }, [searchParams]);

  useEffect(() => {
    const id = searchParams.get('post');
    if (!id || loading) return;
    const t = window.setTimeout(() => {
      document.getElementById(`explorer-post-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
    return () => window.clearTimeout(t);
  }, [loading, searchParams, posts]);

  useEffect(() => {
    if (user?.role) setUserRole(user.role);

    let cancelled = false;
    const tick = async () => {
      try {
        const results = await api.get<any[]>('/api/posts');
        if (cancelled) return;
        setPosts(
          (results || []).map((p) => ({
            ...p,
            providerName: p.provider?.displayName || 'Provider',
          })),
        );
      } catch (e) {
        await handleApiError(e, OperationType.LIST, 'posts');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    tick();
    const id = setInterval(tick, 12000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [user?.role]);

  const goToPostContext = (post: any) => {
    const cid = post.provider?.companyId;
    if (cid) navigate(`/c/${cid}`);
    else navigate('/services');
  };

  const isVideoUrl = (url?: string) => /\.(mp4|webm|mov|m4v|ogg)$/i.test(url || "");
  const [brokenMedia, setBrokenMedia] = useState<Record<string, boolean>>({});

  const filteredPosts = posts.filter((post) => {
    const providerFilter = searchParams.get('provider');
    const providerMatches = !providerFilter || String(post.provider?.id || '') === providerFilter;
    const matchesSearch =
      !searchTerm ||
      post.caption?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.providerName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch && providerMatches;
  }).sort((a, b) => {
    if (sortMode === 'latest') {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }
    if (sortMode === 'popular') {
      const aScore = Number(a.likeCount ?? a.likes?.length ?? 0) + Number(a.commentCount ?? a.comments?.length ?? 0);
      const bScore = Number(b.likeCount ?? b.likes?.length ?? 0) + Number(b.commentCount ?? b.comments?.length ?? 0);
      return bScore - aScore;
    }
    return 0;
  });

  const buildExplorerAuthReturn = (opts: { postId?: string }) => {
    const p = new URLSearchParams();
    p.set('view', viewMode);
    if (opts.postId) p.set('post', opts.postId);
    return `${location.pathname}?${p.toString()}`;
  };

  const goAuthResumeExplorer = (opts: { postId?: string }) => {
    navigate('/auth', { state: { returnTo: buildExplorerAuthReturn(opts) } });
  };

  const openProviderExplorer = (post: any) => {
    const pid = String(post?.provider?.id || '');
    if (!pid) return;
    const qp = new URLSearchParams();
    qp.set('provider', pid);
    qp.set('view', viewMode);
    navigate(`/services?${qp.toString()}`);
  };

  const openProviderBusiness = (post: any) => {
    const cid = String(post?.provider?.companyId || '');
    if (cid) {
      navigate(`/c/${encodeURIComponent(cid)}`);
      return;
    }
    openProviderExplorer(post);
  };

  const persistSaved = (next: Set<string>) => {
    try {
      localStorage.setItem(LS_EXPLORER_SAVED, [...next].join(','));
    } catch {
      /* ignore */
    }
  };

  const toggleSave = (postId: string) => {
    setSavedIds((prev) => {
      const n = new Set(prev);
      if (n.has(postId)) n.delete(postId);
      else n.add(postId);
      persistSaved(n);
      return n;
    });
  };

  const toggleLike = async (post: any) => {
    if (!user) {
      goAuthResumeExplorer({ postId: String(post.id) });
      return;
    }
    try {
      const updated = await api.post<any>(`/api/posts/${post.id}/like`, {});
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, ...updated, providerName: p.providerName } : p)));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not update like';
      showNotification(msg, 'error');
    }
  };

  const copyShareLink = (postId: string) => {
    const link = `${window.location.origin}/services?post=${encodeURIComponent(postId)}`;
    void navigator.clipboard.writeText(link).then(
      () => showNotification('Link copied'),
      () => showNotification('Could not copy link', 'error'),
    );
  };

  const goOrderFromPost = async (post: any) => {
    if (!user) {
      goAuthResumeExplorer({ postId: String(post.id) });
      return;
    }
    const pid = post.provider?.id as string | undefined;
    if (!pid) {
      navigate('/orders/new?from=explorer');
      return;
    }
    try {
      const services = await api.get<any[]>(`/api/services?providerId=${encodeURIComponent(pid)}`);
      const first = (services || []).find((s) => s?.serviceCatalogId);
      if (first?.serviceCatalogId) {
        navigate(
          `/orders/new?from=explorer&serviceCatalogId=${encodeURIComponent(first.serviceCatalogId)}`,
        );
      } else {
        navigate('/orders/new?from=explorer');
      }
    } catch {
      navigate('/orders/new?from=explorer');
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 pb-28 text-[#f0f2ff]">
      <header className="sticky top-16 z-40 border-b border-[#2a2f4a] bg-[#0d0f1a]/95 backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="px-4 pt-3">
            <p className="flex items-center gap-1.5 text-xs font-bold text-[#2b6eff]">
              <MapPin className="h-3.5 w-3.5" />
              Vaughan, ON
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Explorer</h1>
          </div>
        </div>

        <div className="flex border-b border-[#2a2f4a]">
          <button
            type="button"
            onClick={() => setActiveTab('explorer')}
            className={cn(
              'min-h-[44px] flex-1 border-b-2 px-4 text-sm font-bold transition',
              activeTab === 'explorer' ? 'border-[#2b6eff] text-[#2b6eff]' : 'border-transparent text-[#4a4f70]',
            )}
          >
            Explorer
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('business')}
            className={cn(
              'min-h-[44px] flex-1 border-b-2 px-4 text-sm font-bold transition',
              activeTab === 'business' ? 'border-[#2b6eff] text-[#2b6eff]' : 'border-transparent text-[#4a4f70]',
            )}
          >
            Business Hub
          </button>
        </div>

        <div className="relative flex items-center gap-8 px-4 py-3">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4a4f70]" strokeWidth={2} />
            <input
              type="text"
              placeholder="AI search in Vaughan, ON..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-11 w-full rounded-xl border border-[#2a2f4a] bg-[#1e2235] pl-9 pr-[112px] text-[13px] font-semibold text-white outline-none placeholder:text-[#4a4f70] focus:border-[#2b6eff]"
            />
            <span className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-md bg-[#2b6eff]/15 px-2 py-1 text-[10px] font-bold text-[#2b6eff] min-[390px]:inline-flex">
              Vaughan ON
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSearchSettingsOpen((open) => !open)}
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-[#1e2235] transition',
              searchSettingsOpen ? 'border-[#2b6eff] text-[#2b6eff]' : 'border-[#2a2f4a] text-[#8b90b0]',
            )}
            aria-label="Search settings"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>

          {searchSettingsOpen && (
            <div className="absolute right-4 top-[62px] z-50 w-[min(336px,calc(100vw-2rem))] rounded-2xl border border-[#2a2f4a] bg-[#131624] p-4 shadow-2xl shadow-black/40">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-white">Search settings</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-[#4a4f70]">Tune what appears in Explorer.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSearchSettingsOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2a2f4a] text-[#8b90b0]"
                  aria-label="Close search settings"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#8b90b0]">Radius</span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.1"
                  value={radiusKm}
                  onChange={(event) => setRadiusKm(Number(event.target.value))}
                  className="mt-3 w-full accent-[#2b6eff]"
                />
                <div className="mt-1 flex items-center justify-between text-[11px] font-semibold text-[#4a4f70]">
                  <span>1 km</span>
                  <span className="text-[#2b6eff]">{radiusKm.toFixed(1)} km reach</span>
                  <span>10 km</span>
                </div>
              </label>

              <div className="mt-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#8b90b0]">Sort by</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {[
                    ['nearby', 'Nearby'],
                    ['latest', 'Latest'],
                    ['popular', 'Popular'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSortMode(value as typeof sortMode)}
                      className={cn(
                        'min-h-[38px] rounded-xl border text-xs font-bold',
                        sortMode === value ? 'border-[#2b6eff] bg-[#2b6eff]/15 text-[#2b6eff]' : 'border-[#2a2f4a] text-[#8b90b0]',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setVerifiedOnly((value) => !value)}
                className="mt-4 flex w-full items-center justify-between rounded-xl border border-[#2a2f4a] bg-[#1a1d2e] px-3 py-3 text-left"
              >
                <span>
                  <span className="block text-sm font-bold text-white">Verified providers only</span>
                  <span className="mt-0.5 block text-[11px] font-semibold text-[#4a4f70]">Prioritize insured and reviewed businesses.</span>
                </span>
                <span className={cn('flex h-6 w-6 items-center justify-center rounded-full border', verifiedOnly ? 'border-[#0fc98a] bg-[#0fc98a] text-[#0d0f1a]' : 'border-[#2a2f4a] text-transparent')}>
                  <Check className="h-4 w-4" />
                </span>
              </button>
            </div>
          )}
        </div>
      </header>

      <section className="flex gap-3 overflow-x-auto px-4 pb-1 pt-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {storyItems.map((story, index) => {
          const seen = Boolean(story.seen) || index > 2;
          return (
            <button key={story.id || story.providerName} type="button" className="w-[64px] shrink-0 text-center">
              <span className={cn('mx-auto flex h-[60px] w-[60px] rounded-full p-[2.5px]', seen ? 'bg-[#2a2f4a]' : 'bg-gradient-to-br from-[#2b6eff] to-[#ff7a2b]')}>
                <span className="flex h-full w-full items-center justify-center rounded-full bg-[#242840] text-lg font-black text-[#2b6eff]">
                  {(story.providerName?.[0] || 'N').toUpperCase()}
                </span>
              </span>
              <span className="mt-1 block truncate text-[10px] font-semibold text-[#8b90b0]">{story.providerName}</span>
            </button>
          );
        })}
      </section>

      {activeTab === 'business' && (
        <section className="mx-4 rounded-[1.15rem] border border-[#2a2f4a] bg-[#1e2235] p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2b6eff]/15 text-[#2b6eff]">
              <BriefcaseBusiness className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-black text-white">Business Hub</p>
              <p className="mt-0.5 text-xs font-semibold text-[#8b90b0]">Provider profiles, packages, reviews, and inventory cards live here.</p>
            </div>
          </div>
        </section>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center space-y-4 py-20">
          <Loader2 className="h-10 w-10 animate-spin text-[#2b6eff]" />
          <p className="text-xs font-bold uppercase tracking-widest text-[#8b90b0]">Loading local posts...</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="mx-4 space-y-6 rounded-[1.15rem] border border-[#2a2f4a] bg-[#1e2235] py-20 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#1a1d2e]">
            <Search className="h-10 w-10 text-[#4a4f70]" />
          </div>
          <div className="space-y-2">
            <p className="text-xl font-black text-white">No matches found</p>
            <p className="mx-auto max-w-xs text-xs font-semibold leading-5 text-[#8b90b0]">Try another service, provider, or nearby keyword.</p>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-2">
            {filteredPosts.map((post, idx) => (
                <motion.div
                    id={`explorer-post-${post.id}`}
                    key={post.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group overflow-hidden rounded-[1.15rem] border border-[#2a2f4a] bg-[#1e2235] transition-all hover:border-[#2b6eff]"
                >
                    <div className="relative aspect-[4/5] overflow-hidden">
                        {brokenMedia[post.id] ? (
                          <img
                            src={`https://picsum.photos/seed/fallback-${post.id}/800/1000`}
                            alt=""
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                            referrerPolicy="no-referrer"
                          />
                        ) : isVideoUrl(post.imageUrl) ? (
                          <video
                            src={post.imageUrl}
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                            controls
                            preload="metadata"
                            onError={() => setBrokenMedia((m) => ({ ...m, [post.id]: true }))}
                          />
                        ) : (
                          <img
                            src={post.imageUrl || `https://picsum.photos/seed/${post.id}/800/1000`}
                            alt=""
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                            referrerPolicy="no-referrer"
                            onError={() => setBrokenMedia((m) => ({ ...m, [post.id]: true }))}
                          />
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-3">
                            <div className="mb-2 flex items-center gap-2">
                                <span className="rounded-full bg-white/15 px-2 py-1 text-[9px] font-bold text-white backdrop-blur">Verified</span>
                                <div className="flex items-center gap-0.5">
                                    {[1,2,3,4,5].map(i => <Star key={i} className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />)}
                                </div>
                            </div>
                            <h3 className="line-clamp-2 text-sm font-black leading-tight text-white">{(post.caption || '').slice(0, 60)}{(post.caption || '').length > 60 && '...'}</h3>
                        </div>
                        <button 
                            onClick={() => (!user ? goAuthResumeExplorer({ postId: String(post.id) }) : undefined)}
                            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-xl bg-black/30 text-white backdrop-blur-md transition"
                        >
                            <Heart className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="flex items-center justify-between gap-2 p-3">
                        <div className="flex min-w-0 items-center gap-2">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#2b6eff]/30 bg-[#1a3f99] text-sm font-black text-blue-100">
                                {post.providerName?.[0] || 'P'}
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-xs font-black text-white">{post.providerName}</p>
                                <div className="flex items-center gap-1 text-[10px] font-semibold text-[#8b90b0]">
                                    <MapPin className="h-3 w-3" />
                                    <span>2.4 km away</span>
                                </div>
                            </div>
                        </div>
                        <button 
                            type="button"
                            onClick={() => goToPostContext(post)}
                            className="group/btn flex shrink-0 items-center gap-1 text-[10px] font-black text-[#2b6eff]"
                        >
                            View
                            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-1" />
                        </button>
                    </div>
                </motion.div>
            ))}
        </div>
      ) : (
        <div className="mx-auto max-w-[468px] space-y-4 px-4">
          {filteredPosts.map((post) => {
            const isLiked = Array.isArray(post.likes) && user?.id && post.likes.includes(user.id);
            const likeCount = typeof post.likeCount === 'number' ? post.likeCount : (post.likes?.length ?? 0);
            const commentCount = typeof post.commentCount === 'number' ? post.commentCount : (post.comments?.length ?? 0);
            const orderCount = typeof post.orderCount === 'number' ? post.orderCount : 0;
            const shareCount = typeof post.shareCount === 'number' ? post.shareCount : 0;
            const saved = savedIds.has(post.id);
            return (
              <motion.article
                id={`explorer-post-${post.id}`}
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="overflow-hidden rounded-[1.15rem] border border-[#2a2f4a] bg-[#1e2235]"
              >
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#2b6eff]/30 bg-[#1a3f99] text-sm font-black text-blue-100">
                      {post.providerName?.[0] || 'P'}
                    </div>
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => openProviderExplorer(post)}
                        className="truncate text-left text-sm font-black tracking-tight text-white hover:text-[#2b6eff]"
                      >
                        {post.providerName}
                      </button>
                      <p className="flex items-center gap-1 text-[10px] font-semibold text-[#8b90b0]">
                        <ShieldCheck className="h-3 w-3 text-[#0fc98a]" />
                        Verified provider
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 p-1.5 text-[#8b90b0]"
                    aria-label="Provider business"
                    onClick={() => openProviderBusiness(post)}
                  >
                    <MoreHorizontal className="w-5 h-5" strokeWidth={1.75} />
                  </button>
                </div>

                <div className="group relative aspect-square bg-[#1a1d2e]">
                  {brokenMedia[post.id] ? (
                    <img
                      src={`https://picsum.photos/seed/fallback-${post.id}/900/900`}
                      alt="Fallback media"
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : isVideoUrl(post.imageUrl) ? (
                    <video
                      src={post.imageUrl}
                      className="h-full w-full object-cover"
                      controls
                      preload="metadata"
                      onError={() => setBrokenMedia((m) => ({ ...m, [post.id]: true }))}
                    />
                  ) : (
                    <img
                      src={post.imageUrl}
                      alt="Post content"
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={() => setBrokenMedia((m) => ({ ...m, [post.id]: true }))}
                    />
                  )}
                </div>

                <div className="px-3 pb-1 pt-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-white">
                      <button
                        type="button"
                        className="flex min-h-[44px] items-center gap-1.5 px-0.5"
                        onClick={() => void toggleLike(post)}
                        aria-label="Like"
                      >
                        <Heart
                          className={cn('w-[26px] h-[26px]', isLiked ? 'fill-red-500 text-red-500' : '')}
                          strokeWidth={1.75}
                        />
                        <span className="text-[13px] font-semibold tabular-nums tracking-tight min-w-[1.25rem]">
                          {formatEngagementCount(likeCount)}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="flex min-h-[44px] items-center gap-1.5 px-0.5 text-white"
                        onClick={() =>
                          !user
                            ? goAuthResumeExplorer({ postId: String(post.id) })
                            : showNotification('Comment thread on web is coming soon.')
                        }
                        aria-label="Comments"
                      >
                        <MessageCircle className="w-[26px] h-[26px]" strokeWidth={1.75} />
                        <span className="text-[13px] font-semibold tabular-nums tracking-tight">
                          {formatEngagementCount(commentCount)}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="flex min-h-[44px] items-center gap-1.5 px-0.5 text-white"
                        onClick={() => void goOrderFromPost(post)}
                        aria-label="Order"
                      >
                        <ClipboardList className="w-[26px] h-[26px]" strokeWidth={1.75} />
                        <span className="text-[13px] font-semibold tabular-nums tracking-tight">
                          {formatEngagementCount(orderCount)}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="flex min-h-[44px] items-center gap-1.5 px-0.5 text-white"
                        onClick={() => copyShareLink(post.id)}
                        aria-label="Share"
                      >
                        <Send className="w-[26px] h-[26px]" strokeWidth={1.75} />
                        <span className="text-[13px] font-semibold tabular-nums tracking-tight">
                          {formatEngagementCount(shareCount)}
                        </span>
                      </button>
                    </div>
                    <button
                      type="button"
                      className="shrink-0 p-2 text-white"
                      onClick={() => toggleSave(post.id)}
                      aria-label="Save"
                    >
                      <Bookmark
                        className={cn('w-[26px] h-[26px]', saved ? 'fill-current' : '')}
                        strokeWidth={1.75}
                      />
                    </button>
                  </div>
                </div>
                <div className="space-y-1 px-4 pb-4">
                  <p className="text-sm leading-snug text-[#d8dcf5]">
                    <span className="font-semibold mr-1.5">{post.providerName}</span>
                    <span className="font-normal">{post.caption}</span>
                  </p>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] md:bottom-8 md:right-8 md:translate-x-0"
          >
            <div className={cn(
              "flex items-center gap-3 rounded-2xl border px-6 py-4 shadow-2xl",
              notification.type === 'success' ? "bg-emerald-500 text-white border-emerald-400" : "bg-red-500 text-white border-red-400"
            )}>
              <Bell className="w-5 h-5" />
              <span className="font-bold text-sm">{notification.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
