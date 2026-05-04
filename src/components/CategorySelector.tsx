import React, { useState, useEffect } from 'react';
import { ChevronRight, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';

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
      const q = parentId ? `?parentId=${encodeURIComponent(parentId)}` : '?parentId=null';
      const cats = await api.get<any[]>(`/api/categories${q}`);

      if (cats.length > 0) {
        setLevels((prev) => {
          const newLevels = prev.slice(0, levelIndex);
          newLevels[levelIndex] = cats;
          return newLevels;
        });
      } else {
        setLevels((prev) => prev.slice(0, levelIndex));
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
      {levels.map((levelCats, levelIndex) => (
        <div key={levelIndex} className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">
            Level {levelIndex + 1}
          </p>
          <div className="grid grid-cols-1 gap-2">
            {levelCats.map((cat) => {
              const isSelected = selectedPath[levelIndex]?.id === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelect(cat, levelIndex)}
                  className={cn(
                    'flex items-center justify-between p-4 rounded-2xl border transition-all text-left',
                    isSelected
                      ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900'
                      : 'bg-app-card border-app-border hover:border-neutral-300',
                  )}
                >
                  <span className="font-bold text-sm">{cat.name}</span>
                  {isSelected ? <Check className="w-4 h-4" /> : <ChevronRight className="w-4 h-4 text-neutral-300" />}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {loading && <p className="text-xs text-neutral-400">Loading categories…</p>}
    </div>
  );
}
