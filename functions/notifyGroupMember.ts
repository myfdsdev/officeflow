import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Only process create events
    if (event.type !== 'create' || !data) {
      return Response.json({ status: 'skipped' });
    }

    // Get group details
    const group = await base44.asServiceRole.entities.Group.get(data.group_id);
    if (!group) {
      return Response.json({ error: 'Group not found' }, { status: 404 });
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
      title: '👥 Added to Group',
      message: `You have been added to group: ${group.group_name}`,
      type: 'group_added',
      related_id: group.id,
      is_read: false
    });

    console.log(`Notification sent to ${user.email} for group ${group.group_name}`);

    return Response.json({ 
      status: 'success',
      message: `Notification sent to ${user.email}`
    });
  } catch (error) {
    console.error('Error in notifyGroupMember:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});