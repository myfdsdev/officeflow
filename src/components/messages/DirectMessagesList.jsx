import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, ChevronDown, ChevronRight, Shield, User } from "lucide-react";
import OnlineStatusIndicator from '../admin/OnlineStatusIndicator';
import { formatDistanceToNow } from 'date-fns';

export default function DirectMessagesList({ currentUser, onUserSelect }) {
  const [users, setUsers] = useState([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    admins: true,
    team: true,
  });

  useEffect(() => {
    const fetchUsers = async () => {
      if (!currentUser) return;
      
      try {
        // Fetch all users except the current user
        const allUsers = await base44.entities.User.list('-created_date', 500);
        console.log('All users fetched:', allUsers);
        const connectedUsers = allUsers.filter(u => u.id !== currentUser.id);
        console.log('Connected users after filter:', connectedUsers);

        setUsers(connectedUsers);
      } catch (error) {
        console.error('Failed to fetch users:', error);
        setUsers([]); // Set empty array on error
      }
    };

    fetchUsers();

    // Subscribe to real-time message updates to refresh user list
    const messageUnsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.type === 'create') {
        const msg = event.data;
        // If message involves current user, refresh the user list
        if (currentUser && (msg.sender_id === currentUser.id || msg.receiver_id === currentUser.id)) {
          fetchUsers();
        }
      }
    });

    // Subscribe to real-time user updates to update user info
    const userUnsubscribe = base44.entities.User.subscribe((event) => {
      if (event.type === 'update' || event.type === 'create') {
        fetchUsers(); // Refresh to include new users
      }
    });

    return () => {
      messageUnsubscribe();
      userUnsubscribe();
    };
  }, [currentUser]);

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getLastSeenText = (user) => {
    if (user.is_online) return 'Online';
    if (user.last_active_time) {
      try {
        return `Last seen ${formatDistanceToNow(new Date(user.last_active_time), { addSuffix: true })}`;
      } catch (e) {
        return 'Offline';
      }
    }
    return 'Offline';
  };

  // Group users by role
  const admins = users.filter(u => u.role === 'admin');
  const teamMembers = users.filter(u => u.role === 'user');

  const UserItem = ({ user, isCurrentUser }) => (
    <motion.button
      key={user.id}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      onClick={() => onUserSelect(user)}
      className="group w-full flex items-center gap-3 p-3 rounded-lg hover:bg-indigo-50 transition-colors text-left"
    >
      <div className="relative">
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
          <OnlineStatusIndicator isOnline={user.is_online} size="sm" />
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
        <p className="text-xs text-gray-500 truncate">{getLastSeenText(user)}</p>
      </div>
      <div className="text-xs text-indigo-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
        Chat
      </div>
    </motion.button>
  );

  return (
    <Card className="border-0 shadow-sm">
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
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
                    className="flex items-center gap-2 w-full py-2 hover:bg-gray-50 rounded-lg transition-colors"
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
                    className="flex items-center gap-2 w-full py-2 hover:bg-gray-50 rounded-lg transition-colors"
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
}