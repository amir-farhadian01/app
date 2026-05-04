import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { ChevronRight, Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface CategorySelectorProps {
  onSelect: (category: any) => void;
  maxLevels?: number;
}

export default function CategorySelector({ onSelect, maxLevels = 5 }: CategorySelectorProps) {
  const [levels, setLevels] = useState<any[][]>([]);
  const [selectedPath, setSelectedPath] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLevel(null, 0);
  }, []);

  const fetchLevel = async (parentId: string | null, levelIndex: number) => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'categories'),
        where('parentId', '==', parentId)
      );
      const snap = await getDocs(q);
      const cats = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (cats.length > 0) {
        setLevels(prev => {
          const newLevels = prev.slice(0, levelIndex);
          newLevels[levelIndex] = cats;
          return newLevels;
        });
      } else {
        // No more subcategories, this is a leaf
        setLevels(prev => prev.slice(0, levelIndex));
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (category: any, levelIndex: number) => {
    const newPath = selectedPath.slice(0, levelIndex);
    newPath[levelIndex] = category;
    setSelectedPath(newPath);
    onSelect(category);

    if (levelIndex < maxLevels - 1) {
      fetchLevel(category.id, levelIndex + 1);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 mb-4">
        {selectedPath.map((cat, i) => (
          <React.Fragment key={cat.id}>
            <span className="px-3 py-1 bg-neutral-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-2">
              {cat.name}
              {i === selectedPath.length - 1 && <Check className="w-3 h-3" />}
            </span>
            {i < selectedPath.length - 1 && <ChevronRight className="w-3 h-3 text-neutral-300 self-center" />}
          </React.Fragment>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {levels.map((level, levelIndex) => (
          <div key={levelIndex} className="bg-neutral-50 rounded-2xl p-4 border border-neutral-100 space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">Level {levelIndex + 1}</p>
            {level.map(cat => (
              <button
                key={cat.id}
                onClick={() => handleSelect(cat, levelIndex)}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-between group",
                  selectedPath[levelIndex]?.id === cat.id 
                    ? "bg-neutral-900 text-white" 
                    : "hover:bg-white hover:shadow-sm text-neutral-600"
                )}
              >
                {cat.name}
                <ChevronRight className={cn(
                  "w-4 h-4 transition-transform",
                  selectedPath[levelIndex]?.id === cat.id ? "text-white/40" : "text-neutral-300 group-hover:translate-x-1"
                )} />
              </button>
            ))}
          </div>
        ))}
      </div>
      
      {loading && (
        <div className="flex items-center gap-2 text-neutral-400 text-[10px] font-black uppercase tracking-widest">
          <div className="w-3 h-3 border-2 border-neutral-200 border-t-neutral-400 rounded-full animate-spin" />
          Loading...
        </div>
      )}
    </div>
  );
}
