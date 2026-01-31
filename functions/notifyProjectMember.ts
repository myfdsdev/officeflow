import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Only process create events
    if (event.type !== 'create' || !data) {
      return Response.json({ status: 'skipped' });
    }

    // Get project details
    const project = await base44.asServiceRole.entities.Project.get(data.project_id);
    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get user details
    const user = await base44.asServiceRole.entities.User.get(data.user_id);
    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Create notification for the added member
    await base44.asServiceRole.entities.Notification.create({
      user_email: user.email,
      user_id: user.id,
      title: '📁 Added to Project',
      message: `You have been added to project: ${project.project_name}`,
      type: 'project_added',
      related_id: project.id,
      is_read: false
    });

    console.log(`Notification sent to ${user.email} for project ${project.project_name}`);

    return Response.json({ 
      status: 'success',
      message: `Notification sent to ${user.email}`
    });
  } catch (error) {
    console.error('Error in notifyProjectMember:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});