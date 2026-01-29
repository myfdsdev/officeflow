import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trash2, FileText, Calendar, Upload } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { base44 } from '@/api/base44Client';
import FilesDialog from './FilesDialog';

const statusConfig = {
  not_started: { label: 'Not Started', color: 'bg-gray-100 text-gray-800' },
  working_on_it: { label: 'Working on it', color: 'bg-blue-100 text-blue-800' },
  done: { label: 'Done', color: 'bg-green-100 text-green-800' },
  stuck: { label: 'Stuck', color: 'bg-red-100 text-red-800' },
};

const priorityConfig = {
  low: { label: 'Low', color: 'bg-gray-100 text-gray-700' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-800' },
  critical: { label: 'Critical', color: 'bg-red-100 text-red-800' },
};

export default function TaskRow({ task, project, members, isAdmin, currentUserId, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(task.task_name);
  const [uploading, setUploading] = useState(false);
  const [showFilesDialog, setShowFilesDialog] = useState(false);

  const canEdit = isAdmin || task.owner_id === currentUserId;

  const handleSaveName = () => {
    if (editedName.trim() !== task.task_name) {
      onUpdate({ task_name: editedName.trim() });
    }
    setIsEditing(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const currentFiles = task.files || [];
      onUpdate({ files: [...currentFiles, file_url] });
    } catch (error) {
      console.error('File upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = (fileIndex) => {
    const currentFiles = task.files || [];
    const updatedFiles = currentFiles.filter((_, index) => index !== fileIndex);
    onUpdate({ files: updatedFiles });
  };

  return (
    <div 
      className="border-b border-gray-200 px-6 py-4 hover:bg-gray-50 transition-colors grid gap-4 items-center"
      style={{
        gridTemplateColumns: `300px ${project.enabled_columns.map(col => {
          if (col === 'owner') return '200px';
          if (col === 'status') return '180px';
          if (col === 'due_date') return '150px';
          if (col === 'priority') return '130px';
          if (col === 'files') return '120px';
          if (col === 'notes') return '1fr';
          return '150px';
        }).join(' ')} 80px`
      }}
    >
      {/* Task Name */}
      <div>
        {isEditing ? (
          <Input
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
            autoFocus
            className="h-8"
          />
        ) : (
          <div 
            onClick={() => canEdit && setIsEditing(true)}
            className={`font-medium ${canEdit ? 'cursor-pointer hover:text-indigo-600' : ''}`}
          >
            {task.task_name}
          </div>
        )}
      </div>

      {/* Owner */}
      {project.enabled_columns.includes('owner') && (
        <div>
          <Select
            value={task.owner_id || ''}
            onValueChange={(value) => {
              const member = members.find(m => m.user_id === value);
              onUpdate({ owner_id: value, owner_name: member?.user_name });
            }}
            disabled={!canEdit}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Assign...">
                {task.owner_name && (
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs bg-indigo-100 text-indigo-600">
                        {task.owner_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{task.owner_name}</span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {members.map((member) => (
                <SelectItem key={member.user_id} value={member.user_id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs bg-indigo-100 text-indigo-600">
                        {member.user_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{member.user_name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Status */}
      {project.enabled_columns.includes('status') && (
        <div>
          <Select
            value={task.status}
            onValueChange={(value) => onUpdate({ status: value })}
            disabled={!canEdit}
          >
            <SelectTrigger className="h-9">
              <SelectValue>
                <Badge className={statusConfig[task.status].color}>
                  {statusConfig[task.status].label}
                </Badge>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(statusConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  <Badge className={config.color}>{config.label}</Badge>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Due Date */}
      {project.enabled_columns.includes('due_date') && (
        <div>
          <Input
            type="date"
            value={task.due_date || ''}
            onChange={(e) => onUpdate({ due_date: e.target.value })}
            disabled={!canEdit}
            className="h-9"
          />
        </div>
      )}

      {/* Priority */}
      {project.enabled_columns.includes('priority') && (
        <div>
          <Select
            value={task.priority}
            onValueChange={(value) => onUpdate({ priority: value })}
            disabled={!canEdit}
          >
            <SelectTrigger className="h-9">
              <SelectValue>
                <Badge className={priorityConfig[task.priority].color}>
                  {priorityConfig[task.priority].label}
                </Badge>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(priorityConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  <Badge className={config.color}>{config.label}</Badge>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Files */}
      {project.enabled_columns.includes('files') && (
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowFilesDialog(true)}
            disabled={!task.files || task.files.length === 0}
          >
            <FileText className="w-4 h-4 mr-1" />
            {task.files?.length || 0}
          </Button>
          {canEdit && (
            <label className="cursor-pointer">
              <Button variant="ghost" size="icon" asChild disabled={uploading}>
                <span>
                  <Upload className="w-4 h-4" />
                </span>
              </Button>
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
          )}
        </div>
      )}

      {/* Notes */}
      {project.enabled_columns.includes('notes') && (
        <div>
          <Input
            value={task.notes || ''}
            onChange={(e) => {
              const newValue = e.target.value;
              // Debounce update to avoid too many API calls
              clearTimeout(window.notesTimeout);
              window.notesTimeout = setTimeout(() => {
                onUpdate({ notes: newValue });
              }, 500);
            }}
            placeholder="Add notes..."
            disabled={!canEdit}
            className="h-9"
          />
        </div>
      )}

      {/* Actions */}
      <div>
        {isAdmin && (
          <Button variant="ghost" size="icon" onClick={onDelete} className="text-red-600 hover:text-red-700">
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Files Dialog */}
      <FilesDialog
        open={showFilesDialog}
        onClose={() => setShowFilesDialog(false)}
        files={task.files}
        taskName={task.task_name}
        canEdit={canEdit}
        onRemoveFile={handleRemoveFile}
      />
    </div>
  );
}