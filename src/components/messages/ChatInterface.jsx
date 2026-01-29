import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, MoreVertical, Volume2, VolumeX, Loader2 } from "lucide-react";
import { format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import OnlineStatusIndicator from '../admin/OnlineStatusIndicator';
import { useTypingIndicator } from '../hooks/useTypingIndicator';

export default function ChatInterface({ 
  user, 
  conversation, 
  conversationType, 
  onMuteToggle 
}) {
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const queryClient = useQueryClient();
  
  const isGroup = conversationType === 'group';
  const conversationId = isGroup ? conversation?.id : conversation?.other_user_id;
  
  const { typingUsers, sendTypingIndicator, stopTyping } = useTypingIndicator(
    user,
    conversationId,
    conversationType
  );

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', conversationType, conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      
      if (isGroup) {
        const msgs = await base44.entities.GroupMessage.filter(
          { group_id: conversationId, is_deleted: false },
          '-created_date'
        );
        return msgs || [];
      } else {
        const msgs = await base44.entities.Message.filter({
          $or: [
            { sender_id: user.id, receiver_id: conversationId },
            { sender_id: conversationId, receiver_id: user.id }
          ],
          is_deleted: false
        }, '-created_date');
        return msgs || [];
      }
    },
    enabled: !!conversationId,
    refetchInterval: false
  });

  // Subscribe to real-time messages
  useEffect(() => {
    if (!conversationId) return;

    const entityName = isGroup ? 'GroupMessage' : 'Message';
    const unsubscribe = base44.entities[entityName].subscribe((event) => {
      if (event.type === 'create' || event.type === 'update') {
        const msg = event.data;
        
        const isRelevant = isGroup 
          ? msg.group_id === conversationId
          : (msg.sender_id === conversationId && msg.receiver_id === user.id) ||
            (msg.sender_id === user.id && msg.receiver_id === conversationId);
        
        if (isRelevant) {
          queryClient.invalidateQueries(['messages', conversationType, conversationId]);
        }
      }
    });

    return unsubscribe;
  }, [conversationId, isGroup, queryClient, user.id, conversationType]);

  // Mark messages as read when opening chat
  useEffect(() => {
    const markAsRead = async () => {
      if (!conversationId || isGroup) return;
      
      try {
        const unreadMessages = await base44.entities.Message.filter({
          receiver_id: user.id,
          sender_id: conversationId,
          is_read: false
        });
        
        if (unreadMessages && unreadMessages.length > 0) {
          for (const msg of unreadMessages) {
            await base44.entities.Message.update(msg.id, { is_read: true });
          }
        }
      } catch (error) {
        console.error('Failed to mark messages as read:', error);
      }
    };

    markAsRead();
  }, [conversationId, user.id, isGroup]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (text) => {
      if (isGroup) {
        return await base44.entities.GroupMessage.create({
          group_id: conversationId,
          group_name: conversation.name,
          sender_id: user.id,
          sender_email: user.email,
          sender_name: user.full_name,
          message_text: text,
          is_edited: false,
          is_deleted: false
        });
      } else {
        return await base44.entities.Message.create({
          sender_id: user.id,
          sender_email: user.email,
          sender_name: user.full_name,
          receiver_id: conversationId,
          receiver_email: conversation.email,
          receiver_name: conversation.name,
          message_text: text,
          is_read: false,
          is_edited: false,
          is_deleted: false
        });
      }
    },
    onSuccess: () => {
      setMessageText('');
      stopTyping();
      queryClient.invalidateQueries(['messages', conversationType, conversationId]);
    }
  });

  const handleSend = () => {
    if (!messageText.trim()) return;
    sendMutation.mutate(messageText.trim());
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTyping = () => {
    sendTypingIndicator(true);
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <p>Select a conversation to start messaging</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="w-10 h-10">
              {conversation.profile_photo ? (
                <AvatarImage src={conversation.profile_photo} alt={conversation.name} />
              ) : (
                <AvatarFallback className="bg-indigo-100 text-indigo-600 font-semibold">
                  {getInitials(conversation.name)}
                </AvatarFallback>
              )}
            </Avatar>
            {!isGroup && conversation.is_online !== undefined && (
              <div className="absolute -bottom-0.5 -right-0.5">
                <OnlineStatusIndicator isOnline={conversation.is_online} size="sm" />
              </div>
            )}
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">{conversation.name}</h2>
            {!isGroup && conversation.last_seen && !conversation.is_online && (
              <p className="text-xs text-gray-500">
                Last seen {format(new Date(conversation.last_seen), 'MMM d, h:mm a')}
              </p>
            )}
            {isGroup && conversation.member_count && (
              <p className="text-xs text-gray-500">{conversation.member_count} members</p>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onMuteToggle}>
              {conversation.is_muted ? (
                <>
                  <Volume2 className="w-4 h-4 mr-2" />
                  Unmute Conversation
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 mr-2" />
                  Mute Conversation
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <>
            {messages.slice().reverse().map((msg) => {
              const isOwnMessage = msg.sender_id === user.id;
              
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  {!isOwnMessage && (
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
                        {getInitials(msg.sender_name)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className={`max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                    {!isOwnMessage && isGroup && (
                      <span className="text-xs text-gray-500 font-medium px-1">
                        {msg.sender_name}
                      </span>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-2 ${
                        isOwnMessage
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-gray-900 border border-gray-200'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {msg.message_text}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 px-1">
                      {format(new Date(msg.created_date), 'h:mm a')}
                    </span>
                  </div>
                </div>
              );
            })}
            
            {/* Typing indicator */}
            {typingUsers.length > 0 && (
              <div className="flex gap-2 items-center text-sm text-gray-500 italic">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span>
                  {typingUsers.map(u => u.user_name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                </span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={messageText}
            onChange={(e) => {
              setMessageText(e.target.value);
              handleTyping();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-h-[44px] max-h-32 resize-none"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!messageText.trim() || sendMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 h-[44px]"
          >
            {sendMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}