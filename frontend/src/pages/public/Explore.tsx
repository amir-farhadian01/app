import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'
import api from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import {
  Heart,
  MessageCircle,
  Share2,
  MapPin,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  Clock,
  User,
  Search,
  SlidersHorizontal,
  ShoppingCart,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────

interface PostAuthor {
  id: string
  displayName: string
  avatarUrl?: string | null
}

interface PostReaction {
  id: string
  userId: string
  type: string
}

interface PostComment {
  id: string
  userId: string
  text: string
  createdAt: string
}

interface Post {
  id: string
  type: string
  caption?: string | null
  mediaUrl?: string | null
  thumbnailUrl?: string | null
  price?: number | null
  currency?: string | null
  location?: { lat: number; lng: number; address?: string } | null
  interests: string[]
  views: number
  createdAt: string
  author: PostAuthor
  reactions: PostReaction[]
  comments: PostComment[]
  _count: {
    reactions: number
    comments: number
  }
}

interface FeedResponse {
  data: Post[]
  total: number
  page: number
  pageSize: number
}

type ExploreTab = 'explorer' | 'business'

// ── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffSec = Math.floor((now - then) / 1000)
  if (diffSec < 60) return 'just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  const diffWeek = Math.floor(diffDay / 7)
  if (diffWeek < 4) return `${diffWeek}w ago`
  const diffMonth = Math.floor(diffDay / 30)
  if (diffMonth < 12) return `${diffMonth}mo ago`
  const diffYear = Math.floor(diffDay / 365)
  return `${diffYear}y ago`
}

// ── Stories Row ────────────────────────────────────────────────────────────

const STORIES = [
  { initial: 'A', name: 'AutoFix', color: '#ff7a2b' },
  { initial: 'B', name: 'BeautyX', color: '#8b5cf6' },
  { initial: 'G', name: 'GreenBuild', color: '#0fc98a' },
  { initial: 'F', name: 'FoodHub', color: '#8b5cf6' },
  { initial: 'T', name: 'TaxPros', color: '#4a4f70' },
]

