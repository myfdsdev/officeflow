import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { UserPlus, Loader2 } from "lucide-react";

export default function AddMemberDialog({ open, onClose, group, currentUser, existingMemberIds }) {
  const [selectedUsers, setSelectedUsers] = useState([]);
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['users-for-group'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getUsersForMessaging', {});
      return response.data?.users || [];
    },
    enabled: open,
  });

  // Filter out users who are already members
  const availableUsers = users.filter(u => !existingMemberIds.includes(u.id));

  const addMembersMutation = useMutation({
    mutationFn: async () => {
      const promises = selectedUsers.map(async (userId) => {
        const user = users.find(u => u.id === userId);
        
        // Create group member
        await base44.entities.GroupMember.create({
          group_id: group.id,
          group_name: group.group_name,
          user_id: user.id,
          user_email: user.email,
          user_name: user.full_name,
          role: 'member',
          added_by: currentUser.id,
          added_by_name: currentUser.full_name,
        });

        // Send notification
        await base44.entities.Notification.create({
          user_email: user.email,
          user_id: user.id,
          title: 'Added to Group',
          message: `You have been added to the group: ${group.group_name}`,
          type: 'group_added',
          is_read: false,
          related_id: group.id,
        });
      });
      
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members'] });
      queryClient.invalidateQueries({ queryKey: ['all-group-members'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setSelectedUsers([]);
      onClose();
    },
    onError: (error) => {
      alert(`Failed to add members: ${error.message}`);
    },
  });

  const toggleUser = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-indigo-600" />
            Add Members to {group?.group_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {availableUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              All users are already members of this group
            </div>
          ) : (
            availableUsers.map(user => (
              <div
                key={user.id}
                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg"
              >
                <Checkbox
                  checked={selectedUsers.includes(user.id)}
                  onCheckedChange={() => toggleUser(user.id)}
                />
                <Avatar className="w-8 h-8 bg-indigo-100 text-indigo-600">
                  {user.profile_photo ? (
                    <AvatarImage src={user.profile_photo} alt={user.full_name} />
                  ) : (
                    <AvatarFallback className="bg-indigo-100 text-indigo-600 text-xs">
                      {getInitials(user.full_name)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                {user.role === 'admin' && (
                  <Badge variant="outline" className="text-xs">Admin</Badge>
                )}
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => addMembersMutation.mutate()}
            disabled={selectedUsers.length === 0 || addMembersMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {addMembersMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              `Add ${selectedUsers.length} Member(s)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}