import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();
    
    if (!data || !data.user_id || !data.group_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Get group details
    const groups = await base44.asServiceRole.entities.Group.filter({ id: data.group_id });
    if (!groups || groups.length === 0) {
      return Response.json({ error: 'Group not found' }, { status: 404 });
    }
    
    const group = groups[0];
    
    // Create notification for the user
    await base44.asServiceRole.entities.Notification.create({
      user_email: data.user_email,
      user_id: data.user_id,
      title: 'Added to Group',
      message: `👥 You have been added to group: ${group.group_name}`,
      type: 'group_added',
      is_read: false,
      related_id: data.group_id,
    });
    
    return Response.json({ 
      success: true, 
      message: 'Notification sent successfully' 
    });
  } catch (error) {
    console.error('Error in notifyGroupMember:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});