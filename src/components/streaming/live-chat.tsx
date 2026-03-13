"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageCircle, User, LogIn, X, Loader2, Trash2, Edit2, Smile } from 'lucide-react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { chatApi } from '@/lib/api/chat';
import type { VolChatMessageOut } from '@/types/chat';
import { getUserColors } from '@/lib/utils';

interface LiveChatProps {
  slug: string; // Stream slug for chat
  isCreator?: boolean; // If true, show creator controls (delete, edit)
  companyName?: string; // Company name for displaying creator messages
}

export function LiveChat({ slug, isCreator = false, companyName }: LiveChatProps) {
  const { user, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<VolChatMessageOut[]>([]);
  const [newMessage, setNewMessage] = useState('');
const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
const emojiPickerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastFetchRef = useRef<number>(0);
  
  // Fetch messages
  const fetchMessages = useCallback(async (isInitial = false) => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    
    try {
      if (isInitial) setIsLoading(true);
      const data = await chatApi.getMessages(slug, 1, 50);
      // API returns newest first, so reverse to show oldest at top, newest at bottom
      const sortedMessages = [...data].reverse();
      
      if (isInitial) {
        setMessages(sortedMessages);
      } else {
        // Merge new messages, avoiding duplicates
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newMessages = sortedMessages.filter(m => !existingIds.has(m.id));
          if (newMessages.length === 0) return prev;
          return [...prev, ...newMessages];
        });
      }
      setError(null);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      setError('Failed to load chat');
    } finally {
      if (isInitial) setIsLoading(false);
    }
  }, [slug, isAuthenticated]);
  
// Poll for new messages every 3 seconds when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    
    fetchMessages(true);
    
    const interval = setInterval(() => fetchMessages(false), 3000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchMessages]);
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !isAuthenticated) return;
    
    try {
      setIsSending(true);
      const message = await chatApi.sendMessage(slug, newMessage.trim());
      setMessages(prev => [...prev, message]);
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };
  
  // Delete message (creator only)
  const handleDeleteMessage = async (messageId: number) => {
    try {
      await chatApi.deleteMessage(messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };
  
// Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Handle emoji selection
  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage((prev) => prev + emojiData.emoji);
  };
  
  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);
  
  // Not authenticated view
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col h-full bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
          <MessageCircle className="w-5 h-5 text-sky-400" />
          <span className="text-white font-semibold">Live Chat</span>
        </div>
        
        {/* Login prompt */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
            <LogIn className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-white font-semibold mb-2">Join the conversation</h3>
          <p className="text-slate-400 text-sm mb-4">
            Sign in to send messages and interact with the stream
          </p>
          <div className="flex gap-3">
            <Link
              href="/login"
              className="px-4 py-2 rounded-full bg-sky-500 hover:bg-sky-600 text-white font-medium text-sm transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup/user"
              className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  // Authenticated view
  return (
    <div className="flex flex-col h-full bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
        <MessageCircle className="w-5 h-5 text-sky-400" />
        <span className="text-white font-semibold">Live Chat</span>
        <span className="text-slate-500 text-xs">({messages.length})</span>
      </div>
      
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {isLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm">
            No messages yet. Be the first to chat!
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`group flex gap-3 ${message.is_deleted ? 'opacity-50' : ''} ${message.is_creator ? 'bg-sky-500/10 -mx-2 px-2 rounded-lg' : ''}`}
              >
                {/* Avatar - Different style for creator messages */}
                {message.is_creator ? (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold border-2 border-sky-400">
                    {companyName?.toUpperCase().slice(0, 1) || 'C'}
                  </div>
                ) : (
                  (() => {
                    const { gradient } = getUserColors(message.username || '');
                    return (
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br ${gradient[0]} ${gradient[1]} flex items-center justify-center text-white text-xs font-bold`}>
                        {message.username?.toUpperCase().slice(0, 1) || '?'}
                      </div>
                    );
                  })()
                )}
                
                {/* Message content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {message.is_creator ? (
                      <span className="font-semibold text-sm text-sky-400 flex items-center gap-1">
                        {companyName || 'Creator'}
                        <span className="text-xs bg-sky-500/20 text-sky-400 px-1.5 py-0.5 rounded">CREATOR</span>
                      </span>
                    ) : (
                      (() => {
                        const { color } = getUserColors(message.username || '');
                        return (
                          <span className={`${color} font-semibold text-sm`}>
                            {message.username}
                          </span>
                        );
                      })()
                    )}
                    <span className="text-slate-500 text-xs">
                      {formatTime(message.created_at)}
                    </span>
                    {/* Creator controls */}
                    {isCreator && !message.is_deleted && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleDeleteMessage(message.id)}
                          className="p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400"
                          title="Delete message"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className={`text-sm ${message.is_deleted ? 'text-slate-600 italic' : message.is_creator ? 'text-white' : 'text-slate-200'}`}>
                    {message.is_deleted ? 'This message was deleted' : message.content}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>
      
{/* Message input */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-white/5">
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Send a message..."
              className="w-full px-4 py-2 pr-10 rounded-full bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-sky-500 transition-colors"
              disabled={isSending}
            />
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-sky-400 transition-colors"
              disabled={isSending}
            >
              <Smile className="w-5 h-5" />
            </button>
          </div>
          
          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div
              ref={emojiPickerRef}
              className="absolute bottom-full right-0 mb-2 z-50"
            >
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                theme={Theme.DARK}
                width={300}
                height={400}
                previewConfig={{ showPreview: false }}
                skinTonesDisabled
                searchDisabled={false}
              />
            </div>
          )}
          
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className="w-10 h-10 rounded-full bg-sky-500 hover:bg-sky-600 disabled:bg-sky-500/50 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default LiveChat;