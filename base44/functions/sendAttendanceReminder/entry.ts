import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const today = new Date().toISOString().split('T')[0];
    
    // Get all employees
    const employees = await base44.asServiceRole.entities.User.list();
    const employeeUsers = employees.filter(e => e.role === 'user');

    // Get today's attendance
    const todayAttendance = await base44.asServiceRole.entities.Attendance.filter({ date: today });
    const attendedEmails = todayAttendance.map(a => a.employee_email);

    // Find employees who haven't checked in
    const missingAttendance = employeeUsers.filter(emp => !attendedEmails.includes(emp.email));

    // Create in-app notifications only (no desktop notification for check-in reminders)
    const notifications = [];
    for (const employee of missingAttendance) {
      const notification = await base44.asServiceRole.entities.Notification.create({
        user_email: employee.email,
        title: 'Attendance Reminder',
        message: 'Please mark your attendance for today. It\'s already past 10:30 AM.',
        type: 'attendance_reminder',
        is_read: false,
      });
      notifications.push(notification);
    }

    return Response.json({ 
      success: true, 
      reminders_sent: notifications.length,
      employees_reminded: missingAttendance.map(e => e.email)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});