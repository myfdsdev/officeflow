import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { employee_id, date } = await req.json();
    
    if (!employee_id || !date) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Get all sessions for this day
    const sessions = await base44.asServiceRole.entities.AttendanceSession.filter({
      employee_id,
      date
    });
    
    if (!sessions || sessions.length === 0) {
      return Response.json({ message: 'No sessions found' });
    }
    
    // Calculate total work hours
    let totalWorkHours = 0;
    let firstCheckIn = null;
    let lastCheckOut = null;
    let hasActiveSession = false;
    
    for (const session of sessions) {
      if (session.is_active) {
        hasActiveSession = true;
      }
      
      if (session.session_duration) {
        totalWorkHours += session.session_duration;
      }
      
      // Track first check-in
      if (!firstCheckIn || new Date(session.check_in_time) < new Date(firstCheckIn)) {
        firstCheckIn = session.check_in_time;
      }
      
      // Track last check-out
      if (session.check_out_time) {
        if (!lastCheckOut || new Date(session.check_out_time) > new Date(lastCheckOut)) {
          lastCheckOut = session.check_out_time;
        }
      }
    }
    
    // Determine status based on total work hours
    let status = 'absent';
    if (totalWorkHours >= 9) {
      status = 'present';
    } else if (totalWorkHours >= 4.5) {
      status = 'half_day';
    }
    
    // Determine if late
    // Office start: 10:00 AM, Late cutoff: 10:15 AM
    let isLate = false;
    if (firstCheckIn) {
      const checkInDate = new Date(firstCheckIn);
      const hours = checkInDate.getHours();
      const minutes = checkInDate.getMinutes();
      const timeInMinutes = hours * 60 + minutes;
      const lateCutoffMinutes = 10 * 60 + 15; // 10:15 AM
      
      // Late only if first check-in > 10:15 AM AND total work hours < 9
      if (timeInMinutes > lateCutoffMinutes && totalWorkHours < 9) {
        isLate = true;
      }
    }
    
    // If 9 hours completed, override late and half_day
    if (totalWorkHours >= 9) {
      isLate = false;
      status = 'present';
    }
    
    // Update attendance record
    const attendance = await base44.asServiceRole.entities.Attendance.filter({
      employee_id,
      date
    });
    
    if (attendance && attendance.length > 0) {
      await base44.asServiceRole.entities.Attendance.update(attendance[0].id, {
        total_work_hours: totalWorkHours,
        status,
        is_late: isLate,
        first_check_in: firstCheckIn,
        last_check_out: lastCheckOut,
        has_active_session: hasActiveSession
      });
    }
    
    return Response.json({
      success: true,
      total_work_hours: totalWorkHours,
      status,
      is_late: isLate,
      has_active_session: hasActiveSession
    });
    
  } catch (error) {
    console.error('Calculate attendance error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});