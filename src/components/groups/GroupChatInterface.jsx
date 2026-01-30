import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Send, MoreVertical, Trash2 } from "lucide-react";
import { format, parseISO } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from 'framer-motion';

export default function GroupChatInterface({ groupId, currentUser }) {
  const [messageText, setMessageText] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ['group-messages', groupId],
    queryFn: () => base44.entities.GroupMessage.filter({ group_id: groupId }, '-created_date', 100),
    enabled: !!groupId,
  });

  // Real-time subscription for messages
  useEffect(() => {
    if (!groupId) return;

    const unsubscribe = base44.entities.GroupMessage.subscribe((event) => {
      if (event.data?.group_id === groupId) {
        queryClient.invalidateQueries({ queryKey: ['group-messages', groupId] });
      }
    });

    return unsubscribe;
  }, [groupId, queryClient]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessageMutation = useMutation({
    mutationFn: async (text) => {
      return base44.entities.GroupMessage.create({
        group_id: groupId,
        sender_id: currentUser.id,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name,
        message_text: text,
      });
    },
    onSuccess: () => {
      setMessageText('');
      queryClient.invalidateQueries({ queryKey: ['group-messages', groupId] });
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: (messageId) =>
      base44.entities.GroupMessage.update(messageId, { is_deleted: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-messages', groupId] });
    },
  });

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (messageText.trim()) {
      sendMessageMutation.mutate(messageText.trim());
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const visibleMessages = messages.filter(m => !m.is_deleted);

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {visibleMessages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`flex gap-3 ${message.sender_id === currentUser.id ? 'justify-end' : 'justify-start'}`}
            >
              {message.sender_id !== currentUser.id && (
                <Avatar className="w-8 h-8 bg-indigo-100 text-indigo-600 flex-shrink-0">
                  <AvatarFallback className="text-xs font-bold">
                    {getInitials(message.sender_name)}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className={`max-w-xs ${message.sender_id === currentUser.id ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                {message.sender_id !== currentUser.id && (
                  <p className="text-xs font-medium text-gray-600">{message.sender_name}</p>
                )}
                <div
                  className={`rounded-lg px-4 py-2 ${
                    message.sender_id === currentUser.id
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-gray-100 text-gray-900 rounded-bl-none'
                  }`}
                >
                  <p className="text-sm break-words">{message.message_text}</p>
                  {message.is_edited && (
                    <p className={`text-xs mt-1 ${message.sender_id === currentUser.id ? 'text-indigo-200' : 'text-gray-500'}`}>
                      (edited)
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-400">
                    {format(parseISO(message.created_date), 'HH:mm')}
                  </p>
                  {message.sender_id === currentUser.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => deleteMessageMutation.mutate(message.id)}
                          className="text-rose-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 p-4">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
            disabled={sendMessageMutation.isPending}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!messageText.trim() || sendMessageMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}