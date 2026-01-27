import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, Users, Circle } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import RichTextInput from '../messages/RichTextInput';
import GroupConversationMenu from './GroupConversationMenu';
import { toast } from 'react-hot-toast';

export default function GroupChatInterface({ group, currentUser }) {
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  // Fetch group members
  const { data: members = [] } = useQuery({
    queryKey: ['group-members', group.id],
    queryFn: () => base44.entities.GroupMember.filter({ group_id: group.id }),
    enabled: !!group,
  });

  // Fetch group messages
  const { data: messages = [] } = useQuery({
    queryKey: ['group-messages', group.id],
    queryFn: async () => {
      const allMessages = await base44.entities.GroupMessage.list('-created_date', 500);
      return allMessages
        .filter(m => m.group_id === group.id && !m.is_deleted)
        .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    },
    enabled: !!group,
    refetchInterval: 3000,
  });

  // Real-time subscription
  useEffect(() => {
    if (!group) return;

    const unsubscribe = base44.entities.GroupMessage.subscribe((event) => {
      if (event.type === 'create' && event.data.group_id === group.id) {
        queryClient.invalidateQueries({ queryKey: ['group-messages', group.id] });
        queryClient.invalidateQueries({ queryKey: ['all-group-messages'] });
      }
    });

    return unsubscribe;
  }, [group, queryClient]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (text) => {
      // Create group message
      const newMessage = await base44.entities.GroupMessage.create({
        group_id: group.id,
        group_name: group.group_name,
        sender_id: currentUser.id,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name,
        message_text: text,
        is_edited: false,
        is_deleted: false,
      });

      // Send notifications to all group members except sender
      const notificationPromises = members
        .filter(m => m.user_id !== currentUser.id)
        .map(member =>
          base44.entities.Notification.create({
            user_email: member.user_email,
            user_id: member.user_id,
            title: 'New Group Message',
            message: `${currentUser.full_name} sent a message in ${group.group_name}`,
            type: 'new_message',
            is_read: false,
            related_id: group.id,
          })
        );

      await Promise.all(notificationPromises);
      return newMessage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-messages'] });
      queryClient.invalidateQueries({ queryKey: ['all-group-messages'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setMessageText('');
    },
  });

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (messageText.trim() && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate(messageText.trim());
    }
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  // Count online members (from User entity)
  const { data: allUsers = [] } = useQuery({
    queryKey: ['users-for-online'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getUsersForMessaging', {});
      return response.data?.users || [];
    },
  });

  const onlineCount = members.filter(m => {
    const user = allUsers.find(u => u.id === m.user_id);
    return user?.is_online;
  }).length;

  return (
    <Card className="border-0 shadow-sm h-[600px] flex flex-col">
      {/* Chat Header */}
      <div className="p-4 border-b bg-white rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
            <span className="text-emerald-600 font-semibold">
              {getInitials(group.group_name)}
            </span>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{group.group_name}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Circle className="w-2 h-2 fill-green-500 text-green-500" />
              <span>{onlineCount} online • {members.length} members</span>
            </div>
          </div>
          <Badge className="bg-emerald-100 text-emerald-800">
            {group.group_type}
          </Badge>
          <GroupConversationMenu 
            group={group}
            onAction={(action) => {
              if (action === 'copy') {
                navigator.clipboard.writeText(group.group_name);
                toast.success('Group name copied');
              } else {
                toast.success(`${action} feature coming soon`);
              }
            }}
          />
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400">No messages yet</p>
              <p className="text-sm text-gray-400">Start the conversation!</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const isSender = msg.sender_id === currentUser.id;

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] ${isSender ? 'order-2' : 'order-1'}`}>
                    {!isSender && (
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar className="w-6 h-6 bg-emerald-100 text-emerald-600">
                          <AvatarFallback className="bg-emerald-100 text-emerald-600 text-xs">
                            {getInitials(msg.sender_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium text-gray-600">
                          {msg.sender_name}
                        </span>
                      </div>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-2 ${
                        isSender
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white text-gray-900'
                      }`}
                    >
                      <p className="text-sm break-words">
                        {msg.message_text}
                        {msg.is_edited && (
                          <span className="text-xs opacity-70 ml-2">(edited)</span>
                        )}
                      </p>
                    </div>
                    <p
                      className={`text-xs text-gray-400 mt-1 ${
                        isSender ? 'text-right' : 'text-left'
                      }`}
                    >
                      {format(toZonedTime(new Date(msg.created_date + 'Z'), 'Asia/Kolkata'), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </motion.div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="p-4 border-t bg-white rounded-b-xl">
        <RichTextInput
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onSend={handleSendMessage}
          disabled={sendMessageMutation.isPending}
          placeholder="Type a message..."
        />
      </div>
    </Card>
  );
}