function StoriesRow() {
  return (
    <div className="flex gap-4 overflow-x-auto px-4 py-3 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {STORIES.map((story) => (
        <div key={story.name} className="flex flex-col items-center gap-1.5 shrink-0">
          <div className="story-ring">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold"
              style={{
                background: `linear-gradient(135deg, #2b6eff, #0fc98a, #ff7a2b)`,
                padding: 2,
              }}
            >
              <div
                className="flex h-full w-full items-center justify-center rounded-full bg-[#131624] text-sm font-bold"
                style={{ color: story.color }}
              >
                {story.initial}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-medium text-[#8b90b0] truncate max-w-[56px]">
            {story.name}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Post Card ──────────────────────────────────────────────────────────────

function PostCard({ post }: { post: Post }) {
  const user = useAuthStore((s) => s.user)
  const [liked, setLiked] = useState(
    () => user != null && post.reactions.some((r) => r.userId === user.id && r.type === 'LIKE')
  )
  const [likeCount, setLikeCount] = useState(post._count.reactions)
  const [animatingLike, setAnimatingLike] = useState(false)

  const handleLike = useCallback(async () => {
    if (!user) return
    setAnimatingLike(true)
    try {
      if (liked) {
        await api.delete(`/posts/${post.id}/reactions`)
        setLiked(false)
        setLikeCount((c) => Math.max(0, c - 1))
      } else {
        await api.post(`/posts/${post.id}/reactions`, { type: 'LIKE' })
        setLiked(true)
        setLikeCount((c) => c + 1)
      }
    } catch {
      // silently fail
    } finally {
      setTimeout(() => setAnimatingLike(false), 300)
    }
  }, [user, liked, post.id])

  const avatarInitial = post.author.displayName?.charAt(0).toUpperCase() || '?'
  const isBusiness = post.type === 'business' || post.type === 'offer'
  const displayPrice = post.price != null
    ? `${post.currency || 'CAD'} $${post.price}`
    : null

  return (
    <div className="rounded-xl border border-[#2a2f4a] bg-[#131628] overflow-hidden transition-colors hover:border-[#3a3f5a]">
      {/* Author header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Link
          to={user ? `/app/profile/${post.author.id}` : '#'}
          className="shrink-0"
        >
          {post.author.avatarUrl ? (
            <img
              src={post.author.avatarUrl}
              alt={post.author.displayName}
              className="h-10 w-10 rounded-full object-cover ring-2 ring-[#2a2f4a]"
            />
          ) : (
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ring-2 ring-[#2a2f4a]',
                isBusiness
                  ? 'bg-gradient-to-br from-[#2b6eff] to-[#0fc98a]'
                  : 'bg-gradient-to-br from-[#6366f1] to-[#8b5cf6]'
              )}
            >
              {avatarInitial}
            </div>
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <Link
            to={user ? `/app/profile/${post.author.id}` : '#'}
            className="text-sm font-semibold text-[#f0f2ff] hover:text-[#818cf8] transition-colors truncate block"
          >
            {post.author.displayName}
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-[#6b6f8a]">
            {isBusiness && (
              <>
                <span className="inline-flex items-center gap-0.5 rounded bg-[#2b6eff]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#2b6eff]">
                  Business
                </span>
                <span>·</span>
              </>
            )}
            <Clock className="h-3 w-3" />
            <span>{timeAgo(post.createdAt)}</span>
            {post.location?.address && (
              <>
                <span>·</span>
                <MapPin className="h-3 w-3" />
                <span className="truncate max-w-[120px]">{post.location.address}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Caption */}
      {post.caption && (
        <div className="px-4 py-2">
          <p className="text-sm text-[#d0d2e0] leading-relaxed whitespace-pre-wrap">
            {post.caption}
          </p>
        </div>
      )}

      {/* Media with price overlay */}
      {post.mediaUrl && (
        <div className="relative">
          {post.mediaUrl.match(/\.(mp4|webm|ogg)$/i) ? (
            <video
              src={post.mediaUrl}
              controls
              className="w-full max-h-96 object-cover bg-black"
              poster={post.thumbnailUrl || undefined}
            />
          ) : (
            <img
              src={post.mediaUrl}
              alt="Post media"
              className="w-full max-h-96 object-cover bg-[#0d0f1a]"
              loading="lazy"
            />
          )}

          {/* Price overlay — matching prototype */}
          {displayPrice && (
            <div className="absolute left-3 bottom-3 right-3">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-base font-bold text-white drop-shadow-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {displayPrice}
                  </div>
                  {post.caption && (
                    <div className="text-xs text-white/70 mt-0.5 drop-shadow">
                      {post.caption.slice(0, 60)}
                    </div>
                  )}
                </div>
                <button className="flex items-center gap-1 rounded-lg bg-[#2b6eff] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1a3f99] transition-colors shadow-lg">
                  <ShoppingCart className="h-3.5 w-3.5" />
                  Order Now
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Interests tags */}
      {post.interests.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pt-3">
          {post.interests.map((tag) => (
            <span
              key={tag}
              className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                isBusiness
                  ? 'bg-[#2b6eff]/10 text-[#2b6eff]'
                  : 'bg-[#1e2040] text-[#818cf8]'
              )}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center gap-4 px-4 py-3 border-t border-[#2a2f4a] mt-3">
        <button
          onClick={handleLike}
          disabled={!user}
          className={cn(
            'flex items-center gap-1.5 text-sm transition-all duration-200',
            liked ? 'text-[#ef4444]' : 'text-[#6b6f8a] hover:text-[#ef4444]',
            !user && 'cursor-not-allowed opacity-50',
            animatingLike && 'scale-110'
          )}
          title={!user ? 'Login to like' : liked ? 'Unlike' : 'Like'}
        >
          <Heart className={cn('h-4 w-4 transition-transform', liked && 'fill-current')} />
          <span>{likeCount}</span>
        </button>

        <button
          className="flex items-center gap-1.5 text-sm text-[#6b6f8a] hover:text-[#818cf8] transition-colors"
          title="Comments"
        >
          <MessageCircle className="h-4 w-4" />
          <span>{post._count.comments}</span>
        </button>

        <button
          className="flex items-center gap-1.5 text-sm text-[#6b6f8a] hover:text-[#818cf8] transition-colors ml-auto"
          title="Share"
        >
          <Share2 className="h-4 w-4" />
        </button>
      </div>

      {/* Recent comments preview */}
      {post.comments.length > 0 && (
        <div className="border-t border-[#2a2f4a] px-4 py-3 space-y-2">
          {post.comments.slice(0, 3).map((comment) => (
            <div key={comment.id} className="flex items-start gap-2 text-sm">
              <User className="h-4 w-4 mt-0.5 shrink-0 text-[#6b6f8a]" />
              <p className="text-[#b0b2c0]">
                <span className="font-medium text-[#f0f2ff]">
                  {comment.userId.slice(0, 8)}...
                </span>{' '}
                {comment.text}
              </p>
            </div>
          ))}
          {post._count.comments > 3 && (
            <button className="text-xs text-[#818cf8] hover:text-[#a5b4fc] transition-colors">
              View all {post._count.comments} comments
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function PostCardSkeleton() {
  return (
    <div className="rounded-xl border border-[#2a2f4a] bg-[#131628] overflow-hidden animate-pulse">
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <div className="h-10 w-10 rounded-full bg-[#2a2f4a]" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-32 rounded bg-[#2a2f4a]" />
          <div className="h-2.5 w-20 rounded bg-[#2a2f4a]" />
        </div>
      </div>
      <div className="px-4 py-2 space-y-2">
        <div className="h-3 w-full rounded bg-[#2a2f4a]" />
        <div className="h-3 w-3/4 rounded bg-[#2a2f4a]" />
      </div>
      <div className="h-48 bg-[#1a1d30] mx-4 my-2 rounded-lg" />
      <div className="flex items-center gap-4 px-4 py-3 border-t border-[#2a2f4a] mt-3">
        <div className="h-4 w-12 rounded bg-[#2a2f4a]" />
        <div className="h-4 w-12 rounded bg-[#2a2f4a]" />
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function Explore() {
  const [activeTab, setActiveTab] = useState<ExploreTab>('explorer')
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const pageSize = 10

  const fetchPosts = useCallback(async (pageNum: number, append: boolean) => {
    try {
      if (append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
        setError(null)
      }

      const endpoint = activeTab === 'business' ? '/feed/business' : '/feed'
      const { data } = await api.get<FeedResponse>(endpoint, {
        params: { page: pageNum, pageSize },
      })

      if (append) {
        setPosts((prev) => [...prev, ...data.data])
      } else {
        setPosts(data.data)
      }
      setTotal(data.total)
      setPage(pageNum)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load explore feed'
      setError(message)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [activeTab])

  useEffect(() => {
    setPosts([])
    setPage(1)
    fetchPosts(1, false)
  }, [fetchPosts])

  const handleLoadMore = () => {
    if (!loadingMore && posts.length < total) {
      fetchPosts(page + 1, true)
    }
  }

  const hasMore = posts.length < total

  const TABS: { id: ExploreTab; label: string }[] = [
    { id: 'explorer', label: 'Explorer' },
    { id: 'business', label: 'Business Hub' },
  ]

  return (
    <div className="mx-auto max-w-2xl px-4 py-4 sm:px-6 space-y-4">
      {/* Social Tabs — matching prototype */}
      <div className="flex border-b border-[#2a2f4a]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 py-3 text-sm font-semibold transition-colors relative',
              activeTab === tab.id
                ? 'text-[#f0f2ff]'
                : 'text-[#6b6f8a] hover:text-[#8b90b0]'
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-[#2b6eff] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Search bar — matching prototype */}
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 rounded-xl border border-[#2a2f4a] bg-[#1e2235] px-3 py-2.5">
          <Search className="h-4 w-4 text-[#4a4f70]" />
          <span className="text-sm text-[#4a4f70]">
            Search in Vaughan, ON...
          </span>
          <span className="ml-auto rounded-md bg-[#2b6eff]/15 px-2 py-0.5 text-[10px] font-medium text-[#2b6eff]">
            📍 ON
          </span>
        </div>
        <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#2a2f4a] bg-[#1e2235] text-[#8b90b0] hover:text-[#f0f2ff] transition-colors">
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* Stories Row */}
      <StoriesRow />

      {/* Loading state */}
      {loading && (
        <div className="space-y-5">
          <PostCardSkeleton />
          <PostCardSkeleton />
          <PostCardSkeleton />
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="h-12 w-12 text-[#ef4444] mb-4" />
          <h3 className="text-lg font-semibold text-[#f0f2ff] mb-2">
            Failed to load explore feed
          </h3>
          <p className="text-sm text-[#6b6f8a] mb-6 max-w-md">{error}</p>
          <button
            onClick={() => fetchPosts(1, false)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#6366f1] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#4f46e5] transition-colors"
          >
            <Loader2 className="h-4 w-4" />
            Try again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && posts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1e2040] mb-4">
            <ImageIcon className="h-8 w-8 text-[#6b6f8a]" />
          </div>
          <h3 className="text-lg font-semibold text-[#f0f2ff] mb-2">
            {activeTab === 'business'
              ? 'No business posts yet'
              : 'No posts yet'}
          </h3>
          <p className="text-sm text-[#6b6f8a] max-w-sm">
            {activeTab === 'business'
              ? 'Business content from verified providers will appear here.'
              : 'Explore what the community is sharing!'}
          </p>
        </div>
      )}

      {/* Post list */}
      {!loading && !error && posts.length > 0 && (
        <div className="space-y-5">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center pt-2 pb-8">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg border border-[#2a2f4a] bg-[#131628] px-6 py-3 text-sm font-medium text-[#f0f2ff] transition-all',
                  loadingMore
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:border-[#6366f1] hover:text-[#818cf8]'
                )}
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  `Load more (${posts.length}/${total})`
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
