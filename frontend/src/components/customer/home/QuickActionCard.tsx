import { useNavigate } from 'react-router-dom'
import { cn } from '../../../lib/cn'

export interface QuickActionCardProps {
  label: string
  icon: React.ReactNode
  path: string
  badge?: number
}

export function QuickActionCard({ label, icon, path, badge }: QuickActionCardProps) {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => navigate(path)}
      className="relative flex shrink-0 flex-col items-center gap-2 rounded-2xl border border-[#2a2f4a] bg-[#1e2235] px-5 py-4 text-center transition hover:border-[#2b6eff] hover:bg-[#1a3f99]/20"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2b6eff]/15 text-[#2b6eff]">
        {icon}
      </span>
      <span className="text-[11px] font-black uppercase tracking-widest text-[#8b90b0]">{label}</span>
      {badge != null && badge > 0 && (
        <span className={cn(
          'absolute right-2 top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#ff4d4d] px-1 text-[10px] font-black text-white',
        )}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  )
}
