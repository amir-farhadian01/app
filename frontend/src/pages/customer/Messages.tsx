import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '../../store/authStore'
import api from '../../lib/api'
import { Search, Send, ChevronLeft, MessageSquare, Loader2 } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────

type Conversation = {
  id: string
  participant: {
    id: string
    displayName: string | null
    firstName: string | null
    lastName: string | null
    avatarUrl: string | null
  }
  lastMessage: {
    content: string
    createdAt: string
    senderId: string
  } | null
  unreadCount: number
}

type Message = {
  id: string
  content: string
  senderId: string
  createdAt: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  return `${days}d`
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// ── Conversation List ──────────────────────────────────────────────────────

function ConversationList({
  conversations,
  activeId,
  onSelect,
  loading,
}: {
  conversations: Conversation[]
  activeId: string | null
  onSelect: (id: string) => void
  loading: boolean
}) {
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? conversations.filter((c) => {
        const name = c.participant.displayName || c.participant.firstName || c.participant.lastName || ''
        return name.toLowerCase().includes(search.toLowerCase())
      })
    : conversations

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="border-b border-[#2a2f4a] p-3">
        <div className="flex items-center gap-2 rounded-lg border border-[#2a2f4a] bg-[#1a1d2e] px-3 py-2">
          <Search className="h-4 w-4 text-[#6a6e88]" />
          <input
            type="text"
            placeholder="Search conversations…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-[#f0f2ff] placeholder-[#4a4f70] outline-none"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#6a6e88]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <MessageSquare className="h-12 w-12 text-[#4a4f70]" />
            <p className="text-sm font-medium text-[#6a6e88]">No conversations yet</p>
            <p className="max-w-[200px] text-xs text-[#4a4f70]">
              Messages from providers will appear here
            </p>
          </div>
        ) : (
          filtered.map((conv) => {
            const isActive = conv.id === activeId
            const name = conv.participant.displayName || conv.participant.firstName || conv.participant.lastName || 'Unknown'
            const initial = name[0]?.toUpperCase() || '?'

            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={`flex w-full items-center gap-3 border-b border-[#2a2f4a] px-4 py-3 text-left transition-colors ${
                  isActive ? 'bg-[#1a1d2e]' : 'hover:bg-[#1a1d2e]/50'
                }`}
              >
                <div className="relative shrink-0">
                  {conv.participant.avatarUrl ? (
                    <img
                      src={conv.participant.avatarUrl}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2b6eff]/20 text-sm font-bold text-[#2b6eff]">
                      {initial}
                    </div>
                  )}
                  {conv.unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#2b6eff] px-1 text-[10px] font-bold text-white">
                      {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-semibold text-[#f0f2ff]">{name}</p>
                    {conv.lastMessage && (
                      <span className="ml-2 shrink-0 text-[10px] text-[#6a6e88]">
                        {timeAgo(conv.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-[#6a6e88]">
                    {conv.lastMessage?.content || 'No messages yet'}
                  </p>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

// ── Chat View ──────────────────────────────────────────────────────────────

function ChatView({
  conversationId,
  currentUserId,
  onBack,
}: {
  conversationId: string
  currentUserId: string
  onBack: () => void
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [participantName, setParticipantName] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    api.get<{ messages: Message[]; participantName: string }>(`/api/chat/${conversationId}`)
      .then((res) => {
        setMessages(res.data.messages || [])
        setParticipantName(res.data.participantName || 'Chat')
      })
      .catch(() => {
        // If endpoint doesn't exist yet, show empty state
        setMessages([])
        setParticipantName('Chat')
      })
      .finally(() => setLoading(false))
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    const tempId = `temp-${Date.now()}`
    const optimistic: Message = {
      id: tempId,
      content: text,
      senderId: currentUserId,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])
    setInput('')
    try {
      const res = await api.post<Message>(`/api/chat/${conversationId}/send`, { content: text })
      setMessages((prev) => prev.map((m) => (m.id === tempId ? res.data : m)))
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
    } finally {
      setSending(false)
    }
  }, [input, sending, conversationId, currentUserId])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[#2a2f4a] px-4 py-3">
        <button
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6a6e88] hover:bg-[#1a1d2e] hover:text-[#f0f2ff] lg:hidden"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2b6eff]/20 text-sm font-bold text-[#2b6eff]">
          {participantName[0]?.toUpperCase() || '?'}
        </div>
        <p className="text-sm font-semibold text-[#f0f2ff]">{participantName}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#6a6e88]" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <MessageSquare className="h-12 w-12 text-[#4a4f70]" />
            <p className="text-sm text-[#6a6e88]">No messages yet</p>
            <p className="max-w-[200px] text-xs text-[#4a4f70]">
              Send a message to start the conversation
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isMine = msg.senderId === currentUserId
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                      isMine
                        ? 'rounded-br-md bg-[#2b6eff] text-white'
                        : 'rounded-bl-md border border-[#2a2f4a] bg-[#1e2235] text-[#f0f2ff]'
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <p className={`mt-1 text-right text-[10px] ${isMine ? 'text-white/60' : 'text-[#6a6e88]'}`}>
                      {formatTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-[#2a2f4a] p-3">
        <div className="flex items-center gap-2 rounded-xl border border-[#2a2f4a] bg-[#1a1d2e] px-3 py-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            rows={1}
            className="max-h-20 flex-1 resize-none bg-transparent text-sm text-[#f0f2ff] placeholder-[#4a4f70] outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2b6eff] text-white transition-colors hover:bg-[#2b6eff]/80 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Messages Page ─────────────────────────────────────────────────────

export default function Messages() {
  const { user } = useAuthStore()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    setLoading(true)
    api.get<Conversation[]>('/api/chat/conversations')
      .then((res) => setConversations(res.data || []))
      .catch(() => setConversations([]))
      .finally(() => setLoading(false))
  }, [user?.id])

  const activeConversation = conversations.find((c) => c.id === activeConvId)

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-4xl overflow-hidden rounded-2xl border border-[#2a2f4a] bg-[#131624]">
      {/* Sidebar — hidden on mobile when a conversation is active */}
      <div className={`w-full border-r border-[#2a2f4a] lg:w-80 lg:block ${activeConvId ? 'hidden' : 'block'}`}>
        <ConversationList
          conversations={conversations}
          activeId={activeConvId}
          onSelect={setActiveConvId}
          loading={loading}
        />
      </div>

      {/* Chat area */}
      <div className={`flex-1 lg:block ${activeConvId ? 'block' : 'hidden'}`}>
        {activeConversation ? (
          <ChatView
            conversationId={activeConversation.id}
            currentUserId={user?.id || ''}
            onBack={() => setActiveConvId(null)}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <MessageSquare className="h-16 w-16 text-[#4a4f70]" />
            <p className="text-lg font-semibold text-[#f0f2ff]">Your Messages</p>
            <p className="max-w-[240px] text-center text-sm text-[#6a6e88]">
              Select a conversation from the sidebar to start chatting
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
