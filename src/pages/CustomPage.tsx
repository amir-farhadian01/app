import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'motion/react';
import { ChevronLeft, Clock } from 'lucide-react';
import { api } from '../lib/api';

export default function CustomPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    const load = async () => {
      setLoading(true);
      const candidates = [slug, `/${slug}`];
      for (const s of candidates) {
        try {
          const p = await api.get<any>(`/api/system/pages/${encodeURIComponent(s)}`);
          setPage(p);
          setLoading(false);
          return;
        } catch {
          /* try next */
        }
      }
      setPage(null);
      setLoading(false);
    };

    void load();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!page || page.status !== 'published') {
    return (
      <div className="max-w-2xl mx-auto py-20 px-6 text-center space-y-6">
        <h1 className="text-4xl font-black italic uppercase tracking-tight">Page Not Found</h1>
        <p className="text-neutral-500">The page you are looking for does not exist or has been moved.</p>
        <button onClick={() => navigate('/')} className="px-8 py-4 bg-neutral-900 text-white rounded-2xl font-bold text-sm">
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto py-12 px-6 space-y-12 pb-32"
    >
      <header className="space-y-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-neutral-400 hover:text-neutral-900 transition-colors font-bold text-xs uppercase tracking-widest"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <div className="space-y-4">
          <h1 className="text-5xl md:text-6xl font-black italic uppercase tracking-tighter leading-none">{page.title}</h1>
          <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-neutral-400">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Last updated {new Date(page.lastEdit).toLocaleDateString()}
            </div>
          </div>
        </div>
      </header>

      <article className="prose prose-neutral max-w-none prose-headings:font-black prose-headings:italic prose-headings:uppercase prose-headings:tracking-tight prose-p:text-neutral-600 prose-p:leading-relaxed prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{page.content}</ReactMarkdown>
      </article>
    </motion.div>
  );
}
