import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  User,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import { getSchedule, type ScheduleEvent } from '../../services/business'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'border-l-blue-500 bg-blue-500/10',
  in_progress: 'border-l-yellow-500 bg-yellow-500/10',
  completed: 'border-l-green-500 bg-green-500/10',
  cancelled: 'border-l-red-500 bg-red-500/10',
  disputed: 'border-l-orange-500 bg-orange-500/10',
}

function ScheduleEventCard({ event }: { event: ScheduleEvent }) {
  const colorClass = STATUS_COLORS[event.status] || 'border-l-gray-500 bg-gray-500/10'
  return (
    <div className={`rounded-lg border-l-4 border border-[#2a2f4a] p-3 ${colorClass}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[#f0f2ff] truncate">{event.title}</p>
          <p className="text-xs text-[#8a8ea8] mt-0.5">{event.serviceName}</p>
        </div>
        <span className="shrink-0 rounded-full border border-[#2a2f4a] bg-[#0d0f1a] px-2 py-0.5 text-[10px] font-medium text-[#6a6e88] capitalize">
          {event.status.replace(/_/g, ' ')}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#6a6e88]">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatTime(event.start)} – {formatTime(event.end)}
        </span>
        {event.staffName && (
          <span className="inline-flex items-center gap-1">
            <User className="h-3 w-3" />
            {event.staffName}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {event.clientName}
        </span>
      </div>
    </div>
  )
}

export default function Schedule() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const today = useMemo(() => new Date(), [])
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<Date | null>(today)
  const [staffFilter, setStaffFilter] = useState('')

  const monthStart = useMemo(() => new Date(currentYear, currentMonth, 1), [currentMonth, currentYear])
  const monthEnd = useMemo(() => new Date(currentYear, currentMonth + 1, 0), [currentMonth, currentYear])

  const { data: events = [], isLoading, error, refetch } = useQuery({
    queryKey: ['schedule', workspaceId, currentMonth, currentYear],
    queryFn: () =>
      getSchedule(workspaceId!, {
        dateFrom: monthStart.toISOString(),
        dateTo: monthEnd.toISOString(),
        staffId: staffFilter || undefined,
      }),
    enabled: !!workspaceId,
  })

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)

  const eventsByDate = useMemo(() => {
    const map = new Map<string, ScheduleEvent[]>()
    for (const event of events) {
      const dateKey = new Date(event.start).toDateString()
      if (!map.has(dateKey)) map.set(dateKey, [])
      map.get(dateKey)!.push(event)
    }
    return map
  }, [events])

  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return []
    return eventsByDate.get(selectedDate.toDateString()) || []
  }, [eventsByDate, selectedDate])

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const isToday = (day: number) => {
    const d = new Date(currentYear, currentMonth, day)
    return d.toDateString() === today.toDateString()
  }

  const isSelected = (day: number) => {
    if (!selectedDate) return false
    const d = new Date(currentYear, currentMonth, day)
    return d.toDateString() === selectedDate.toDateString()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#f0f2ff]">Schedule</h1>
          <p className="text-sm text-[#8a8ea8]">View and manage your upcoming jobs</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Filter by staff..."
            value={staffFilter}
            onChange={(e) => setStaffFilter(e.target.value)}
            className="rounded-xl border border-[#2a2f4a] bg-[#1a1d2e] px-3 py-2 text-sm text-[#f0f2ff] placeholder-[#6a6e88] outline-none transition-colors focus:border-[#2b6eff]"
          />
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-xl border border-[#2a2f4a] bg-[#1a1d2e] px-4 py-2 text-sm text-[#f0f2ff] transition-colors hover:bg-[#2a2f4a]"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
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
          <p className="text-sm text-red-300">Failed to load schedule. Please try again.</p>
          <button
            onClick={() => refetch()}
            className="rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/30"
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !error && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Calendar Grid */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-[#2a2f4a] bg-[#1a1d2e] p-4">
              {/* Month navigation */}
              <div className="mb-4 flex items-center justify-between">
                <button
                  onClick={prevMonth}
                  className="rounded-lg p-2 text-[#6a6e88] transition-colors hover:bg-[#2a2f4a] hover:text-[#f0f2ff]"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <h2 className="text-lg font-semibold text-[#f0f2ff]">
                  {MONTH_NAMES[currentMonth]} {currentYear}
                </h2>
                <button
                  onClick={nextMonth}
                  className="rounded-lg p-2 text-[#6a6e88] transition-colors hover:bg-[#2a2f4a] hover:text-[#f0f2ff]"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              {/* Day headers */}
              <div className="mb-2 grid grid-cols-7 gap-1">
                {DAY_NAMES.map((day) => (
                  <div key={day} className="py-2 text-center text-xs font-medium text-[#6a6e88]">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells before first day */}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {/* Day cells */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const dateKey = new Date(currentYear, currentMonth, day).toDateString()
                  const dayEvents = eventsByDate.get(dateKey) || []
                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDate(new Date(currentYear, currentMonth, day))}
                      className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition-colors ${
                        isSelected(day)
                          ? 'bg-[#2b6eff] text-white'
                          : isToday(day)
                          ? 'border border-[#2b6eff] text-[#f0f2ff] hover:bg-[#2a2f4a]'
                          : 'text-[#8a8ea8] hover:bg-[#2a2f4a] hover:text-[#f0f2ff]'
                      }`}
                    >
                      <span className="text-sm font-medium">{day}</span>
                      {dayEvents.length > 0 && (
                        <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${
                          isSelected(day) ? 'bg-white' : 'bg-[#2b6eff]'
                        }`} />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Selected Date Events */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-[#f0f2ff]">
              {selectedDate ? (
                <>{formatDate(selectedDate.toISOString())}</>
              ) : (
                'Select a date'
              )}
              {selectedDateEvents.length > 0 && (
                <span className="ml-2 text-sm font-normal text-[#6a6e88]">
                  ({selectedDateEvents.length} event{selectedDateEvents.length !== 1 ? 's' : ''})
                </span>
              )}
            </h3>

            {selectedDateEvents.length === 0 && selectedDate && (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-[#2a2f4a] bg-[#1a1d2e] p-8 text-center">
                <Calendar className="h-8 w-8 text-[#3a3f5a]" />
                <p className="text-sm text-[#8a8ea8]">No events scheduled for this day</p>
              </div>
            )}

            <div className="space-y-2">
              {selectedDateEvents.map((event) => (
                <ScheduleEventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
