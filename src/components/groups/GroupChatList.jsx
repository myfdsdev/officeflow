import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Users, ChevronDown, ChevronRight } from "lucide-react";

export default function GroupChatList({ currentUser, onGroupSelect }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState({});

  // Fetch groups where user is a member
  const { data: myMemberships = [] } = useQuery({
    queryKey: ['my-group-memberships', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      const memberships = await base44.entities.GroupMember.filter({
        user_id: currentUser.id,
      });
      return memberships;
    },
    enabled: !!currentUser,
  });

  // Fetch all groups
  const { data: allGroups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: () => base44.entities.Group.list('-created_date', 100),
    enabled: !!currentUser,
  });

  // Filter groups to only show ones the user is a member of
  const myGroups = allGroups.filter(group =>
    myMemberships.some(m => m.group_id === group.id)
  );

  // Fetch group messages for unread count
  const { data: allGroupMessages = [] } = useQuery({
    queryKey: ['all-group-messages'],
    queryFn: () => base44.entities.GroupMessage.list('-created_date', 1000),
    enabled: !!currentUser,
    refetchInterval: 3000,
  });

  // Calculate unread counts
  useEffect(() => {
    if (!currentUser) return;

    const counts = {};
    myGroups.forEach(group => {
      const groupMessages = allGroupMessages.filter(m => m.group_id === group.id);
      // Get the last time user opened this group chat from localStorage
      const lastOpenedKey = `group_chat_opened_${group.id}_${currentUser.id}`;
      const lastOpened = localStorage.getItem(lastOpenedKey);
      
      if (lastOpened) {
        const unreadMessages = groupMessages.filter(m => 
          new Date(m.created_date) > new Date(lastOpened) && 
          m.sender_id !== currentUser.id
        );
        counts[group.id] = unreadMessages.length;
      } else {
        // If never opened, count all messages not sent by user
        const unreadMessages = groupMessages.filter(m => m.sender_id !== currentUser.id);
        counts[group.id] = unreadMessages.length;
      }
    });
    setUnreadCounts(counts);
  }, [allGroupMessages, myGroups, currentUser]);

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleGroupClick = (group) => {
    // Mark as opened in localStorage
    const lastOpenedKey = `group_chat_opened_${group.id}_${currentUser.id}`;
    localStorage.setItem(lastOpenedKey, new Date().toISOString());
    
    // Reset unread count immediately
    setUnreadCounts(prev => ({ ...prev, [group.id]: 0 }));
    
    onGroupSelect(group);
  };

  if (myGroups.length === 0) return null;

  return (
    <Card className="border-0 shadow-sm">
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-600" />
          <h3 className="font-semibold text-gray-900">Group Chats</h3>
          <Badge variant="outline" className="text-xs">
            {myGroups.length}
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
            <CardContent className="pt-0 space-y-1">
              {myGroups.map(group => (
                <motion.button
                  key={group.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => handleGroupClick(group)}
                  className="group w-full flex items-center gap-3 p-3 rounded-lg hover:bg-emerald-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-600 font-semibold text-sm">
                      {getInitials(group.group_name)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">
                      {group.group_name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {group.group_type}
                    </p>
                  </div>
                  {unreadCounts[group.id] > 0 && (
                    <Badge className="bg-emerald-600 text-white">
                      {unreadCounts[group.id]}
                    </Badge>
                  )}
                </motion.button>
              ))}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}