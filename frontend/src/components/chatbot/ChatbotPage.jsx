// src/components/chatbot/ChatbotPage.jsx
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Trash2, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { chatAPI } from '../../utils/api';

const SUGGESTIONS = [
  'Who coordinated the AI workshop?',
  'Show me March 2025 events',
  'Find the astronomy report',
  'What events happened in February?',
  'List all uploaded Excel sheets',
  'Find photos from robotics event',
];

export default function ChatbotPage() {
  const qc = useQueryClient();
  const [input, setInput] = useState('');
  const [localMessages, setLocalMessages] = useState([]);
  const messagesEndRef = useRef(null);

  const { data: historyData, isLoading: historyLoading } = useQuery(
    'chatHistory',
    () => chatAPI.history({ limit: 50 }).then((r) => r.data),
    {
      onSuccess: (data) => {
        if (data.messages?.length > 0 && localMessages.length === 0) {
          setLocalMessages(data.messages.map((m) => ({
            id: m.id,
            role: m.role === 'USER' ? 'user' : 'assistant',
            content: m.content,
            sources: m.sources,
            time: m.createdAt,
          })));
        }
      },
    }
  );

  const sendMutation = useMutation(
    (message) => chatAPI.send(message),
    {
      onMutate: (message) => {
        // Optimistically add user message
        const userMsg = {
          id: `temp-${Date.now()}`,
          role: 'user',
          content: message,
          time: new Date().toISOString(),
        };
        setLocalMessages((prev) => [...prev, userMsg]);
      },
      onSuccess: ({ data }) => {
        const aiMsg = {
          id: data.messageId,
          role: 'assistant',
          content: data.message,
          sources: data.sources,
          time: new Date().toISOString(),
        };
        setLocalMessages((prev) => [...prev, aiMsg]);
      },
      onError: (err) => {
        toast.error(err.response?.data?.error || 'Failed to get response');
        setLocalMessages((prev) => prev.filter((m) => !m.id.startsWith('temp-')));
      },
    }
  );

  const clearMutation = useMutation(() => chatAPI.clear(), {
    onSuccess: () => {
      setLocalMessages([]);
      qc.invalidateQueries('chatHistory');
      toast.success('Chat cleared');
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [localMessages]);

  const handleSend = (msg) => {
    const message = msg || input.trim();
    if (!message || sendMutation.isLoading) return;
    setInput('');
    sendMutation.mutate(message);
  };

  const isTyping = sendMutation.isLoading;

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {/* Header */}
      <div className="card px-5 py-4 mb-4 flex items-center gap-3 rounded-b-none rounded-t-xl border-b-0">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-400 flex items-center justify-center shadow-sm">
          <Bot size={20} className="text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-heading font-bold text-sm text-gray-900">OrgDoc AI Assistant</h3>
          <p className="text-xs text-emerald-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            Online · RAG-powered · Semantic Search
          </p>
        </div>
        <button
          onClick={() => clearMutation.mutate()}
          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
          title="Clear history"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-white border border-gray-100 px-4 py-4 space-y-4">
        {/* Welcome */}
        {localMessages.length === 0 && !historyLoading && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-400 flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Sparkles size={28} className="text-white" />
            </div>
            <h3 className="font-heading font-bold text-gray-800 text-lg">Hi! I'm OrgDoc AI</h3>
            <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">
              I have access to all your events, documents, spreadsheets, and reports.
              Ask me anything about your organization's data!
            </p>
          </motion.div>
        )}

        {/* Message list */}
        <AnimatePresence initial={false}>
          {localMessages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2.5 items-end ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold ${
                msg.role === 'assistant'
                  ? 'bg-gradient-to-br from-purple-500 to-pink-400'
                  : 'bg-purple-100 text-purple-600'
              }`}>
                {msg.role === 'assistant' ? <Bot size={14} /> : <User size={14} />}
              </div>

              <div className={`max-w-[72%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-purple-500 text-white rounded-br-sm'
                    : 'bg-gray-50 border border-gray-100 text-gray-800 rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>

                {/* Sources */}
                {msg.sources?.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {msg.sources.slice(0, 3).map((src, i) => (
                      <span key={i} className="text-[10px] bg-purple-50 text-purple-500 px-2 py-0.5 rounded-full font-medium">
                        {src.type === 'event' ? '📅' : '📄'} {src.name || src.eventTitle}
                      </span>
                    ))}
                  </div>
                )}

                <span className="text-[10px] text-gray-300 mt-1 px-1">
                  {msg.time ? format(new Date(msg.time), 'h:mm a') : ''}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {isTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2.5 items-end">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-400 flex items-center justify-center flex-shrink-0">
              <Bot size={14} className="text-white" />
            </div>
            <div className="bg-gray-50 border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="w-1.5 h-1.5 bg-purple-400 rounded-full"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      <div className="bg-white border-x border-gray-100 px-4 py-2.5 flex gap-2 overflow-x-auto scrollbar-hide">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => handleSend(s)}
            disabled={isTyping}
            className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border border-purple-200 text-purple-600 bg-purple-50 hover:bg-purple-500 hover:text-white hover:border-purple-500 transition-all disabled:opacity-40"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="bg-white border border-gray-100 rounded-t-none rounded-b-xl px-4 py-3 flex gap-3 items-center shadow-sm">
        <input
          className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all placeholder-gray-400"
          placeholder="Ask about events, documents, coordinators..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          disabled={isTyping}
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || isTyping}
          className="w-10 h-10 bg-purple-500 hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl flex items-center justify-center text-white transition-all active:scale-95"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
