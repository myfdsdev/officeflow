import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Only process new message events
    if (event.type !== 'create' || !data) {
      return Response.json({ success: false, reason: 'Not a create event' });
    }

    const message = data;

    // Create notification for the receiver
    await base44.asServiceRole.entities.Notification.create({
      user_email: message.receiver_email,
      title: 'New Message',
      message: `${message.sender_name}: ${message.message_text.substring(0, 50)}${message.message_text.length > 50 ? '...' : ''}`,
      type: 'check_in',
      related_id: message.id,
      is_read: false,
    });

    return Response.json({ 
      success: true, 
      notified: message.receiver_email 
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});