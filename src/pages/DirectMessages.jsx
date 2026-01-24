import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DirectMessagesList from '../components/messages/DirectMessagesList';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

export default function DirectMessages() {
  const [user, setUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  // Fetch messages for the selected conversation
  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ['messages', user?.id, selectedUser?.id],
    queryFn: async () => {
      if (!user || !selectedUser) return [];
      
      // Fetch all messages and filter in memory
      const allMessages = await base44.entities.Message.list('-created_date', 500);
      
      // Filter messages between current user and selected user
      const conversationMessages = allMessages.filter(m => 
        (m.sender_id === user.id && m.receiver_id === selectedUser.id) ||
        (m.sender_id === selectedUser.id && m.receiver_id === user.id)
      );
      
      // Sort by created_date ascending (oldest first)
      return conversationMessages.sort((a, b) => 
        new Date(a.created_date) - new Date(b.created_date)
      );
    },
    enabled: !!user && !!selectedUser,
    refetchInterval: 3000, // Poll every 3 seconds for new messages
  });

  // Subscribe to real-time message updates
  useEffect(() => {
    if (!user) return;

    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.type === 'create') {
        const msg = event.data;
        // Update if message involves current user (as sender or receiver)
        if (msg.sender_id === user.id || msg.receiver_id === user.id) {
          // Invalidate all message queries to refresh all conversations
          queryClient.invalidateQueries({ queryKey: ['messages'] });
        }
      }
    });

    return unsubscribe;
  }, [user, queryClient]);

  // Auto-scroll to bottom when new messages arrive
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
      });
      return newMessage;
    },
    onSuccess: () => {
      // Invalidate all message queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setMessageText('');
    },
  });

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
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900">Direct Messages</h1>
          <p className="text-gray-500 mt-1">Connect with your team</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User List Sidebar */}
          <div className="lg:col-span-1">
            <DirectMessagesList 
              currentUser={user} 
              onUserSelect={setSelectedUser}
            />
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-2">
            {selectedUser ? (
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
                        <p className="text-sm text-gray-500">{selectedUser.email}</p>
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
                      {messages.map((msg) => {
                        const isSender = msg.sender_id === user.id;
                        return (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[70%] ${isSender ? 'order-2' : 'order-1'}`}>
                              <div className={`rounded-2xl px-4 py-2 ${
                                isSender 
                                  ? 'bg-indigo-600 text-white' 
                                  : 'bg-white text-gray-900'
                              }`}>
                                <p className="text-sm break-words">{msg.message_text}</p>
                              </div>
                              <p className={`text-xs text-gray-400 mt-1 ${isSender ? 'text-right' : 'text-left'}`}>
                                {format(new Date(msg.created_date), 'h:mm a')}
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
                    Choose from Admins or Team Members to start messaging
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}