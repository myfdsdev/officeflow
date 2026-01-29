import React from 'react';
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderKanban, Users, CheckSquare } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function ProjectCard({ project, onOpen }) {
  const { data: tasks = [] } = useQuery({
    queryKey: ['project-tasks-count', project.id],
    queryFn: () => base44.entities.Task.filter({ project_id: project.id }),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['project-members-count', project.id],
    queryFn: () => base44.entities.ProjectMember.filter({ project_id: project.id }),
  });

  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  return (
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
  );
}