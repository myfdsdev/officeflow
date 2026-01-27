import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import CreateGroupDialog from '../components/groups/CreateGroupDialog';
import GroupCard from '../components/groups/GroupCard';
import GroupMembersDialog from '../components/groups/GroupMembersDialog';
import GroupChatInterface from '../components/groups/GroupChatInterface';

export default function GroupsPage() {
  const [user, setUser] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [chatGroup, setChatGroup] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  // Fetch groups where user is a member
  const { data: myMemberships = [] } = useQuery({
    queryKey: ['my-group-memberships', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const memberships = await base44.entities.GroupMember.filter({
        user_id: user.id,
      });
      return memberships;
    },
    enabled: !!user,
  });

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => base44.entities.Group.list('-created_date', 100),
    enabled: !!user,
  });

  // Filter to only show groups user is a member of
  const myGroups = groups.filter(group =>
    myMemberships.some(m => m.group_id === group.id)
  );

  const { data: allMembers = [] } = useQuery({
    queryKey: ['all-group-members'],
    queryFn: () => base44.entities.GroupMember.list('-created_date', 500),
    enabled: !!user,
  });

  // Fetch group messages for unread count
  const { data: allGroupMessages = [] } = useQuery({
    queryKey: ['all-group-messages'],
    queryFn: () => base44.entities.GroupMessage.list('-created_date', 1000),
    enabled: !!user,
    refetchInterval: 3000,
  });

  // Calculate unread counts
  useEffect(() => {
    if (!user) return;

    const counts = {};
    myGroups.forEach(group => {
      const groupMessages = allGroupMessages.filter(m => m.group_id === group.id);
      const lastOpenedKey = `group_chat_opened_${group.id}_${user.id}`;
      const lastOpened = localStorage.getItem(lastOpenedKey);
      
      if (lastOpened) {
        const unreadMessages = groupMessages.filter(m => 
          new Date(m.created_date) > new Date(lastOpened) && 
          m.sender_id !== user.id
        );
        counts[group.id] = unreadMessages.length;
      } else {
        const unreadMessages = groupMessages.filter(m => m.sender_id !== user.id);
        counts[group.id] = unreadMessages.length;
      }
    });
    setUnreadCounts(counts);
  }, [allGroupMessages, myGroups, user]);

  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId) => {
      const members = allMembers.filter(m => m.group_id === groupId);
      await Promise.all(members.map(m => base44.entities.GroupMember.delete(m.id)));
      await base44.entities.Group.delete(groupId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['all-group-members'] });
    },
  });

  const getMemberCount = (groupId) => {
    return allMembers.filter(m => m.group_id === groupId).length;
  };

  const handleViewMembers = (group) => {
    setSelectedGroup(group);
    setMembersDialogOpen(true);
  };

  const handleOpenChat = (group) => {
    const lastOpenedKey = `group_chat_opened_${group.id}_${user.id}`;
    localStorage.setItem(lastOpenedKey, new Date().toISOString());
    setUnreadCounts(prev => ({ ...prev, [group.id]: 0 }));
    setChatGroup(group);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Chat View
  if (chatGroup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50">
        <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Button
              variant="ghost"
              onClick={() => setChatGroup(null)}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Groups
            </Button>
          </motion.div>

          <GroupChatInterface group={chatGroup} currentUser={user} />
        </div>
      </div>
    );
  }

  // Groups List View
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Groups</h1>
            <p className="text-gray-500 mt-1">Manage and chat with your team groups</p>
          </div>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Group
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : myGroups.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No groups yet</h3>
            <p className="text-gray-500 mb-6">Create or join a group to start collaborating</p>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create First Group
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {myGroups.map((group) => (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="relative"
                >
                  <div
                    onClick={() => handleOpenChat(group)}
                    className="cursor-pointer"
                  >
                    <GroupCard
                      group={group}
                      memberCount={getMemberCount(group.id)}
                      onViewMembers={(e) => {
                        e.stopPropagation();
                        handleViewMembers(group);
                      }}
                      onEdit={() => {}}
                      onDelete={(e) => {
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to delete "${group.group_name}"?`)) {
                          deleteGroupMutation.mutate(group.id);
                        }
                      }}
                    />
                  </div>
                  {unreadCounts[group.id] > 0 && (
                    <Badge className="absolute top-2 right-2 bg-emerald-600 text-white">
                      {unreadCounts[group.id]}
                    </Badge>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        <CreateGroupDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          currentUser={user}
        />

        <GroupMembersDialog
          open={membersDialogOpen}
          onClose={() => {
            setMembersDialogOpen(false);
            setSelectedGroup(null);
          }}
          group={selectedGroup}
          currentUser={user}
        />
      </div>
    </div>
  );
}