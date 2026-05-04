import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, MessageCircle, Send, PlusSquare, MoreHorizontal, Bookmark, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import MessageActions from '../components/MessageActions';

export default function Services() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPost, setNewPost] = useState({ imageUrl: '', caption: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeComments, setActiveComments] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Record<string, any[]>>({});

  const fetchPosts = async () => {
    try {
      const data = await api.get<any[]>('/api/posts');
      setPosts(data || []);
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleLike = async (postId: string, isLiked: boolean) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    try {
      await api.post(`/api/posts/${postId}/like`);
      // Toggle optimistically
      setPosts(prev => prev.map(p => {
        if (p.id !== postId) return p;
        const likes: string[] = p.likes || [];
        const updated = isLiked
          ? likes.filter((id: string) => id !== user.id)
          : [...likes, user.id];
        return { ...p, likes: updated };
      }));
    } catch (error) {
      console.error('Failed to like post:', error);
    }
  };

  const handleCreatePost = async () => {
    if (!newPost.imageUrl || !user) return;
    setIsSubmitting(true);
    try {
      const created = await api.post<any>('/api/posts', {
        imageUrl: newPost.imageUrl,
        caption: newPost.caption,
      });
      setPosts(prev => [created, ...prev]);
      setShowCreateModal(false);
      setNewPost({ imageUrl: '', caption: '' });
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Failed to create post.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchComments = async (postId: string) => {
    if (comments[postId]) return;
    // Comments are embedded in post or fetched separately — use post data for now
    const post = posts.find(p => p.id === postId);
    if (post?.comments) {
      setComments(prev => ({ ...prev, [postId]: post.comments }));
    } else {
      setComments(prev => ({ ...prev, [postId]: [] }));
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!commentText.trim() || !user) return;
    try {
      const newComment = await api.post<any>(`/api/posts/${postId}/comments`, { text: commentText });
      setComments(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newComment],
      }));
      setCommentText('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleUpdateComment = async (_commentId: string, _newText: string) => {
    // Comments endpoint not listed — no-op for now
  };

  const handleDeleteComment = async (_commentId: string) => {
    // Comments endpoint not listed — no-op for now
  };

  return (
    <div className="max-w-xl mx-auto space-y-8 pb-20">
      <header className="flex items-center justify-between sticky top-0 bg-app-bg/80 backdrop-blur-md z-10 py-4 px-2">
        <h1 className="text-3xl font-black italic uppercase tracking-tighter text-app-text">Explorer</h1>
        {user?.role === 'provider' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
          >
            <PlusSquare className="w-7 h-7 text-app-text" />
          </button>
        )}
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-neutral-300" />
          <p className="text-neutral-400 font-bold uppercase tracking-widest text-xs">Loading Feed...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <div className="w-20 h-20 bg-neutral-50 rounded-full flex items-center justify-center mx-auto">
            <ImageIcon className="w-10 h-10 text-neutral-200" />
          </div>
          <p className="text-neutral-400 font-bold uppercase tracking-widest text-xs">No posts yet</p>
        </div>
      ) : (
        <div className="space-y-12">
          {posts.map((post) => {
            const isLiked = post.likes?.includes(user?.id);
            return (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-app-card border border-app-border rounded-[2.5rem] overflow-hidden shadow-sm"
              >
                {/* Header */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-neutral-900 dark:bg-white rounded-full flex items-center justify-center text-white dark:text-neutral-900 font-black italic">
                      {post.providerName?.[0] || 'P'}
                    </div>
                    <div>
                      <p className="font-black text-sm uppercase tracking-tight text-app-text">{post.providerName}</p>
                      <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Verified Provider</p>
                    </div>
                  </div>
                  <button className="p-2 text-neutral-400">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>

                {/* Image */}
                <div className="aspect-square bg-neutral-50 dark:bg-neutral-800 relative group">
                  <img
                    src={post.imageUrl}
                    alt="Post content"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Heart className={cn("w-20 h-20 text-white fill-white transition-transform", isLiked ? "scale-100" : "scale-0")} />
                  </div>
                </div>

                {/* Actions */}
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleLike(post.id, isLiked)}
                        className="transition-transform active:scale-125"
                      >
                        <Heart className={cn("w-7 h-7", isLiked ? "fill-red-500 text-red-500" : "text-app-text")} />
                      </button>
                      <button
                        onClick={() => {
                          setActiveComments(activeComments === post.id ? null : post.id);
                          fetchComments(post.id);
                        }}
                        className="hover:scale-110 transition-transform"
                      >
                        <MessageCircle className="w-7 h-7 text-app-text" />
                      </button>
                      <button
                        onClick={() => {
                          const url = window.location.origin + '/services?post=' + post.id;
                          navigator.clipboard.writeText(url);
                          alert('Link copied to clipboard!');
                        }}
                        className="hover:scale-110 transition-transform"
                      >
                        <Send className="w-7 h-7 text-app-text" />
                      </button>
                    </div>
                    <button className="hover:scale-110 transition-transform">
                      <Bookmark className="w-7 h-7 text-app-text" />
                    </button>
                  </div>

                  {/* Likes Count */}
                  <p className="font-black text-sm uppercase tracking-tight text-app-text">
                    {post.likes?.length || 0} Likes
                  </p>

                  {/* Caption */}
                  <div className="space-y-1">
                    <p className="text-sm leading-relaxed text-app-text">
                      <span className="font-black uppercase tracking-tight mr-2">{post.providerName}</span>
                      {post.caption}
                    </p>
                    <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Comments Section */}
                  <AnimatePresence>
                    {activeComments === post.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-4 pt-4 border-t border-app-border"
                      >
                        <div className="max-h-40 overflow-y-auto space-y-3 no-scrollbar">
                          {(comments[post.id] || []).map((c: any) => (
                            <div key={c.id} className="text-sm flex items-start justify-between group/comment">
                              <div className="flex-1">
                                <span className="font-black uppercase tracking-tight mr-2 text-app-text">{c.userName}</span>
                                <span className="text-neutral-600 dark:text-neutral-400">{c.text}</span>
                                {c.isEdited && <span className="text-[8px] opacity-40 ml-2 italic text-app-text">(edited)</span>}
                              </div>
                              <MessageActions
                                text={c.text}
                                isOwner={c.userId === user?.id}
                                onUpdate={(newText) => handleUpdateComment(c.id, newText)}
                                onDelete={() => handleDeleteComment(c.id)}
                                className="ml-2"
                              />
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Add a comment..."
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                            className="flex-1 bg-neutral-50 dark:bg-neutral-800 border border-app-border rounded-xl px-4 py-2 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                          />
                          <button
                            onClick={() => handleAddComment(post.id)}
                            className="text-app-text font-black uppercase tracking-widest text-[10px] px-2"
                          >
                            Post
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      {/* Create Post Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-app-card rounded-[3rem] p-8 space-y-6 shadow-2xl border border-app-border"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black italic uppercase tracking-tight text-app-text">Create Post</h2>
                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors">
                  <X className="w-6 h-6 text-app-text" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Image URL</label>
                  <input
                    type="text"
                    placeholder="https://images.unsplash.com/..."
                    value={newPost.imageUrl}
                    onChange={(e) => setNewPost({ ...newPost, imageUrl: e.target.value })}
                    className="w-full p-4 bg-neutral-50 dark:bg-neutral-800 border border-app-border rounded-2xl text-app-text focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Caption</label>
                  <textarea
                    placeholder="Write something about your service..."
                    value={newPost.caption}
                    onChange={(e) => setNewPost({ ...newPost, caption: e.target.value })}
                    className="w-full p-4 bg-neutral-50 dark:bg-neutral-800 border border-app-border rounded-2xl text-app-text focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all h-32 resize-none"
                  />
                </div>
              </div>

              <button
                onClick={handleCreatePost}
                disabled={isSubmitting || !newPost.imageUrl}
                className="w-full py-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl font-bold text-sm hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Share Post'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
