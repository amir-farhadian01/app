import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, arrayUnion, arrayRemove, getDoc, where, limit } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, MessageCircle, Send, PlusSquare, MoreHorizontal, Bookmark, User, Image as ImageIcon, X, Loader2, Search, Filter, Star, MapPin, Sparkles, SlidersHorizontal, ArrowRight, Grid3X3, List } from 'lucide-react';
import { cn } from '../lib/utils';

const CATEGORIES = [
  { id: 'all', name: 'All Services', icon: Grid3X3 },
  { id: 'cleaning', name: 'Cleaning', icon: Sparkles },
  { id: 'plumbing', name: 'Plumbing', icon: SlidersHorizontal },
  { id: 'gardening', name: 'Gardening', icon: Sparkles },
  { id: 'repairs', name: 'Repairs', icon: SlidersHorizontal },
  { id: 'beauty', name: 'Beauty & Wellness', icon: Sparkles },
  { id: 'tech', name: 'Tech Support', icon: SlidersHorizontal },
];

export default function Services() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'feed'>('grid');
  
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    if (auth.currentUser) {
      getDoc(doc(db, 'users', auth.currentUser.uid)).then(d => {
        if (d.exists()) setUserRole(d.data().role);
      });
    }

    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(results);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'posts'));

    return () => unsubscribe();
  }, []);

  const filteredPosts = posts.filter(post => {
    const matchesSearch = !searchTerm || 
      post.caption?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      post.providerName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'all' || post.category?.toLowerCase() === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-32">
      {/* Search Header */}
      <header className="sticky top-0 bg-app-bg/80 backdrop-blur-xl z-50 py-6 space-y-6">
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <h1 className="text-4xl font-black italic uppercase tracking-tighter text-app-text">Explorer</h1>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Discover services in your neighborhood</p>
            </div>
            <div className="flex gap-2">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={cn("p-3 rounded-2xl transition-all", viewMode === 'grid' ? "bg-neutral-900 text-white" : "bg-app-card text-neutral-400 border border-app-border")}
                >
                    <Grid3X3 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setViewMode('feed')}
                  className={cn("p-3 rounded-2xl transition-all", viewMode === 'feed' ? "bg-neutral-900 text-white" : "bg-app-card text-neutral-400 border border-app-border")}
                >
                    <List className="w-5 h-5" />
                </button>
            </div>
        </div>

        <div className="relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 group-focus-within:text-app-text transition-colors" />
          <input 
            type="text" 
            placeholder="Search for 'Plumbing', 'Cleaning' or 'Nail Artist'..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-app-card border border-app-border rounded-[2rem] pl-16 pr-6 py-5 text-sm font-bold shadow-sm focus:outline-none focus:ring-4 focus:ring-neutral-900/5 transition-all"
          />
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2">
            {CATEGORIES.map(cat => (
                <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                        "flex items-center gap-3 px-6 py-3 rounded-2xl whitespace-nowrap text-xs font-black uppercase tracking-widest transition-all",
                        activeCategory === cat.id 
                            ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xl scale-105" 
                            : "bg-app-card border border-app-border text-neutral-400 hover:border-neutral-900"
                    )}
                >
                    <cat.icon className="w-4 h-4" />
                    {cat.name}
                </button>
            ))}
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
                    key={post.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group bg-app-card border border-app-border rounded-[3rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all"
                >
                    <div className="aspect-[4/5] relative overflow-hidden">
                        <img 
                            src={post.imageUrl || `https://picsum.photos/seed/${post.id}/800/1000`} 
                            alt="" 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-8">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="bg-white/20 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded">Verified Neighbor</span>
                                <div className="flex items-center gap-0.5">
                                    {[1,2,3,4,5].map(i => <Star key={i} className="w-2 h-2 fill-amber-400 text-amber-400" />)}
                                </div>
                            </div>
                            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-none">{post.caption.slice(0, 40)}{post.caption.length > 40 && '...'}</h3>
                        </div>
                        <button 
                            onClick={() => !auth.currentUser ? navigate('/auth') : null}
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
                            onClick={() => navigate(`/service/${post.id}`)}
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
        <div className="max-w-xl mx-auto space-y-12">
          {filteredPosts.map((post) => {
            const isLiked = post.likes?.includes(auth.currentUser?.uid);
            return (
              <motion.article 
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-app-card border border-app-border rounded-[2.5rem] overflow-hidden shadow-sm"
              >
                {/* Instagram Style Header */}
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
                  <button className="p-2 text-neutral-400 font-black">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>

                <div className="aspect-square bg-neutral-50 dark:bg-neutral-800 relative group">
                  <img 
                    src={post.imageUrl} 
                    alt="Post content" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-app-text">
                       <button onClick={() => !auth.currentUser ? navigate('/auth') : null}>
                        <Heart className={cn("w-7 h-7", isLiked ? "fill-red-500 text-red-500" : "")} />
                       </button>
                       <button onClick={() => !auth.currentUser ? navigate('/auth') : null}>
                        <MessageCircle className="w-7 h-7" />
                       </button>
                       <button onClick={() => !auth.currentUser ? navigate('/auth') : null}>
                        <Send className="w-7 h-7" />
                       </button>
                    </div>
                    <button onClick={() => !auth.currentUser ? navigate('/auth') : null}>
                        <Bookmark className="w-7 h-7 text-app-text" />
                    </button>
                  </div>
                  <p className="text-sm text-app-text">
                    <span className="font-black mr-2">{post.providerName}</span>
                    {post.caption}
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
