import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

export function useAutoCheckIn(user) {
  const hasAttemptedRef = useRef(false);

  useEffect(() => {
    const attemptAutoCheckIn = async () => {
      if (!user || hasAttemptedRef.current) return;
      
      hasAttemptedRef.current = true;
      
      try {
        const today = format(new Date(), 'yyyy-MM-dd');
        const lastCheckInDate = localStorage.getItem(`last_checkin_${user.id}`);
        
        // Check if already checked in today in localStorage
        if (lastCheckInDate === today) {
          console.log('Already checked in today (localStorage)');
          return;
        }
        
        // Check if there's an active session
        const activeSessions = await base44.entities.AttendanceSession.filter({
          employee_id: user.id,
          date: today,
          is_active: true
        });
        
        if (activeSessions && activeSessions.length > 0) {
          console.log('Active session already exists');
          localStorage.setItem(`last_checkin_${user.id}`, today);
          return;
        }
        
        // Auto check-in - create new session
        const now = new Date();
        const checkInTime = now.toISOString();
        
        // Get or create attendance record
        let attendance = await base44.entities.Attendance.filter({
          employee_id: user.id,
          date: today
        });
        
        let attendanceId;
        if (attendance && attendance.length > 0) {
          attendanceId = attendance[0].id;
        } else {
          const newAttendance = await base44.entities.Attendance.create({
            employee_id: user.id,
            employee_email: user.email,
            employee_name: user.full_name,
            date: today,
            first_check_in: checkInTime,
            status: 'present',
            total_work_hours: 0,
            has_active_session: true,
            location: 'Auto Check-In'
          });
          attendanceId = newAttendance.id;
        }
        
        // Create new session
        await base44.entities.AttendanceSession.create({
          attendance_id: attendanceId,
          employee_id: user.id,
          employee_email: user.email,
          date: today,
          check_in_time: checkInTime,
          is_active: true
        });
        
        // Update attendance first_check_in if this is the first session
        if (!attendance || attendance.length === 0) {
          await base44.entities.Attendance.update(attendanceId, {
            first_check_in: checkInTime,
            has_active_session: true
          });
        }
        
        localStorage.setItem(`last_checkin_${user.id}`, today);
        console.log('Auto check-in successful:', checkInTime);
        
        // Create attendance session
        await base44.entities.AttendanceSession.create({
          attendance_id: attendanceId,
          employee_id: user.id,
          employee_email: user.email,
          date: today,
          check_in_time: checkInTime,
          is_active: true
        });
        
        // Notify admin
        if (user.role !== 'admin') {
          const admins = await base44.entities.User.filter({ role: 'admin' });
          for (const admin of admins) {
            await base44.entities.Notification.create({
              user_email: admin.email,
              user_id: admin.id,
              title: 'Employee Auto Check-In',
              message: `${user.full_name} automatically checked in at ${format(now, 'h:mm a')}`,
              type: 'check_in',
              related_id: user.id,
              is_read: false,
            });
          }
        }
      } catch (error) {
        console.error('Auto check-in failed:', error);
      }
    };

    attemptAutoCheckIn();
  }, [user]);
}