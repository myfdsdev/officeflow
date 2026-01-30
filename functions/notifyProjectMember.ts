import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();
    
    if (!data || !data.user_id || !data.project_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Get project details
    const projects = await base44.asServiceRole.entities.Project.filter({ id: data.project_id });
    if (!projects || projects.length === 0) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const project = projects[0];
    
    // Create notification for the user
    await base44.asServiceRole.entities.Notification.create({
      user_email: data.user_email,
      user_id: data.user_id,
      title: 'Added to Project',
      message: `📁 You have been added to project: ${project.project_name}`,
      type: 'project_added',
      is_read: false,
      related_id: data.project_id,
    });
    
    return Response.json({ 
      success: true, 
      message: 'Notification sent successfully' 
    });
  } catch (error) {
    console.error('Error in notifyProjectMember:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});