import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, Plus, Search, Clock, CheckCircle2, AlertCircle, Shield, Briefcase, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Tickets() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTicketData, setNewTicketData] = useState({ recipientId: 'admin', type: 'client_to_admin', subject: '', initialMessage: '' });
  const [providers, setProviders] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchTickets = async () => {
    try {
      const data = await api.get<any[]>('/api/tickets');
      setTickets(data || []);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketDetail = async (ticketId: string) => {
    try {
      const data = await api.get<any>(`/api/tickets/${ticketId}`);
      setSelectedTicket(data);
    } catch (err) {
      console.error('Failed to fetch ticket detail:', err);
    }
  };

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(fetchTickets, 30000);
    return () => clearInterval(interval);
  }, []);

  // Refresh selected ticket messages periodically
  useEffect(() => {
    if (!selectedTicket) return;
    const interval = setInterval(() => {
      fetchTicketDetail(selectedTicket.id);
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedTicket?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [selectedTicket?.messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedTicket) return;

    try {
      await api.put(`/api/tickets/${selectedTicket.id}/message`, { text: newMessage });
      setNewMessage('');
      await fetchTicketDetail(selectedTicket.id);
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Failed to send message.');
    }
  };

  const handleCreateTicket = async () => {
    if (!newTicketData.subject || !newTicketData.initialMessage) return;

    try {
      await api.post('/api/tickets', {
        subject: newTicketData.subject,
        type: newTicketData.type,
        recipientId: newTicketData.recipientId,
        message: newTicketData.initialMessage,
      });
      setShowCreateModal(false);
      setNewTicketData({ recipientId: 'admin', type: 'client_to_admin', subject: '', initialMessage: '' });
      await fetchTickets();
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Failed to create ticket.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-12rem)] flex gap-8">
      {/* Sidebar: Ticket List */}
      <div className="w-80 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black tracking-tighter uppercase italic">Tickets</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-10 h-10 bg-neutral-900 text-white rounded-2xl flex items-center justify-center hover:scale-110 transition-all shadow-lg shadow-neutral-900/20"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar space-y-3">
          {tickets.length === 0 ? (
            <div className="p-8 text-center bg-white border border-neutral-100 rounded-[2rem] space-y-4">
              <MessageSquare className="w-8 h-8 text-neutral-200 mx-auto" />
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">No tickets found</p>
            </div>
          ) : (
            tickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(ticket => (
              <button
                key={ticket.id}
                onClick={() => fetchTicketDetail(ticket.id)}
                className={cn(
                  "w-full p-5 rounded-[2rem] border transition-all text-left space-y-2 group",
                  selectedTicket?.id === ticket.id
                    ? "bg-neutral-900 border-neutral-900 text-white shadow-xl shadow-neutral-900/20"
                    : "bg-white border-neutral-100 hover:border-neutral-900"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                    selectedTicket?.id === ticket.id ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-500"
                  )}>
                    {ticket.status}
                  </span>
                  <span className="text-[8px] font-bold opacity-40">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h4 className="font-bold text-sm line-clamp-1">{ticket.subject}</h4>
                <p className={cn(
                  "text-[10px] uppercase tracking-widest font-black",
                  selectedTicket?.id === ticket.id ? "text-white/60" : "text-neutral-400"
                )}>
                  {ticket.type === 'client_to_admin' ? 'Support' : 'Provider Dispute'}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main: Chat Interface */}
      <div className="flex-1 bg-white border border-neutral-100 rounded-[3rem] shadow-sm flex flex-col overflow-hidden">
        {selectedTicket ? (
          <>
            {/* Chat Header */}
            <div className="p-6 border-b border-neutral-50 flex items-center justify-between bg-neutral-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-neutral-900 text-white rounded-2xl flex items-center justify-center font-black italic">
                  {selectedTicket.subject[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{selectedTicket.subject}</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                    Ticket #{selectedTicket.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                  selectedTicket.status === 'open' ? "bg-blue-100 text-blue-600" :
                  selectedTicket.status === 'in_progress' ? "bg-amber-100 text-amber-600" :
                  "bg-emerald-100 text-emerald-600"
                )}>
                  {selectedTicket.status}
                </span>
              </div>
            </div>

            {/* Messages Area */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar"
            >
              {(selectedTicket.messages || []).map((msg: any, i: number) => {
                const isMe = msg.senderId === user?.id;
                return (
                  <div key={i} className={cn(
                    "flex flex-col max-w-[80%]",
                    isMe ? "ml-auto items-end" : "mr-auto items-start"
                  )}>
                    <div className={cn(
                      "p-4 rounded-3xl text-sm",
                      isMe ? "bg-neutral-900 text-white rounded-tr-none" : "bg-neutral-100 text-neutral-900 rounded-tl-none"
                    )}>
                      {msg.text}
                    </div>
                    <span className="text-[8px] font-bold text-neutral-400 mt-1 px-2">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-6 border-t border-neutral-50 bg-neutral-50/30">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="w-full pl-6 pr-16 py-4 bg-white border border-neutral-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900 transition-all shadow-sm"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-neutral-900 text-white rounded-xl flex items-center justify-center hover:scale-105 transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6">
            <div className="w-24 h-24 bg-neutral-50 rounded-[2.5rem] flex items-center justify-center">
              <MessageSquare className="w-10 h-10 text-neutral-200" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black italic uppercase tracking-tight">Select a Ticket</h3>
              <p className="text-neutral-400 text-sm max-w-xs mx-auto">Choose a conversation from the sidebar or create a new support request.</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-8 py-3 bg-neutral-900 text-white rounded-2xl font-bold text-sm shadow-xl shadow-neutral-900/20"
            >
              Start New Ticket
            </button>
          </div>
        )}
      </div>

      {/* Create Ticket Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-lg bg-white rounded-[3rem] p-10 space-y-8 shadow-2xl"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-neutral-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black italic uppercase tracking-tight">New Ticket</h2>
                <p className="text-neutral-500 text-sm">How can we help you today?</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setNewTicketData({ ...newTicketData, type: 'client_to_admin', recipientId: 'admin' })}
                    className={cn(
                      "p-4 rounded-2xl border transition-all text-left space-y-2",
                      newTicketData.type === 'client_to_admin' ? "bg-neutral-900 border-neutral-900 text-white" : "bg-neutral-50 border-neutral-100"
                    )}
                  >
                    <Shield className="w-5 h-5" />
                    <span className="font-bold text-xs block">Support</span>
                  </button>
                  <button
                    onClick={() => setNewTicketData({ ...newTicketData, type: 'client_to_provider' })}
                    className={cn(
                      "p-4 rounded-2xl border transition-all text-left space-y-2",
                      newTicketData.type === 'client_to_provider' ? "bg-neutral-900 border-neutral-900 text-white" : "bg-neutral-50 border-neutral-100"
                    )}
                  >
                    <Briefcase className="w-5 h-5" />
                    <span className="font-bold text-xs block">Provider</span>
                  </button>
                </div>

                {newTicketData.type === 'client_to_provider' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Provider ID</label>
                    <input
                      type="text"
                      placeholder="Enter provider ID..."
                      value={newTicketData.recipientId === 'admin' ? '' : newTicketData.recipientId}
                      onChange={(e) => setNewTicketData({ ...newTicketData, recipientId: e.target.value })}
                      className="w-full p-4 bg-neutral-50 border border-neutral-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900 transition-all font-bold text-sm"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Subject</label>
                  <input
                    type="text"
                    placeholder="Brief summary of the issue"
                    value={newTicketData.subject}
                    onChange={(e) => setNewTicketData({ ...newTicketData, subject: e.target.value })}
                    className="w-full p-4 bg-neutral-50 border border-neutral-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Message</label>
                  <textarea
                    placeholder="Describe your issue in detail..."
                    rows={4}
                    value={newTicketData.initialMessage}
                    onChange={(e) => setNewTicketData({ ...newTicketData, initialMessage: e.target.value })}
                    className="w-full p-4 bg-neutral-50 border border-neutral-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900 transition-all resize-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleCreateTicket}
                  className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-bold text-sm hover:scale-[1.02] transition-all"
                >
                  Create Ticket
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-full py-4 bg-white text-neutral-400 rounded-2xl font-bold text-sm hover:text-neutral-900 transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
