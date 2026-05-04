import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/api';
import { handleApiError, OperationType } from '../lib/errors';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, MessageCircle, Send, MoreHorizontal, Bookmark, Loader2, Search, Star, MapPin, Sparkles, ArrowRight, Grid3X3, List, ClipboardList } from 'lucide-react';
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
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set());

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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
    <div className="max-w-4xl mx-auto space-y-8 pb-32">
      <header className="sticky top-0 bg-app-bg/90 backdrop-blur-md z-50 pt-2 pb-3">
        <div className="flex items-center gap-2 max-w-[468px] mx-auto">
          <div className="relative flex-1 min-w-0 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" strokeWidth={2} />
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-app-card border border-app-border rounded-xl pl-9 pr-3 py-2.5 text-[13px] font-medium text-app-text placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900/15"
            />
          </div>
          <div className="flex shrink-0 gap-1 rounded-xl border border-app-border p-0.5 bg-app-card">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 rounded-lg transition-colors',
                viewMode === 'grid' ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'text-neutral-400',
              )}
              aria-label="Grid view"
            >
              <Grid3X3 className="w-4 h-4" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('feed')}
              className={cn(
                'p-2 rounded-lg transition-colors',
                viewMode === 'feed' ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'text-neutral-400',
              )}
              aria-label="Feed view"
            >
              <List className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-neutral-300" />
          <p className="text-neutral-400 font-bold uppercase tracking-widest text-xs">Architecting Discovery...</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-20 bg-app-card rounded-[3rem] border border-app-border space-y-6">
          <div className="w-24 h-24 bg-neutral-50 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto">
            <Search className="w-12 h-12 text-neutral-200" />
          </div>
          <div className="space-y-2">
            <p className="text-app-text font-black text-xl uppercase italic">No matches found</p>
            <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest max-w-xs mx-auto">Try adjusting your filters or searching for something else.</p>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {filteredPosts.map((post, idx) => (
                <motion.div
                    id={`explorer-post-${post.id}`}
                    key={post.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group bg-app-card border border-app-border rounded-[3rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all"
                >
                    <div className="aspect-[4/5] relative overflow-hidden">
                        {brokenMedia[post.id] ? (
                          <img
                            src={`https://picsum.photos/seed/fallback-${post.id}/800/1000`}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            referrerPolicy="no-referrer"
                          />
                        ) : isVideoUrl(post.imageUrl) ? (
                          <video
                            src={post.imageUrl}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            controls
                            preload="metadata"
                            onError={() => setBrokenMedia((m) => ({ ...m, [post.id]: true }))}
                          />
                        ) : (
                          <img
                            src={post.imageUrl || `https://picsum.photos/seed/${post.id}/800/1000`}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            referrerPolicy="no-referrer"
                            onError={() => setBrokenMedia((m) => ({ ...m, [post.id]: true }))}
                          />
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-8">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="bg-white/20 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded">Verified Neighbor</span>
                                <div className="flex items-center gap-0.5">
                                    {[1,2,3,4,5].map(i => <Star key={i} className="w-2 h-2 fill-amber-400 text-amber-400" />)}
                                </div>
                            </div>
                            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-none">{(post.caption || '').slice(0, 40)}{(post.caption || '').length > 40 && '...'}</h3>
                        </div>
                        <button 
                            onClick={() => (!user ? goAuthResumeExplorer({ postId: String(post.id) }) : undefined)}
                            className="absolute top-6 right-6 w-12 h-12 bg-white/10 backdrop-blur-md text-white rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Heart className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="p-8 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-neutral-900 dark:bg-white rounded-full flex items-center justify-center text-white dark:text-neutral-900 font-black italic">
                                {post.providerName?.[0] || 'P'}
                            </div>
                            <div>
                                <p className="font-black text-sm text-app-text">{post.providerName}</p>
                                <div className="flex items-center gap-1 text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
                                    <MapPin className="w-3 h-3" />
                                    <span>2.4 km away</span>
                                </div>
                            </div>
                        </div>
                        <button 
                            type="button"
                            onClick={() => goToPostContext(post)}
                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-app-text group/btn"
                        >
                            View Details
                            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </motion.div>
            ))}
        </div>
      ) : (
        <div className="max-w-[468px] mx-auto space-y-10">
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
                className="bg-app-card border border-app-border rounded-sm overflow-hidden shadow-sm"
              >
                {/* Instagram Style Header */}
                <div className="px-3 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 shrink-0 bg-neutral-900 dark:bg-white rounded-full flex items-center justify-center text-white dark:text-neutral-900 font-black text-sm">
                      {post.providerName?.[0] || 'P'}
                    </div>
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => openProviderExplorer(post)}
                        className="font-semibold text-sm tracking-tight text-app-text truncate text-left hover:underline"
                      >
                        {post.providerName}
                      </button>
                      <p className="text-[10px] text-neutral-500 font-medium">Verified provider</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="p-1.5 text-app-text shrink-0"
                    aria-label="Provider business"
                    onClick={() => openProviderBusiness(post)}
                  >
                    <MoreHorizontal className="w-5 h-5" strokeWidth={1.75} />
                  </button>
                </div>

                <div className="aspect-square bg-neutral-50 dark:bg-neutral-900 relative group">
                  {brokenMedia[post.id] ? (
                    <img
                      src={`https://picsum.photos/seed/fallback-${post.id}/900/900`}
                      alt="Fallback media"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : isVideoUrl(post.imageUrl) ? (
                    <video
                      src={post.imageUrl}
                      className="w-full h-full object-cover"
                      controls
                      preload="metadata"
                      onError={() => setBrokenMedia((m) => ({ ...m, [post.id]: true }))}
                    />
                  ) : (
                    <img
                      src={post.imageUrl}
                      alt="Post content"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={() => setBrokenMedia((m) => ({ ...m, [post.id]: true }))}
                    />
                  )}
                </div>

                <div className="px-2 pt-2 pb-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-app-text">
                      <button
                        type="button"
                        className="flex items-center gap-1.5 min-h-[44px] px-0.5"
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
                        className="flex items-center gap-1.5 min-h-[44px] px-0.5 text-app-text"
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
                        className="flex items-center gap-1.5 min-h-[44px] px-0.5 text-app-text"
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
                        className="flex items-center gap-1.5 min-h-[44px] px-0.5 text-app-text"
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
                      className="p-2 shrink-0 text-app-text"
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
                <div className="px-3 pb-3 space-y-1">
                  <p className="text-sm leading-snug text-app-text">
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
              "px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border",
              notification.type === 'success' ? "bg-emerald-500 text-white border-emerald-400" : "bg-red-500 text-white border-red-400"
            )}>
              <Sparkles className="w-5 h-5" />
              <span className="font-bold text-sm">{notification.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
