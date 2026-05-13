import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import api from '../../lib/api'

type Message = {
  id: string
  senderId: string
  senderRole: string
  displayText: string
  createdAt: string
}

type Thread = {
  id: string
  isClosed: boolean
}

type ThreadResponse = {
  thread: Thread
  messages: Message[]
  role: string
  readOnly?: boolean
}

export function OrderChatPanel({ orderId, currentUserId }: { orderId: string; currentUserId: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [thread, setThread] = useState<Thread | null>(null)
  const [readOnly, setReadOnly] = useState(false)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.get<ThreadResponse>(`/orders/${orderId}/chat/thread`)
      .then((res) => {
        setThread(res.data.thread)
        setMessages(res.data.messages)
        setReadOnly(res.data.readOnly ?? false)
      })
      .catch(() => setError('Could not load chat.'))
      .finally(() => setLoading(false))
  }, [orderId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      const res = await api.post<Message>(`/orders/${orderId}/chat/messages`, { text: text.trim() })
      setMessages((prev) => [...prev, res.data])
      setText('')
    } catch {
      setError('Failed to send message.')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-10 rounded-lg bg-gray-100" />
        ))}
      </div>
    )
  }

  if (error && !thread) {
    return <p className="text-sm text-red-600">{error}</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 max-h-80 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-3">
        {messages.length === 0 && (
          <p className="text-center text-sm text-gray-400">No messages yet. Say hello!</p>
        )}
        {messages.map((m) => {
          const mine = m.senderId === currentUserId
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                  mine ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-800'
                }`}
              >
                {m.displayText}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {!readOnly && thread && !thread.isClosed && (
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && void send()}
            placeholder="Type a message…"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            disabled={!text.trim() || sending}
            onClick={() => void send()}
            className="rounded-lg bg-blue-600 px-3 py-2 text-white disabled:opacity-50"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      )}

      {readOnly && (
        <p className="text-xs text-gray-400 text-center">Chat is read-only at this stage.</p>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
