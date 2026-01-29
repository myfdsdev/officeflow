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
          className="mb-6 flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
            <p className="text-gray-500 mt-1">Connect with your team</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="w-4 h-4" />
            </Button>
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
          {/* Conversations Sidebar */}
          <div className="lg:col-span-1">
            <Card className="border-0 shadow-sm h-[calc(100vh-200px)]">
              <div className="p-4 border-b space-y-3">
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
                
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                    <TabsTrigger value="dms" className="text-xs">
                      <User className="w-3 h-3 mr-1" />
                      DMs
                    </TabsTrigger>
                    <TabsTrigger value="groups" className="text-xs">
                      <Users className="w-3 h-3 mr-1" />
                      Groups
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="overflow-y-auto h-[calc(100%-120px)]">
                {tabConversations.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400 p-4 text-center">
                    <p className="text-sm">No conversations yet</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {tabConversations.map((conv) => (
                      <ConversationItem
                        key={`${conv.type}-${conv.id}`}
                        conversation={conv}
                        isActive={selectedConversation?.id === conv.id && conversationType === conv.type}
                        onClick={() => {
                          setSelectedConversation(conv);
                          setConversationType(conv.type);
                        }}
                        unreadCount={conv.unread_count}
                        isMuted={userSettings?.muted_conversations?.includes(conv.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-2">
            {selectedConversation ? (
              <Card className="border-0 shadow-sm h-[calc(100vh-200px)]">
                <ChatInterface
                  user={user}
                  conversation={{
                    ...selectedConversation,
                    is_muted: userSettings?.muted_conversations?.includes(selectedConversation.id)
                  }}
                  conversationType={conversationType}
                  onMuteToggle={handleMuteToggle}
                />
              </Card>
            ) : (
              <Card className="border-0 shadow-sm h-[calc(100vh-200px)] flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Select a conversation
                  </h3>
                  <p className="text-gray-500">
                    Choose a conversation to start messaging
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

      {/* Notification Settings Dialog */}
      <NotificationSettings
        user={user}
        open={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}