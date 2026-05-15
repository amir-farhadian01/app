import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { cn } from '../../lib/cn'
import api from '../../lib/api'
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
} from 'lucide-react'

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
      // silently fail — optimistic update is fine for UX
    } finally {
      setTimeout(() => setAnimatingLike(false), 300)
    }
  }, [user, liked, post.id])

  const avatarInitial = post.author.displayName?.charAt(0).toUpperCase() || '?'

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
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-sm font-bold text-white ring-2 ring-[#2a2f4a]">
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

      {/* Media */}
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
        </div>
      )}

      {/* Interests tags */}
      {post.interests.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pt-3">
          {post.interests.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-[#1e2040] px-2.5 py-0.5 text-[11px] font-medium text-[#818cf8]"
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
            liked
              ? 'text-[#ef4444]'
              : 'text-[#6b6f8a] hover:text-[#ef4444]',
            !user && 'cursor-not-allowed opacity-50',
            animatingLike && 'scale-110'
          )}
          title={!user ? 'Login to like' : liked ? 'Unlike' : 'Like'}
        >
          <Heart
            className={cn(
              'h-4 w-4 transition-transform',
              liked && 'fill-current'
            )}
          />
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

export default function Feed() {
  const user = useAuthStore((s) => s.user)
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

      const endpoint = user ? '/feed' : '/feed/public'
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
      const message =
        err instanceof Error ? err.message : 'Failed to load feed'
      setError(message)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [user])

  useEffect(() => {
    fetchPosts(1, false)
  }, [fetchPosts])

  const handleLoadMore = () => {
    if (!loadingMore && posts.length < total) {
      fetchPosts(page + 1, true)
    }
  }

  const hasMore = posts.length < total

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#f0f2ff]">Feed</h1>
          <p className="text-sm text-[#6b6f8a] mt-1">
            {total > 0
              ? `${total} post${total !== 1 ? 's' : ''}`
              : 'Latest from the community'}
          </p>
        </div>
        {!user && (
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#6366f1] px-4 py-2 text-sm font-medium text-white hover:bg-[#4f46e5] transition-colors"
          >
            Login to interact
          </Link>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-6">
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
            Failed to load feed
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
            No posts yet
          </h3>
          <p className="text-sm text-[#6b6f8a] max-w-sm">
            Be the first to share something with the community! Posts from
            businesses and neighbors will appear here.
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
