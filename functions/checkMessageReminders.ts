import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all pending reminders that should be triggered
    const now = new Date();
    const reminders = await base44.asServiceRole.entities.MessageReminder.filter({
      is_triggered: false
    });

    const triggeredCount = reminders.filter(r => new Date(r.reminder_time) <= now).length;

    // Trigger due reminders
    for (const reminder of reminders) {
      const reminderTime = new Date(reminder.reminder_time);
      
      if (reminderTime <= now) {
        // Create notification
        const user = await base44.asServiceRole.entities.User.list('-created_date', 500);
        const targetUser = user.find(u => u.id === reminder.user_id);
        
        if (targetUser) {
          await base44.asServiceRole.entities.Notification.create({
            user_email: targetUser.email,
            title: 'Message Reminder',
            message: `Reminder: ${reminder.message_text.substring(0, 100)}`,
            type: 'check_in',
            is_read: false,
          });

          // Mark reminder as triggered
          await base44.asServiceRole.entities.MessageReminder.update(reminder.id, {
            is_triggered: true
          });
        }
      }
    }

    return Response.json({ 
      success: true, 
      triggered: triggeredCount,
      message: `Checked reminders, triggered ${triggeredCount}` 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});