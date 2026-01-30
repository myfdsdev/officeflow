import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Users, Settings, Trash2 } from "lucide-react";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import TaskRow from '../components/projects/TaskRow';
import AddTaskDialog from '../components/projects/AddTaskDialog';
import ManageMembersDialog from '../components/projects/ManageMembersDialog';

export default function ProjectBoardPage() {
  const [user, setUser] = useState(null);
  const [project, setProject] = useState(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('projectId');

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  useEffect(() => {
    if (projectId) {
      base44.entities.Project.filter({ id: projectId }).then(projects => {
        if (projects && projects.length > 0) {
          setProject(projects[0]);
        }
      });
    }
  }, [projectId]);

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => base44.entities.Task.filter({ project_id: projectId }, 'position'),
    enabled: !!projectId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => base44.entities.ProjectMember.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  // Real-time task updates
  useEffect(() => {
    if (!projectId) return;

    const unsubscribe = base44.entities.Task.subscribe((event) => {
      if (event.data?.project_id === projectId) {
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      }
    });

    return unsubscribe;
  }, [projectId, queryClient]);

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, data }) => base44.entities.Task.update(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId) => base44.entities.Task.delete(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });

  const handleDeleteProject = async () => {
    try {
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

      // Redirect to projects page
      window.location.href = createPageUrl('Projects');
    } catch (error) {
      alert('Failed to delete project: ' + error.message);
    }
  };

  if (!user || !project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const isAdmin = user.role === 'admin';
  const isMember = members.some(m => m.user_id === user.id);
  const hasAccess = isAdmin || isMember;

  // Calculate progress based on task status
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

  const projectProgress = calculateProgress();

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 text-lg">You don't have access to this project</p>
          <Link to={createPageUrl('Projects')}>
            <Button className="mt-4" variant="outline">Back to Projects</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Projects')}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3 flex-1">
                <div 
                  className="w-8 h-8 rounded-lg" 
                  style={{ backgroundColor: project.color }}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-gray-900">{project.project_name}</h1>
                    <div className="flex items-center gap-3">
                      <div className="w-48 bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="h-2.5 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${projectProgress}%`,
                            backgroundColor: project.color 
                          }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-700">{projectProgress}%</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setShowMembers(true)}>
                <Users className="w-4 h-4 mr-2" />
                {members.length} Members
              </Button>
              {isAdmin && (
                <>
                  <Button onClick={() => setShowAddTask(true)} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Task
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this project? This will also delete all tasks and members.')) {
                        handleDeleteProject();
                      }
                    }}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Delete Project
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Task Table */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-6 py-3.5 grid gap-3 items-center" style={{
            gridTemplateColumns: `220px ${project.enabled_columns.map(col => {
              if (col === 'owner') return '180px';
              if (col === 'status') return '160px';
              if (col === 'due_date') return '140px';
              if (col === 'priority') return '120px';
              if (col === 'files') return '100px';
              if (col === 'notes') return '1fr';
              return '140px';
            }).join(' ')} 60px`
          }}>
            <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">Task</div>
            {project.enabled_columns.includes('owner') && (
              <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">Owner</div>
            )}
            {project.enabled_columns.includes('status') && (
              <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">Status</div>
            )}
            {project.enabled_columns.includes('due_date') && (
              <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">Due Date</div>
            )}
            {project.enabled_columns.includes('priority') && (
              <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">Priority</div>
            )}
            {project.enabled_columns.includes('files') && (
              <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">Files</div>
            )}
            {project.enabled_columns.includes('notes') && (
              <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">Notes</div>
            )}
            <div className="text-xs font-bold text-gray-600 uppercase tracking-wider"></div>
          </div>

          {/* Task Rows */}
          <div>
            {tasks.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No tasks yet. Click "Add Task" to get started.
              </div>
            ) : (
              tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  project={project}
                  members={members}
                  isAdmin={isAdmin}
                  currentUserId={user.id}
                  onUpdate={(data) => updateTaskMutation.mutate({ taskId: task.id, data })}
                  onDelete={() => deleteTaskMutation.mutate(task.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <AddTaskDialog
        open={showAddTask}
        onClose={() => setShowAddTask(false)}
        project={project}
        members={members}
      />

      <ManageMembersDialog
        open={showMembers}
        onClose={() => setShowMembers(false)}
        project={project}
        members={members}
        isAdmin={isAdmin}
      />
    </div>
  );
}