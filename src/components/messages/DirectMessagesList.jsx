import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, ChevronDown, ChevronRight, Shield, User } from "lucide-react";
import OnlineStatusIndicator from '../admin/OnlineStatusIndicator';
import { formatDistanceToNow } from 'date-fns';

const DirectMessagesList = ({ currentUser, onUserSelect }) => {
  const [users, setUsers] = useState([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    admins: true,
    team: true,
  });
  const [unreadCounts, setUnreadCounts] = useState({});

  useEffect(() => {
    const fetchUsers = async () => {
      if (!currentUser) return;
      
      try {
        // Fetch users via backend function (uses service role to bypass permissions)
        const response = await base44.functions.invoke('getUsersForMessaging', {});
        console.log('Users response:', response);
        
        if (response.data && response.data.users) {
          setUsers(response.data.users);
          await fetchUnreadCounts(response.data.users);
        } else {
          setUsers([]);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
        setUsers([]);
      }
    };

    const fetchUnreadCounts = async (usersList) => {
      if (!currentUser) return;
      
      try {
        const messages = await base44.entities.Message.filter({
          receiver_id: currentUser.id,
          is_read: false
        });
        
        const counts = {};
        messages.forEach(msg => {
          const userId = msg.sender_id;
          counts[userId] = (counts[userId] || 0) + 1;
        });
        
        setUnreadCounts(counts);
      } catch (error) {
        console.error('Failed to fetch unread counts:', error);
      }
    };

    fetchUsers();

    // Subscribe to real-time message updates - only update unread counts
    const messageUnsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.type === 'create') {
        const msg = event.data;
        if (currentUser && (msg.sender_id === currentUser.id || msg.receiver_id === currentUser.id)) {
          fetchUnreadCounts(users);
        }
      }
    });

    // Do NOT subscribe to User updates (prevents sidebar blink on online status changes)

    return () => {
      messageUnsubscribe();
    };
  }, [currentUser, users]);

  const getInitials = useCallback((name) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  }, []);

  const toggleSection = useCallback((section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  // Memoized grouped users to prevent re-computation
  const { admins, teamMembers } = useMemo(() => ({
    admins: users.filter(u => u.role === 'admin'),
    teamMembers: users.filter(u => u.role === 'user')
  }), [users]);

  const UserItem = useCallback(({ user, isCurrentUser }) => {
    const unreadCount = unreadCounts[user.id] || 0;
    const isOnline = user.is_online;
    
    return (
      <motion.button
        key={user.id}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        onClick={() => onUserSelect(user)}
        className="group w-full flex items-center gap-3 p-3 rounded-lg hover:bg-indigo-50 text-left"
        style={{ transition: 'background-color 0.15s ease-in-out' }}
      >
        <div className="relative flex-shrink-0">
          <Avatar className="w-10 h-10 bg-indigo-100 text-indigo-600">
            {user.profile_photo ? (
              <AvatarImage src={user.profile_photo} alt={user.full_name} />
            ) : (
              <AvatarFallback className="bg-indigo-100 text-indigo-600 font-semibold text-sm">
                {getInitials(user.full_name)}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="absolute -bottom-0.5 -right-0.5">
            <OnlineStatusIndicator isOnline={isOnline} size="sm" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-gray-900 text-sm truncate">
              {user.full_name}
            </p>
            {isCurrentUser && (
              <Badge variant="outline" className="text-xs">You</Badge>
            )}
          </div>
          <p className="text-xs text-gray-500 truncate">
            {isOnline ? 'Online' : 'Offline'}
          </p>
        </div>
        {unreadCount > 0 ? (
          <Badge className="bg-rose-500 text-white h-5 min-w-5 px-1.5 flex items-center justify-center flex-shrink-0">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        ) : (
          <div className="text-xs text-indigo-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            Chat
          </div>
        )}
      </motion.button>
    );
  }, [unreadCounts, getInitials, onUserSelect]);

  return (
    <Card className="border-0 shadow-sm">
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        style={{ transition: 'background-color 0.15s ease-in-out' }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-gray-900">Direct Messages</h3>
          <Badge variant="outline" className="text-xs">
            {users.length}
          </Badge>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="pt-0 space-y-4">
              {/* Admins Section */}
              {admins.length > 0 && (
                <div>
                  <button
                    onClick={() => toggleSection('admins')}
                    className="flex items-center gap-2 w-full py-2 hover:bg-gray-50 rounded-lg"
                    style={{ transition: 'background-color 0.15s ease-in-out' }}
                  >
                    {expandedSections.admins ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                    <Shield className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm font-semibold text-gray-700">Admins</span>
                    <Badge variant="outline" className="text-xs ml-auto">
                      {admins.length}
                    </Badge>
                  </button>
                  
                  <AnimatePresence>
                    {expandedSections.admins && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="space-y-1 mt-2"
                      >
                        {admins.map(admin => (
                          <UserItem 
                            key={admin.id} 
                            user={admin} 
                            isCurrentUser={admin.email === currentUser?.email}
                          />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Team Members Section */}
              {teamMembers.length > 0 && (
                <div>
                  <button
                    onClick={() => toggleSection('team')}
                    className="flex items-center gap-2 w-full py-2 hover:bg-gray-50 rounded-lg"
                    style={{ transition: 'background-color 0.15s ease-in-out' }}
                  >
                    {expandedSections.team ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                    <User className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-semibold text-gray-700">Team Members</span>
                    <Badge variant="outline" className="text-xs ml-auto">
                      {teamMembers.length}
                    </Badge>
                  </button>
                  
                  <AnimatePresence>
                    {expandedSections.team && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="space-y-1 mt-2"
                      >
                        {teamMembers.map(member => (
                          <UserItem 
                            key={member.id} 
                            user={member} 
                            isCurrentUser={member.email === currentUser?.email}
                          />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {users.length === 0 && currentUser && (
                <div className="text-center text-gray-400 text-sm py-8">
                  <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="font-medium text-gray-500">No team members yet</p>
                  {currentUser.role === 'admin' ? (
                    <p className="text-xs mt-2">Invite team members to start messaging</p>
                  ) : (
                    <p className="text-xs mt-2">Waiting for team members to join</p>
                  )}
                </div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

export default DirectMessagesList;