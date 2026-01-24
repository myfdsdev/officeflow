import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import DirectMessagesList from '../components/messages/DirectMessagesList';
import { Card } from "@/components/ui/card";
import { MessageCircle, Send } from "lucide-react";
import { motion } from "framer-motion";

export default function DirectMessages() {
  const [user, setUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

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

                {/* Chat Content */}
                <div className="flex-1 flex items-center justify-center bg-gray-50">
                  <div className="text-center p-8">
                    <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageCircle className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Chat Ready
                    </h3>
                    <p className="text-gray-500 mb-4">
                      You can now chat with {selectedUser.full_name}
                    </p>
                    <p className="text-sm text-gray-400">
                      Direct messaging feature coming soon
                    </p>
                  </div>
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