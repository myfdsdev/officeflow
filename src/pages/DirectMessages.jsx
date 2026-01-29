import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ConversationItem from '../components/messages/ConversationItem';
import ChatInterface from '../components/messages/ChatInterface';
import BroadcastMessageDialog from '../components/messages/BroadcastMessageDialog';
import NotificationSettings from '../components/messages/NotificationSettings';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Megaphone, Settings, Users, User } from "lucide-react";
import { motion } from "framer-motion";

export default function DirectMessages() {
  const [user, setUser] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [conversationType, setConversationType] = useState(null); // 'dm' or 'group'
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const queryClient = useQueryClient();

  // Check URL parameters for direct navigation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('userId');
    const groupId = params.get('groupId');
    
    if (userId) {
      // TODO: Load user and set as selected
    } else if (groupId) {
      // TODO: Load group and set as selected
    }
  }, []);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  // Get user settings for mute info
  const { data: userSettings } = useQuery({
    queryKey: ['userSettings', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const settings = await base44.entities.UserSettings.filter({ user_id: user.id });
      return settings && settings.length > 0 ? settings[0] : null;
    },
    enabled: !!user
  });

  // Fetch all users for DM conversations
  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user
  });

  // Fetch DM conversations with last message and unread count
  const { data: dmConversations = [] } = useQuery({
    queryKey: ['dmConversations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const messages = await base44.entities.Message.list('-created_date', 500);
      const onlineStatuses = await base44.entities.OnlineStatus.list();
      
      // Create map of user conversations
      const conversationsMap = new Map();
      
      messages.forEach(msg => {
        const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        
        if (!conversationsMap.has(otherUserId)) {
          const otherUser = allUsers.find(u => u.id === otherUserId);
          if (!otherUser) return;
          
          const onlineStatus = onlineStatuses.find(s => s.user_id === otherUserId);
          
          conversationsMap.set(otherUserId, {
            type: 'dm',
            id: otherUserId,
            other_user_id: otherUserId,
            name: msg.sender_id === user.id ? msg.receiver_name : msg.sender_name,
            email: msg.sender_id === user.id ? msg.receiver_email : msg.sender_email,
            profile_photo: otherUser.profile_photo,
            last_message: msg.message_text,
            last_message_time: msg.created_date,
            is_online: onlineStatus?.is_online || false,
            last_seen: onlineStatus?.last_seen,
            unread_count: 0
          });
        }
      });
      
      // Count unread messages
      const unreadMessages = messages.filter(m => m.receiver_id === user.id && !m.is_read);
      unreadMessages.forEach(msg => {
        const conv = conversationsMap.get(msg.sender_id);
        if (conv) conv.unread_count++;
      });
      
      return Array.from(conversationsMap.values())
        .sort((a, b) => new Date(b.last_message_time) - new Date(a.last_message_time));
    },
    enabled: !!user && allUsers.length > 0,
    refetchInterval: 3000
  });

  // Fetch group conversations
  const { data: groupConversations = [] } = useQuery({
    queryKey: ['groupConversations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const memberships = await base44.entities.GroupMember.filter({ user_id: user.id });
      const groupIds = memberships.map(m => m.group_id);
      
      const conversations = [];
      
      for (const groupId of groupIds) {
        const group = await base44.entities.Group.filter({ id: groupId });
        if (!group || group.length === 0) continue;
        
        const messages = await base44.entities.GroupMessage.filter(
          { group_id: groupId },
          '-created_date',
          1
        );
        
        const memberCount = await base44.entities.GroupMember.filter({ group_id: groupId });
        
        conversations.push({
          type: 'group',
          id: groupId,
          name: group[0].group_name,
          description: group[0].description,
          last_message: messages[0]?.message_text || 'No messages yet',
          last_message_time: messages[0]?.created_date,
          member_count: memberCount.length,
          unread_count: 0 // TODO: Implement group unread count
        });
      }
      
      return conversations.sort((a, b) => 
        new Date(b.last_message_time || 0) - new Date(a.last_message_time || 0)
      );
    },
    enabled: !!user,
    refetchInterval: 3000
  });

  // Combined conversations
  const allConversations = [...dmConversations, ...groupConversations];
  const filteredConversations = searchQuery
    ? allConversations.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.last_message?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allConversations;

  const tabConversations = activeTab === 'all' 
    ? filteredConversations
    : activeTab === 'dms'
      ? filteredConversations.filter(c => c.type === 'dm')
      : filteredConversations.filter(c => c.type === 'group');

  // Handle mute toggle
  const handleMuteToggle = async () => {
    if (!selectedConversation || !user || !userSettings) return;
    
    const mutedConvos = userSettings.muted_conversations || [];
    const isMuted = mutedConvos.includes(selectedConversation.id);
    
    const newMuted = isMuted
      ? mutedConvos.filter(id => id !== selectedConversation.id)
      : [...mutedConvos, selectedConversation.id];
    
    if (userSettings.id) {
      await base44.entities.UserSettings.update(userSettings.id, {
        muted_conversations: newMuted
      });
    } else {
      await base44.entities.UserSettings.create({
        user_id: user.id,
        user_email: user.email,
        muted_conversations: newMuted
      });
    }
    
    queryClient.invalidateQueries(['userSettings', user.id]);
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
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{selectedUser.full_name}</h3>
                        {starredConversations.includes(selectedUser.id) && (
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-500">
                          {selectedUser.is_online ? 'Online' : 'Offline'}
                        </p>
                        {selectedUser.role === 'admin' && (
                          <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">Admin</span>
                        )}
                      </div>
                    </div>
                    <ConversationMenu 
                      selectedUser={selectedUser}
                      onAction={(action) => {
                        if (action === 'copy') {
                          navigator.clipboard.writeText(selectedUser.email);
                          toast.success('Email copied to clipboard');
                        } else if (action === 'star') {
                          toggleStar(selectedUser.id);
                        } else if (action === 'search') {
                          const query = prompt('Search in conversation:');
                          if (query) setSearchQuery(query);
                        } else if (action === 'hide') {
                          setSelectedUser(null);
                          toast.success('Conversation hidden');
                        } else if (action === 'view-profile') {
                          setProfileDialogOpen(true);
                        } else {
                          toast.success(`${action} feature coming soon`);
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-4">
                  {searchQuery && (
                    <div className="bg-indigo-50 px-4 py-2 rounded-lg flex items-center justify-between">
                      <span className="text-sm text-indigo-700">
                        {messages.length} result(s) for "{searchQuery}"
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSearchQuery('')}
                        className="text-indigo-600"
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-pulse text-gray-400">Loading messages...</div>
                    </div>
                  ) : messages.length === 0 && !searchQuery ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-400">No messages yet</p>
                        <p className="text-sm text-gray-400">Start the conversation!</p>
                      </div>
                    </div>
                  ) : messages.length === 0 && searchQuery ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-400">No messages found</p>
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
                <div className="p-4 border-t bg-white rounded-b-xl">
                  <RichTextInput
                    onSend={handleSendMessage}
                    disabled={sendMessageMutation.isPending}
                    placeholder="Type a message..."
                  />
                </div>
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

      {/* User Profile Dialog */}
      <UserProfileDialog
        open={profileDialogOpen}
        onClose={() => setProfileDialogOpen(false)}
        user={selectedUser}
      />
    </div>
  );
}