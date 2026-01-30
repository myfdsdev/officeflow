import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Plus, FolderKanban } from "lucide-react";
import ProjectCard from '../components/projects/ProjectCard';
import CreateProjectDialog from '../components/projects/CreateProjectDialog';

export default function ProjectsPage() {
  const [user, setUser] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const allProjects = await base44.entities.Project.filter({ is_archived: false });
      
      if (user?.role === 'admin') {
        return allProjects;
      }
      
      // For regular users, only show projects they're members of
      const memberships = await base44.entities.ProjectMember.filter({ user_id: user?.id });
      const memberProjectIds = memberships.map(m => m.project_id);
      return allProjects.filter(p => memberProjectIds.includes(p.id));
    },
    enabled: !!user,
    initialData: [],
  });

  const handleOpenProject = (projectId) => {
    navigate(createPageUrl('ProjectBoard') + `?projectId=${projectId}`);
  };

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId) => {
      // Delete all tasks
      const projectTasks = await base44.entities.Task.filter({ project_id: projectId });
      for (const task of projectTasks) {
        await base44.entities.Task.delete(task.id);
      }

      // Delete all members
      const projectMembers = await base44.entities.ProjectMember.filter({ project_id: projectId });
      for (const member of projectMembers) {
        await base44.entities.ProjectMember.delete(member.id);
      }

      // Delete the project
      await base44.entities.Project.delete(projectId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      alert('प्रोजेक्ट सफलतापूर्वक डिलीट हो गया।');
    },
    onError: (error) => {
      alert('प्रोजेक्ट डिलीट करने में विफल: ' + error.message);
    },
  });

  if (!user || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <FolderKanban className="w-8 h-8 text-indigo-600" />
              Projects
            </h1>
            <p className="text-gray-600 mt-2">Manage your team's projects and tasks</p>
          </div>
          {user.role === 'admin' && (
            <Button onClick={() => setShowCreateDialog(true)} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          )}
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="text-center py-16">
            <FolderKanban className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-4">No projects yet</p>
            {user.role === 'admin' && (
              <Button onClick={() => setShowCreateDialog(true)} variant="outline">
                Create Your First Project
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpen={handleOpenProject}
                onDelete={(id) => deleteProjectMutation.mutate(id)}
                isAdmin={user?.role === 'admin'}
              />
            ))}
          </div>
        )}

        {/* Create Project Dialog */}
        <CreateProjectDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          currentUser={user}
        />
      </div>
    </div>
  );
}