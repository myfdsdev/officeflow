import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import CreateGroupDialog from '../components/groups/CreateGroupDialog';
import GroupCard from '../components/groups/GroupCard';
import GroupMembersDialog from '../components/groups/GroupMembersDialog';

export default function GroupsPage() {
  const [user, setUser] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => base44.entities.Group.list('-created_date', 100),
    enabled: !!user,
  });

  const { data: allMembers = [] } = useQuery({
    queryKey: ['all-group-members'],
    queryFn: () => base44.entities.GroupMember.list('-created_date', 500),
    enabled: !!user,
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId) => {
      // Delete all members first
      const members = allMembers.filter(m => m.group_id === groupId);
      await Promise.all(members.map(m => base44.entities.GroupMember.delete(m.id)));
      // Then delete the group
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

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Groups</h1>
            <p className="text-gray-500 mt-1">Manage your team groups.</p>
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
        ) : groups.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No groups yet</h3>
            <p className="text-gray-500 mb-6">Create your first group to organize team members</p>
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
              {groups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  memberCount={getMemberCount(group.id)}
                  onViewMembers={() => handleViewMembers(group)}
                  onEdit={() => {
                    // TODO: Implement edit
                  }}
                  onDelete={() => {
                    if (confirm(`Are you sure you want to delete "${group.group_name}"?`)) {
                      deleteGroupMutation.mutate(group.id);
                    }
                  }}
                />
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