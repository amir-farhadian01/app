import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { MessageSquare } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/api';

export default function ProviderCommunity() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    let c = false;
    const load = async () => {
      try {
        const p = await api.get<any[]>('/api/posts');
        if (!c) setPosts(p || []);
      } catch {
        if (!c) setPosts([]);
      }
    };
    load();
    const id = setInterval(load, 10000);
    return () => {
      c = true;
      clearInterval(id);
    };
  }, [user]);

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20 px-4">
      <h1 className="text-3xl font-black italic uppercase text-app-text">Community</h1>
      <div className="space-y-6">
        {posts.map((p) => (
          <motion.div key={p.id} layout className="rounded-3xl border border-app-border overflow-hidden bg-app-card">
            <img src={p.imageUrl} alt="" className="w-full aspect-square object-cover" referrerPolicy="no-referrer" />
            <div className="p-4 flex gap-2 items-center text-sm text-neutral-500">
              <MessageSquare className="w-4 h-4" />
              {p.caption || '—'}
            </div>
          </motion.div>
        ))}
        {posts.length === 0 && <p className="text-neutral-400 text-sm">No posts yet.</p>}
      </div>
    </div>
  );
}
