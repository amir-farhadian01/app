import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import {
  Image,
  MessageSquare,
  Heart,
  Share2,
  Calendar,
  Clock,
  Plus,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Edit3,
  MoreHorizontal,
  Archive,
  X,
} from 'lucide-react'
import { getBusinessPosts, createBusinessPost, archiveBusinessPost, updateBusinessPost, type BusinessPost } from '../../services/business'

type Tab = 'posts' | 'stories' | 'comments'

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

// ─── Create Post Modal ────────────────────────────────────────────────────────

function CreatePostModal({
  workspaceId,
  onClose,
  onCreated,
}: {
  workspaceId: string
  onClose: () => void
  onCreated: () => void
}) {
  const [caption, setCaption] = useState('')
  const [category, setCategory] = useState('general')
  const [mediaUrl, setMediaUrl] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!caption.trim()) {
      setError('Caption is required')
      return
    }
    setIsSubmitting(true)
    setError('')
    try {
      await createBusinessPost(workspaceId, {
        caption: caption.trim(),
        category: category || undefined,
        mediaUrl: mediaUrl || undefined,
        scheduledAt: scheduledAt || undefined,
      })
      onCreated()
      onClose()
    } catch (err) {
      setError('Failed to create post. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-[#2a2f4a] bg-[#1a1d2e] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[#f0f2ff]">Create Post</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#6a6e88] hover:bg-[#2a2f4a] hover:text-[#f0f2ff]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#f0f2ff] mb-1">Caption *</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write your post caption..."
              rows={3}
              className="w-full rounded-xl border border-[#2a2f4a] bg-[#0d0f1a] p-3 text-sm text-[#f0f2ff] placeholder-[#6a6e88] outline-none transition-colors focus:border-[#2b6eff]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#f0f2ff] mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-[#2a2f4a] bg-[#0d0f1a] px-3 py-2 text-sm text-[#f0f2ff] outline-none focus:border-[#2b6eff]"
            >
              <option value="general">General</option>
              <option value="promotion">Promotion</option>
              <option value="announcement">Announcement</option>
              <option value="tip">Tip / Advice</option>
              <option value="showcase">Showcase</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#f0f2ff] mb-1">Media URL (optional)</label>
            <input
              type="url"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full rounded-xl border border-[#2a2f4a] bg-[#0d0f1a] px-3 py-2 text-sm text-[#f0f2ff] placeholder-[#6a6e88] outline-none focus:border-[#2b6eff]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#f0f2ff] mb-1">Schedule (optional)</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full rounded-xl border border-[#2a2f4a] bg-[#0d0f1a] px-3 py-2 text-sm text-[#f0f2ff] outline-none focus:border-[#2b6eff]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-[#3a3f5a] px-4 py-2 text-sm text-[#f0f2ff] transition-colors hover:bg-[#2a2f4a]"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="rounded-lg bg-[#2b6eff] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2458cc] disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({
  post,
  onArchive,
  onEdit,
  isArchiving,
}: {
  post: BusinessPost
  onArchive: () => void
  onEdit: () => void
  isArchiving: boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="rounded-2xl border border-[#2a2f4a] bg-[#1a1d2e] p-4 transition-all hover:border-[#3a3f5a]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {post.category && (
              <span className="rounded-full border border-[#2a2f4a] bg-[#0d0f1a] px-2.5 py-0.5 text-[10px] font-medium text-[#6a6e88] uppercase">
                {post.category}
              </span>
            )}
            {post.scheduledAt && (
              <span className="inline-flex items-center gap-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-0.5 text-[10px] font-medium text-yellow-400">
                <Clock className="h-3 w-3" />
                Scheduled
              </span>
            )}
            {post.archivedAt && (
              <span className="rounded-full border border-gray-500/30 bg-gray-500/10 px-2.5 py-0.5 text-[10px] font-medium text-gray-400">
                Archived
              </span>
            )}
          </div>
          <p className="text-sm text-[#f0f2ff] line-clamp-3">{post.caption}</p>
          <div className="mt-2 flex items-center gap-4 text-xs text-[#6a6e88]">
            <span className="inline-flex items-center gap-1">
              <Heart className="h-3 w-3" />
              {post.likes}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {post.comments}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {timeAgo(post.createdAt)}
            </span>
          </div>
        </div>

        <div className="relative shrink-0">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-lg p-1.5 text-[#6a6e88] transition-colors hover:bg-[#2a2f4a] hover:text-[#f0f2ff]"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-xl border border-[#2a2f4a] bg-[#1a1d2e] py-1 shadow-xl">
                <button
                  onClick={() => { onEdit(); setMenuOpen(false) }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#f0f2ff] transition-colors hover:bg-[#2a2f4a]"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit
                </button>
                {!post.archivedAt && (
                  <button
                    onClick={() => { onArchive(); setMenuOpen(false) }}
                    disabled={isArchiving}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 transition-colors hover:bg-[#2a2f4a]"
                  >
                    <Archive className="h-3.5 w-3.5" />
                    {isArchiving ? 'Archiving...' : 'Archive'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {post.thumbnailUrl && (
        <div className="mt-3 overflow-hidden rounded-xl">
          <img
            src={post.thumbnailUrl}
            alt="Post media"
            className="h-40 w-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>
      )}
    </div>
  )
}

// ─── Main Social Page ─────────────────────────────────────────────────────────

export default function Social() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('posts')
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [page, setPage] = useState(1)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['business-posts', workspaceId, page],
    queryFn: () =>
      getBusinessPosts(workspaceId!, {
        page,
        pageSize: 20,
        includeArchived: true,
      }),
    enabled: !!workspaceId,
  })

  const archiveMutation = useMutation({
    mutationFn: (postId: string) => archiveBusinessPost(workspaceId!, postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-posts', workspaceId] })
    },
  })

  const posts = data?.data ?? []

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'posts', label: 'Posts', icon: <Image className="h-4 w-4" /> },
    { key: 'stories', label: 'Stories', icon: <Share2 className="h-4 w-4" /> },
    { key: 'comments', label: 'Comments', icon: <MessageSquare className="h-4 w-4" /> },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#f0f2ff]">Social Media Manager</h1>
          <p className="text-sm text-[#8a8ea8]">Manage your business posts, stories, and engagement</p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'posts' && (
            <button
              onClick={() => setShowCreatePost(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2b6eff] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2458cc]"
            >
              <Plus className="h-4 w-4" />
              New Post
            </button>
          )}
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-xl border border-[#2a2f4a] bg-[#1a1d2e] px-4 py-2 text-sm text-[#f0f2ff] transition-colors hover:bg-[#2a2f4a]"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-[#2a2f4a] bg-[#1a1d2e] p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setPage(1) }}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-[#2b6eff] text-white'
                : 'text-[#8a8ea8] hover:text-[#f0f2ff]'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#2b6eff]" />
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-red-400" />
          <p className="text-sm text-red-300">Failed to load social media data. Please try again.</p>
          <button
            onClick={() => refetch()}
            className="rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/30"
          >
            Retry
          </button>
        </div>
      )}

      {/* ─── POSTS TAB ─────────────────────────────────────────────────────── */}
      {!isLoading && !error && activeTab === 'posts' && (
        <div className="space-y-3">
          {posts.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#2a2f4a] bg-[#1a1d2e] p-12 text-center">
              <Image className="h-12 w-12 text-[#3a3f5a]" />
              <h3 className="text-lg font-semibold text-[#f0f2ff]">No posts yet</h3>
              <p className="text-sm text-[#8a8ea8]">
                Create your first post to engage with your audience.
              </p>
              <button
                onClick={() => setShowCreatePost(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#2b6eff] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2458cc]"
              >
                <Plus className="h-4 w-4" />
                Create Post
              </button>
            </div>
          )}

          {posts.map((post: BusinessPost) => (
            <PostCard
              key={post.id}
              post={post}
              onArchive={() => archiveMutation.mutate(post.id)}
              onEdit={() => {
                // Edit functionality - opens inline editing
                const newCaption = window.prompt('Edit caption:', post.caption || '')
                if (newCaption && newCaption !== post.caption) {
                  updateBusinessPost(workspaceId!, post.id, { caption: newCaption })
                    .then(() => queryClient.invalidateQueries({ queryKey: ['business-posts', workspaceId] }))
                    .catch(() => {})
                }
              }}
              isArchiving={archiveMutation.isPending}
            />
          ))}

          {/* Pagination */}
          {data && data.total > data.pageSize && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-[#6a6e88]">
                Showing {(data.page - 1) * data.pageSize + 1}–{Math.min(data.page * data.pageSize, data.total)} of {data.total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-lg border border-[#2a2f4a] px-3 py-1.5 text-sm text-[#f0f2ff] transition-colors hover:bg-[#2a2f4a] disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil(data.total / data.pageSize)}
                  className="rounded-lg border border-[#2a2f4a] px-3 py-1.5 text-sm text-[#f0f2ff] transition-colors hover:bg-[#2a2f4a] disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── STORIES TAB ───────────────────────────────────────────────────── */}
      {!isLoading && !error && activeTab === 'stories' && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#2a2f4a] bg-[#1a1d2e] p-12 text-center">
          <Share2 className="h-12 w-12 text-[#3a3f5a]" />
          <h3 className="text-lg font-semibold text-[#f0f2ff]">Stories</h3>
          <p className="text-sm text-[#8a8ea8]">
            Stories feature is coming soon. You'll be able to share temporary updates that disappear after 24 hours.
          </p>
        </div>
      )}

      {/* ─── COMMENTS TAB ──────────────────────────────────────────────────── */}
      {!isLoading && !error && activeTab === 'comments' && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#2a2f4a] bg-[#1a1d2e] p-12 text-center">
          <MessageSquare className="h-12 w-12 text-[#3a3f5a]" />
          <h3 className="text-lg font-semibold text-[#f0f2ff]">Comments</h3>
          <p className="text-sm text-[#8a8ea8]">
            Comments management is coming soon. You'll be able to view and respond to comments on your posts.
          </p>
        </div>
      )}

      {/* Create Post Modal */}
      {showCreatePost && workspaceId && (
        <CreatePostModal
          workspaceId={workspaceId}
          onClose={() => setShowCreatePost(false)}
          onCreated={() => refetch()}
        />
      )}
    </div>
  )
}
