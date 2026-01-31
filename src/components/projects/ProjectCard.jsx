import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FolderKanban, Users, CheckSquare, MoreVertical, Trash2 } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";

export default function ProjectCard({ project, onOpen, onDelete, isAdmin }) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { data: tasks = [] } = useQuery({
    queryKey: ['project-tasks-count', project.id],
    queryFn: () => base44.entities.Task.filter({ project_id: project.id }),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['project-members-count', project.id],
    queryFn: () => base44.entities.ProjectMember.filter({ project_id: project.id }),
  });

  // Calculate progress based on task status weights
  const calculateProgress = () => {
    if (tasks.length === 0) return 0;
    
    const statusWeights = {
      not_started: 0,
      working_on_it: 50,
      done: 100,
      stuck: 25,
    };
    
    const totalProgress = tasks.reduce((sum, task) => {
      return sum + (statusWeights[task.status] || 0);
    }, 0);
    
    return Math.round(totalProgress / tasks.length);
  };

  const progress = calculateProgress();
  const completedTasks = tasks.filter(t => t.status === 'done').length;

  const handleDelete = () => {
    onDelete(project.id);
    setShowDeleteDialog(false);
    toast.success("Project deleted successfully");
  };

  return (
    <>
      <Card 
        className="hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4"
        style={{ borderLeftColor: project.color }}
        onClick={() => onOpen(project.id)}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: project.color + '20' }}
              >
                <FolderKanban className="w-5 h-5" style={{ color: project.color }} />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-900">{project.project_name}</h3>
                <p className="text-sm text-gray-500 mt-1">{project.description}</p>
              </div>
            </div>
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteDialog(true);
                    }}
                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Project
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Progress</span>
              <span className="text-sm font-medium text-gray-900">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${progress}%`,
                  backgroundColor: project.color 
                }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <CheckSquare className="w-4 h-4" />
              <span>{completedTasks}/{tasks.length} Tasks</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="w-4 h-4" />
              <span>{members.length} Members</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Project</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this project?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}