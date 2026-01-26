import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Megaphone, Send } from "lucide-react";

export default function BroadcastMessageDialog({ isOpen, onClose, currentUser }) {
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('all');
  const queryClient = useQueryClient();

  const broadcastMutation = useMutation({
    mutationFn: async () => {
      // Fetch all users
      const allUsers = await base44.entities.User.list();
      
      // Filter based on audience
      let targetUsers = allUsers.filter(u => u.id !== currentUser.id);
      if (audience === 'team') {
        targetUsers = targetUsers.filter(u => u.role === 'user');
      }

      // Send message to each user
      const messagePromises = targetUsers.map(user =>
        base44.entities.Message.create({
          sender_id: currentUser.id,
          sender_email: currentUser.email,
          sender_name: currentUser.full_name,
          receiver_id: user.id,
          receiver_email: user.email,
          receiver_name: user.full_name,
          message_text: `📢 BROADCAST: ${message}`,
          is_read: false,
        })
      );

      // Create notifications for each user
      const notificationPromises = targetUsers.map(user =>
        base44.entities.Notification.create({
          user_email: user.email,
          title: 'New Broadcast Message',
          message: `Admin ${currentUser.full_name} sent: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`,
          type: 'new_message',
          is_read: false,
        })
      );

      await Promise.all([...messagePromises, ...notificationPromises]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setMessage('');
      setAudience('all');
      onClose();
    },
  });

  const handleSend = () => {
    if (message.trim()) {
      broadcastMutation.mutate();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-indigo-600" />
            Broadcast Message
          </DialogTitle>
          <DialogDescription>
            Send a message to all team members at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label>Send to:</Label>
            <RadioGroup value={audience} onValueChange={setAudience}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="font-normal cursor-pointer">
                  All Users (Admins + Team Members)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="team" id="team" />
                <Label htmlFor="team" className="font-normal cursor-pointer">
                  Team Members Only
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your broadcast message..."
              className="min-h-[100px]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={!message.trim() || broadcastMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Send className="w-4 h-4 mr-2" />
            {broadcastMutation.isPending ? 'Sending...' : 'Send Broadcast'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}