import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DirectMessagesList from '../components/messages/DirectMessagesList';
import BroadcastMessageDialog from '../components/messages/BroadcastMessageDialog';
import GroupChatList from '../components/groups/GroupChatList';
import GroupChatInterface from '../components/groups/GroupChatInterface';
import NotificationBell from '../components/notifications/NotificationBell';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send, Megaphone, Pin } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { utcToZonedTime } from "date-fns-tz";
import MessageContextMenu from '../components/messages/MessageContextMenu';
import { toast } from 'react-hot-toast';

export default function DirectMessages() {
  const [user, setUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [showBroadcast, setShowBroadcast] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const initUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
      
      // Mark ALL message notifications as read when DirectMessages page opens
      if (userData) {
        try {
          const notifications = await base44.entities.Notification.filter({
            user_email: userData.email,
            is_read: false,
            type: 'new_message'
          });
          
          // Mark all message notifications as read immediately
          const updatePromises = notifications.map(notif => 
            base44.entities.Notification.update(notif.id, { is_read: true })
          );
          await Promise.all(updatePromises);
          
          // Invalidate notifications query to update bell icon
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        } catch (error) {
          console.error('Failed to mark notifications as read:', error);
        }
      }
    };
    
    initUser();
  }, [queryClient]);

  // Fetch messages for the selected conversation
  const { data: messages = [], isLoading: loadingMessages, error: messagesError } = useQuery({
    queryKey: ['messages', user?.id, selectedUser?.id],
    queryFn: async () => {
      if (!user || !selectedUser) return [];
      
      try {
        const allMessages = await base44.entities.Message.list('-created_date', 1000);
        
        const conversationMessages = allMessages.filter(m => 
          (m.sender_id === user.id && m.receiver_id === selectedUser.id) ||
          (m.sender_id === selectedUser.id && m.receiver_id === user.id)
        );
        
        return conversationMessages.sort((a, b) => 
          new Date(a.created_date) - new Date(b.created_date)
        );
      } catch (error) {
        console.error('Failed to fetch messages:', error);
        return [];
      }
    },
    enabled: !!user && !!selectedUser,
    refetchInterval: 3000,
  });

  // Real-time message subscription
  useEffect(() => {
    if (!user) return;

    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.type === 'create') {
        const msg = event.data;
        if (msg.sender_id === user.id || msg.receiver_id === user.id) {
          queryClient.invalidateQueries({ queryKey: ['messages'] });
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          
          // Mark as read if from selected user
          if (msg.receiver_id === user.id && msg.sender_id === selectedUser?.id && !msg.is_read) {
            base44.entities.Message.update(msg.id, { is_read: true }).catch(console.error);
          }
        }
      }
    });

    return unsubscribe;
  }, [user, selectedUser, queryClient]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessageMutation = useMutation({
    mutationFn: async (text) => {
      const newMessage = await base44.entities.Message.create({
        sender_id: user.id,
        sender_email: user.email,
        sender_name: user.full_name,
        receiver_id: selectedUser.id,
        receiver_email: selectedUser.email,
        receiver_name: selectedUser.full_name,
        message_text: text,
        is_read: false,
        is_edited: false,
        is_pinned: false,
        is_deleted: false,
        muted_by: [],
      });

      // Only create notification for receiver if not muted
      // Notification will be automatically marked as read if they're on DirectMessages page
      await base44.entities.Notification.create({
        user_email: selectedUser.email,
        title: 'New Message',
        message: `${user.full_name}: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`,
        type: 'new_message',
        is_read: false,
        related_id: newMessage.id,
      });

      return newMessage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setMessageText('');
    },
  });

  // Message Actions
  const handleEditMessage = async (messageId, newText) => {
    await base44.entities.Message.update(messageId, {
      message_text: newText,
      is_edited: true,
    });
    queryClient.invalidateQueries({ queryKey: ['messages'] });
  };

  const handleMarkUnread = async (messageId) => {
    await base44.entities.Message.update(messageId, {
      is_read: false,
    });
    queryClient.invalidateQueries({ queryKey: ['messages'] });
  };

  const handleSetReminder = async (messageId, reminderTime, messageText) => {
    await base44.entities.MessageReminder.create({
      user_id: user.id,
      message_id: messageId,
      message_text: messageText,
      reminder_time: reminderTime.toISOString(),
      is_triggered: false,
    });
  };

  const handleToggleMute = async (messageId) => {
    const msg = messages.find(m => m.id === messageId);
    const mutedBy = msg.muted_by || [];
    const isMuted = mutedBy.includes(user.id);
    
    await base44.entities.Message.update(messageId, {
      muted_by: isMuted 
        ? mutedBy.filter(id => id !== user.id)
        : [...mutedBy, user.id]
    });
    queryClient.invalidateQueries({ queryKey: ['messages'] });
  };

  const handleCopyLink = async (messageId) => {
    const link = `${window.location.origin}${window.location.pathname}?messageId=${messageId}`;
    return link;
  };

  const handlePinMessage = async (messageId, pin) => {
    await base44.entities.Message.update(messageId, {
      is_pinned: pin,
    });
    queryClient.invalidateQueries({ queryKey: ['messages'] });
  };

  const handleDeleteMessage = async (messageId, deleteForEveryone) => {
    if (deleteForEveryone) {
      await base44.entities.Message.update(messageId, {
        is_deleted: true,
        deleted_for_everyone: true,
        deleted_by: user.id,
        message_text: 'This message was deleted',
      });
    } else {
      await base44.entities.Message.update(messageId, {
        is_deleted: true,
        deleted_for_everyone: false,
        deleted_by: user.id,
      });
    }
    queryClient.invalidateQueries({ queryKey: ['messages'] });
  };

  // Mark messages as read when conversation opened
  useEffect(() => {
    const markAsRead = async () => {
      if (!user || !selectedUser || !messages || messages.length === 0) return;

      try {
        const unreadMessages = messages.filter(m => 
          m.receiver_id === user.id && 
          m.sender_id === selectedUser.id && 
          !m.is_read
        );

        // Mark messages as read
        const updatePromises = unreadMessages.map(msg =>
          base44.entities.Message.update(msg.id, { is_read: true })
        );
        await Promise.all(updatePromises);

        // Also mark related message notifications as read
        const messageNotifications = await base44.entities.Notification.filter({
          user_email: user.email,
          type: 'new_message',
          is_read: false,
        });

        const notifUpdatePromises = messageNotifications
          .filter(notif => notif.message.includes(selectedUser.full_name))
          .map(notif => base44.entities.Notification.update(notif.id, { is_read: true }));
        
        await Promise.all(notifUpdatePromises);
        
        // Update notification count
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      } catch (error) {
        console.error('Failed to mark messages as read:', error);
      }
    };

    markAsRead();
  }, [user, selectedUser, messages, queryClient]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (messageText.trim() && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate(messageText.trim());
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Direct Messages</h1>
            <p className="text-gray-500 mt-1">Connect with your team</p>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell userEmail={user.email} />
            {user.role === 'admin' && (
              <Button
                onClick={() => setShowBroadcast(true)}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <Megaphone className="w-4 h-4 mr-2" />
                Broadcast
              </Button>
            )}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User List Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <GroupChatList
              currentUser={user}
              onGroupSelect={(group) => {
                setSelectedGroup(group);
                setSelectedUser(null);
              }}
            />
            <DirectMessagesList 
              currentUser={user} 
              onUserSelect={(user) => {
                setSelectedUser(user);
                setSelectedGroup(null);
              }}
            />
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-2">
            {selectedGroup ? (
              <GroupChatInterface
                group={selectedGroup}
                currentUser={user}
              />
            ) : selectedUser ? (
              <Card className="border-0 shadow-sm h-[600px] flex flex-col">
                {/* Chat Header */}
                <div className="p-4 border-b bg-white rounded-t-xl">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-indigo-600 font-semibold">
                          {selectedUser.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                        </span>
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${selectedUser.is_online ? 'bg-green-500' : 'bg-gray-400'}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{selectedUser.full_name}</h3>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-500">
                          {selectedUser.is_online ? 'Online' : 'Offline'}
                        </p>
                        {selectedUser.role === 'admin' && (
                          <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">Admin</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-4">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-pulse text-gray-400">Loading messages...</div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-400">No messages yet</p>
                        <p className="text-sm text-gray-400">Start the conversation!</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Pinned Messages */}
                      {messages.filter(m => m.is_pinned && !m.is_deleted).length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Pin className="w-4 h-4 text-amber-600" />
                            <span className="text-sm font-semibold text-amber-900">Pinned Messages</span>
                          </div>
                          <div className="space-y-2">
                            {messages.filter(m => m.is_pinned && !m.is_deleted).map(msg => (
                              <div key={msg.id} className="text-xs bg-white rounded p-2 text-gray-700">
                                {msg.message_text.substring(0, 50)}...
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Regular Messages */}
                      {messages.map((msg) => {
                        const isSender = msg.sender_id === user.id;
                        const isBroadcast = msg.message_text.startsWith('📢 BROADCAST:');
                        const isDeleted = msg.is_deleted && (msg.deleted_for_everyone || msg.deleted_by === user.id);

                        return (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${isSender ? 'justify-end' : 'justify-start'} group`}
                            id={`message-${msg.id}`}
                          >
                            <div className={`max-w-[70%] ${isSender ? 'order-2' : 'order-1'}`}>
                              <div className="flex items-start gap-2">
                                <div className={`rounded-2xl px-4 py-2 ${
                                  isDeleted
                                    ? 'bg-gray-200 text-gray-500 italic'
                                    : isBroadcast
                                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                      : isSender 
                                        ? 'bg-indigo-600 text-white' 
                                        : 'bg-white text-gray-900'
                                } ${msg.is_pinned ? 'ring-2 ring-amber-300' : ''}`}>
                                  <div className="flex items-start gap-2">
                                    <p className="text-sm break-words flex-1">
                                      {msg.message_text}
                                      {msg.is_edited && !isDeleted && (
                                        <span className="text-xs opacity-70 ml-2">(edited)</span>
                                      )}
                                    </p>
                                  </div>
                                </div>
                                {!isDeleted && (
                                  <MessageContextMenu
                                    message={msg}
                                    currentUser={user}
                                    onEdit={handleEditMessage}
                                    onMarkUnread={handleMarkUnread}
                                    onReminder={handleSetReminder}
                                    onToggleMute={handleToggleMute}
                                    onCopyLink={handleCopyLink}
                                    onPin={handlePinMessage}
                                    onDelete={handleDeleteMessage}
                                  />
                                )}
                              </div>
                              <p className={`text-xs text-gray-400 mt-1 ${isSender ? 'text-right' : 'text-left'}`}>
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
                <form onSubmit={handleSendMessage} className="p-4 border-t bg-white rounded-b-xl">
                  <div className="flex gap-2">
                    <Input
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1"
                      disabled={sendMessageMutation.isPending}
                    />
                    <Button
                      type="submit"
                      disabled={!messageText.trim() || sendMessageMutation.isPending}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </form>
              </Card>
            ) : (
              <Card className="border-0 shadow-sm h-[600px] flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Select a conversation
                  </h3>
                  <p className="text-gray-500">
                    Choose a group chat or direct message to start chatting
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Broadcast Dialog */}
      <BroadcastMessageDialog
        isOpen={showBroadcast}
        onClose={() => setShowBroadcast(false)}
        currentUser={user}
      />
    </div>
  );
}