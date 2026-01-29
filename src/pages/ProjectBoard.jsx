import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Users, Settings } from "lucide-react";
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
              <div className="flex items-center gap-3">
                <div 
                  className="w-8 h-8 rounded-lg" 
                  style={{ backgroundColor: project.color }}
                />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{project.project_name}</h1>
                  <p className="text-sm text-gray-600">{project.description}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setShowMembers(true)}>
                <Users className="w-4 h-4 mr-2" />
                {members.length} Members
              </Button>
              {isAdmin && (
                <Button onClick={() => setShowAddTask(true)} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Task Table */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 grid gap-4" style={{
            gridTemplateColumns: `300px ${project.enabled_columns.map(col => {
              if (col === 'owner') return '200px';
              if (col === 'status') return '180px';
              if (col === 'due_date') return '150px';
              if (col === 'priority') return '130px';
              if (col === 'files') return '120px';
              if (col === 'notes') return '1fr';
              return '150px';
            }).join(' ')} 80px`
          }}>
            <div className="text-sm font-semibold text-gray-700">Task</div>
            {project.enabled_columns.includes('owner') && (
              <div className="text-sm font-semibold text-gray-700">Owner</div>
            )}
            {project.enabled_columns.includes('status') && (
              <div className="text-sm font-semibold text-gray-700">Status</div>
            )}
            {project.enabled_columns.includes('due_date') && (
              <div className="text-sm font-semibold text-gray-700">Due Date</div>
            )}
            {project.enabled_columns.includes('priority') && (
              <div className="text-sm font-semibold text-gray-700">Priority</div>
            )}
            {project.enabled_columns.includes('files') && (
              <div className="text-sm font-semibold text-gray-700">Files</div>
            )}
            {project.enabled_columns.includes('notes') && (
              <div className="text-sm font-semibold text-gray-700">Notes</div>
            )}
            <div className="text-sm font-semibold text-gray-700"></div>
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