import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Edit,
  MailOpen,
  Bell,
  BellOff,
  Link as LinkIcon,
  Copy,
  Pin,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { format, addMinutes, addHours, addDays } from 'date-fns';
import { toast } from 'react-hot-toast';

export default function MessageContextMenu({ 
  message, 
  currentUser, 
  onEdit, 
  onMarkUnread,
  onReminder,
  onToggleMute,
  onCopyLink,
  onPin,
  onDelete,
  children 
}) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editedText, setEditedText] = useState(message.message_text);
  const [customReminderTime, setCustomReminderTime] = useState('');

  const isSender = message.sender_id === currentUser.id;
  const isAdmin = currentUser.role === 'admin';
  const isMuted = message.muted_by?.includes(currentUser.id);

  const handleEdit = () => {
    setEditedText(message.message_text);
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (editedText.trim() && editedText !== message.message_text) {
      await onEdit(message.id, editedText.trim());
      setShowEditDialog(false);
      toast.success('Message edited');
    }
  };

  const handleMarkUnread = async () => {
    await onMarkUnread(message.id);
    toast.success('Marked as unread');
  };

  const handleReminder = (minutes) => {
    const reminderTime = addMinutes(new Date(), minutes);
    onReminder(message.id, reminderTime, message.message_text);
    toast.success(`Reminder set for ${format(reminderTime, 'h:mm a')}`);
  };

  const handleCustomReminder = () => {
    if (customReminderTime) {
      const reminderTime = new Date(customReminderTime);
      onReminder(message.id, reminderTime, message.message_text);
      setShowReminderDialog(false);
      toast.success('Custom reminder set');
    }
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.message_text);
    toast.success('Message copied');
  };

  const handleCopyLink = async () => {
    const link = await onCopyLink(message.id);
    navigator.clipboard.writeText(link);
    toast.success('Link copied to clipboard');
  };

  const handleToggleMute = async () => {
    await onToggleMute(message.id);
    toast.success(isMuted ? 'Notifications enabled' : 'Notifications muted');
  };

  const handlePin = async () => {
    await onPin(message.id, !message.is_pinned);
    toast.success(message.is_pinned ? 'Message unpinned' : 'Message pinned');
  };

  const handleDelete = async (deleteForEveryone) => {
    await onDelete(message.id, deleteForEveryone);
    setShowDeleteDialog(false);
    toast.success('Message deleted');
  };

  const canDelete = isSender || isAdmin;
  const canEdit = isSender && !message.is_deleted;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {children || (
            <button className="p-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {canEdit && (
            <DropdownMenuItem onClick={handleEdit}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Message
            </DropdownMenuItem>
          )}
          
          {!isSender && (
            <DropdownMenuItem onClick={handleMarkUnread}>
              <MailOpen className="w-4 h-4 mr-2" />
              Mark as Unread
            </DropdownMenuItem>
          )}

          <DropdownMenuItem onClick={() => setShowReminderDialog(true)}>
            <Bell className="w-4 h-4 mr-2" />
            Remind Me
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleToggleMute}>
            {isMuted ? (
              <>
                <Bell className="w-4 h-4 mr-2" />
                Turn On Notifications
              </>
            ) : (
              <>
                <BellOff className="w-4 h-4 mr-2" />
                Turn Off Notifications
              </>
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleCopyLink}>
            <LinkIcon className="w-4 h-4 mr-2" />
            Copy Link
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleCopyMessage}>
            <Copy className="w-4 h-4 mr-2" />
            Copy Message
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handlePin}>
            <Pin className="w-4 h-4 mr-2" />
            {message.is_pinned ? 'Unpin Message' : 'Pin Message'}
          </DropdownMenuItem>

          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Message
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Message</DialogTitle>
          </DialogHeader>
          <Input
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reminder Dialog */}
      <Dialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Reminder</DialogTitle>
            <DialogDescription>
              When do you want to be reminded about this message?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => {
                handleReminder(30);
                setShowReminderDialog(false);
              }}
            >
              In 30 minutes
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => {
                handleReminder(60);
                setShowReminderDialog(false);
              }}
            >
              In 1 hour
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => {
                const tomorrow9am = addDays(new Date(), 1);
                tomorrow9am.setHours(9, 0, 0, 0);
                onReminder(message.id, tomorrow9am, message.message_text);
                setShowReminderDialog(false);
                toast.success('Reminder set for tomorrow 9 AM');
              }}
            >
              Tomorrow at 9 AM
            </Button>
            <div className="pt-2">
              <Label>Custom Time</Label>
              <Input
                type="datetime-local"
                value={customReminderTime}
                onChange={(e) => setCustomReminderTime(e.target.value)}
              />
              <Button 
                className="w-full mt-2"
                onClick={handleCustomReminder}
                disabled={!customReminderTime}
              >
                Set Custom Reminder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Message</DialogTitle>
            <DialogDescription>
              How do you want to delete this message?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => handleDelete(false)}
            >
              Delete for Me
            </Button>
            {isSender && (
              <Button 
                variant="outline" 
                className="w-full justify-start text-red-600"
                onClick={() => handleDelete(true)}
              >
                Delete for Everyone
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}