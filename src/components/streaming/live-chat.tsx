"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageCircle, LogIn, Loader2, Trash2, Smile, CornerUpLeft, X, ChevronDown } from 'lucide-react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { chatApi } from '@/lib/api/chat';
import type { VolChatMessageOut } from '@/types/chat';
import { getUserColors } from '@/lib/utils';

interface LiveChatProps {
  slug: string;
  isCreator?: boolean;
  companyName?: string;
}

/** Parse @username mentions in message content */
function parseMessageContent(content: string) {
  // Matches @username with zero-width space delimiter - supports multi-word names like @st albert uniben
  // The \u200B (zero-width space) acts as an invisible delimiter after the username
  const parts = content.split(/(@[\w]+(?:\s+[\w]+)*\u200B?)/g);
  return parts.map((part, i) => {
    // Remove the zero-width space delimiter for display
    const cleanPart = part.replace(/\u200B$/, '');
    return part.startsWith('@') ? (
      <span
        key={i}
        className="inline-flex items-center rounded-md bg-sky-50 px-1.5 py-0.5 text-xs font-semibold leading-tight text-sky-700"
      >
        {cleanPart}
      </span>
    ) : (
      <span key={i}>{part}</span>
    );
  });
}

/** Single message row */
function ChatMessage({
  message,
  isCreator,
  companyName,
  onReply,
  onDelete,
  replyTarget,
  currentUsername,
}: {
  message: VolChatMessageOut;
  isCreator: boolean;
  companyName?: string;
  onReply: (msg: VolChatMessageOut) => void;
  onDelete: (id: number) => void;
  replyTarget?: VolChatMessageOut | null;
  currentUsername?: string;
}) {
  const isSelf = message.username === currentUsername;
  const isOwnCreator = isCreator && message.is_creator;

  const { gradient, color } = useMemo(
    () => getUserColors(message.username || ''),
    [message.username]
  );

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={`group relative flex gap-2.5 rounded-xl px-3 py-2 transition-colors hover:bg-slate-50 ${
        message.is_deleted ? 'opacity-40' : ''
      } ${message.is_creator ? 'border border-sky-100 bg-sky-50/60' : ''}`}
    >
      {/* Avatar */}
      {message.is_creator ? (
        <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-sky-600 text-[10px] font-black text-white">
          {companyName?.slice(0, 1).toUpperCase() || 'C'}
        </div>
      ) : (
        <div
          className={`flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br ${gradient[0]} ${gradient[1]} flex items-center justify-center text-white text-[10px] font-black mt-0.5`}
        >
          {message.username?.slice(0, 1).toUpperCase() || '?'}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 min-w-0">
        {/* Name + time */}
        <div className="flex items-baseline gap-1.5 flex-wrap">
          {message.is_creator ? (
            <span className="text-xs font-bold leading-none text-sky-700">
              {companyName || 'Creator'}
              <span className="ml-1.5 rounded-full bg-sky-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-sky-700">
                Host
              </span>
            </span>
          ) : (
            <span className={`${color} font-bold text-xs leading-none`}>{message.username}</span>
          )}
          <span className="text-[10px] leading-none text-slate-400">{formatTime(message.created_at)}</span>
        </div>

        {/* Content */}
        <p
          className={`text-sm mt-1 leading-relaxed break-words ${
            message.is_deleted
              ? 'text-slate-400 italic'
              : message.is_creator
              ? 'text-slate-800'
              : 'text-slate-700'
          }`}
        >
          {message.is_deleted ? 'Message removed' : parseMessageContent(message.content)}
        </p>
      </div>

      {/* Hover actions */}
      {!message.is_deleted && (
        <div className="absolute right-2 top-1.5 flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-1.5 py-1 opacity-0 shadow-sm transition-all duration-150 group-hover:opacity-100">
          <button
            onClick={() => onReply(message)}
            className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-sky-600"
            title="Reply"
          >
            <CornerUpLeft className="w-3 h-3" />
          </button>
          {isCreator && (
            <button
              onClick={() => onDelete(message.id)}
              className="p-1 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}

/** "Scroll to bottom" floating button */
function ScrollToBottomButton({ visible, onClick }: { visible: boolean; onClick: () => void }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 8 }}
          onClick={onClick}
          className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 rounded-full bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md transition-colors hover:bg-sky-500"
        >
          <ChevronDown className="w-3.5 h-3.5" />
          New messages
        </motion.button>
      )}
    </AnimatePresence>
  );
}

export function LiveChat({ slug, isCreator = false, companyName }: LiveChatProps) {
  const { user, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<VolChatMessageOut[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyTo, setReplyTo] = useState<VolChatMessageOut | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Track the highest message ID we've seen so polling never re-inserts old messages
  const maxIdRef = useRef<number>(0);

  // ─── Fetch ────────────────────────────────────────────────────────────────
  const fetchMessages = useCallback(
    async (isInitial = false) => {
      if (!isAuthenticated) {
        setIsLoading(false);
        return;
      }
      try {
        if (isInitial) setIsLoading(true);

        // API returns chronological order (oldest first), no reversal needed
        const data = await chatApi.getMessages(slug, 1, 50);
        const chronological = data;

        if (isInitial) {
          setMessages(chronological);
          // Seed the max-ID cursor from the initial load
          if (chronological.length > 0) {
            maxIdRef.current = Math.max(...chronological.map((m) => m.id));
          }
        } else {
          // Only keep messages strictly newer than what we already have
          const truly_new = chronological.filter((m) => m.id > maxIdRef.current);
          if (truly_new.length === 0) return;

          // Advance the cursor
          maxIdRef.current = Math.max(...truly_new.map((m) => m.id));

          setMessages((prev) => {
            if (!isAtBottom) setUnreadCount((c) => c + truly_new.length);
            return [...prev, ...truly_new];
          });
        }
        setError(null);
      } catch {
        setError('Failed to load chat');
      } finally {
        if (isInitial) setIsLoading(false);
      }
    },
    [slug, isAuthenticated, isAtBottom]
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchMessages(true);
    const interval = setInterval(() => fetchMessages(false), 3000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchMessages]);

  // ─── Scroll tracking ──────────────────────────────────────────────────────
  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const threshold = 80;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    setIsAtBottom(atBottom);
    if (atBottom) setUnreadCount(0);
  }, []);

  // Auto-scroll only when user is already at bottom
  useEffect(() => {
    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAtBottom]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setUnreadCount(0);
    setIsAtBottom(true);
  }, []);

  // ─── Send ─────────────────────────────────────────────────────────────────
  const handleSendMessage = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = newMessage.trim();
      if (!trimmed || !isAuthenticated) return;

      // Prepend display name if replying — use companyName for host, @username for regular users
      // Add zero-width space (\u200B) as delimiter after username for clear parsing
      const replyPrefix = replyTo
        ? replyTo.is_creator
          ? `@${companyName || 'Host'}\u200B `
          : `@${replyTo.username}\u200B `
        : '';
      const content = replyPrefix + trimmed;

      try {
        setIsSending(true);
        const message = await chatApi.sendMessage(slug, content);
        setMessages((prev) => [...prev, message]);
        // Update the cursor to prevent duplicate on next poll
        maxIdRef.current = Math.max(maxIdRef.current, message.id);
        setNewMessage('');
        setReplyTo(null);
        // Always scroll after own send
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      } catch {
        setError('Failed to send message');
      } finally {
        setIsSending(false);
      }
    },
    [newMessage, isAuthenticated, replyTo, slug]
  );

  // ─── Delete ───────────────────────────────────────────────────────────────
  const handleDeleteMessage = useCallback(async (id: number) => {
    try {
      await chatApi.deleteMessage(id);
      setMessages((prev) => prev.filter((m) => m.id !== id));
    } catch {
      /* silent */
    }
  }, []);

  // ─── Reply ────────────────────────────────────────────────────────────────
  const handleReply = useCallback((msg: VolChatMessageOut) => {
    setReplyTo(msg);
    inputRef.current?.focus();
  }, []);

  // ─── Emoji ────────────────────────────────────────────────────────────────
  const handleEmojiClick = useCallback((data: EmojiClickData) => {
    setNewMessage((prev) => prev + data.emoji);
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!showEmojiPicker) return;
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showEmojiPicker]);

  // ─── Unauthenticated ──────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <ChatHeader messageCount={0} />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-white/8 flex items-center justify-center">
            <LogIn className="w-6 h-6 text-slate-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Join the conversation</p>
            <p className="text-slate-500 text-xs mt-1">Sign in to chat with the stream</p>
          </div>
          <div className="flex gap-2">
            <Link href="/login" className="px-4 py-2 rounded-full bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs transition-colors">
              Sign In
            </Link>
            <Link href="/signup/user" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Authenticated ────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <ChatHeader messageCount={messages.length} />

      {/* Messages */}
      <div className="relative flex-1 min-h-0">
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="absolute inset-0 overflow-y-auto py-2 space-y-0.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20"
          style={{ scrollbarWidth: 'thin' }}
        >
          {isLoading && messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-5 h-5 text-sky-400 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-6">
              <MessageCircle className="h-8 w-8 text-slate-300" />
              <p className="text-slate-500 text-sm">No messages yet</p>
              <p className="text-xs text-slate-400">Be the first to say something!</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  isCreator={isCreator}
                  companyName={companyName}
                  onReply={handleReply}
                  onDelete={handleDeleteMessage}
                  currentUsername={user?.username}
                />
              ))}
            </AnimatePresence>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to bottom pill */}
        <ScrollToBottomButton
          visible={!isAtBottom && unreadCount > 0}
          onClick={scrollToBottom}
        />
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mx-3 mb-1 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-between"
          >
            <p className="text-red-400 text-xs">{error}</p>
            <button onClick={() => setError(null)}>
              <X className="w-3.5 h-3.5 text-red-400 hover:text-red-300" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply banner */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="mx-3 mb-1.5 px-3 py-2 rounded-xl bg-sky-500/8 border border-sky-500/20 flex items-center gap-2"
          >
            <CornerUpLeft className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sky-400 text-xs font-semibold">
                {replyTo.is_creator ? (companyName || 'Host') : `@${replyTo.username}`}{' '}
              </span>
              <span className="text-slate-400 text-xs truncate">{replyTo.content}</span>
            </div>
            <button
              onClick={() => setReplyTo(null)}
              className="flex-shrink-0 p-0.5 rounded hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="p-3 border-t border-white/5">
        <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={replyTo ? `Reply to ${replyTo.is_creator ? (companyName || 'Host') : `@${replyTo.username}`}…` : 'Send a message…'}
              maxLength={500}
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-3.5 pr-9 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              disabled={isSending}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && replyTo) setReplyTo(null);
              }}
            />
            <button
              type="button"
              onClick={() => setShowEmojiPicker((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-sky-400 transition-colors"
              disabled={isSending}
              tabIndex={-1}
            >
              <Smile className="w-4 h-4" />
            </button>
          </div>

          <button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className="flex-shrink-0 w-9 h-9 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all active:scale-95"
          >
            {isSending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Emoji picker */}
          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div
                ref={emojiPickerRef}
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-full right-10 mb-2 z-50 shadow-2xl rounded-2xl overflow-hidden border border-white/10"
              >
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  theme={Theme.LIGHT}
                  width={300}
                  height={380}
                  previewConfig={{ showPreview: false }}
                  skinTonesDisabled
                />
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </div>
    </div>
  );
}

function ChatHeader({ messageCount }: { messageCount: number }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-slate-200 bg-white px-4 py-3">
      <div className="relative">
        <MessageCircle className="w-4 h-4 text-sky-400" />
        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 ring-1 ring-[#0d1117]" />
      </div>
      <span className="text-sm font-semibold tracking-tight text-slate-900">Live chat</span>
      {messageCount > 0 && (
        <span className="ml-auto text-slate-600 text-[11px] font-medium tabular-nums">
          {messageCount.toLocaleString()}
        </span>
      )}
    </div>
  );
}

export default LiveChat;
