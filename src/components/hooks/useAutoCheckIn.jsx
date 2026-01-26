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
        
        // Check if attendance record exists for today
        const existingAttendance = await base44.entities.Attendance.filter({
          employee_id: user.id,
          date: today
        });
        
        if (existingAttendance && existingAttendance.length > 0) {
          console.log('Attendance already exists for today');
          localStorage.setItem(`last_checkin_${user.id}`, today);
          return;
        }
        
        // Auto check-in
        const now = new Date();
        const clockInTime = format(now, 'HH:mm:ss');
        const hours = now.getHours();
        const minutes = now.getMinutes();
        
        // Determine status (late if after 9:00 AM)
        let status = 'present';
        if (hours > 9 || (hours === 9 && minutes > 0)) {
          status = 'late';
        }
        
        await base44.entities.Attendance.create({
          employee_id: user.id,
          employee_email: user.email,
          employee_name: user.full_name,
          date: today,
          clock_in: clockInTime,
          status: status,
          location: 'Auto Check-In'
        });
        
        localStorage.setItem(`last_checkin_${user.id}`, today);
        console.log('Auto check-in successful:', clockInTime);
        
        // Notify admin
        if (user.role !== 'admin') {
          const admins = await base44.entities.User.filter({ role: 'admin' });
          for (const admin of admins) {
            await base44.entities.Notification.create({
              user_email: admin.email,
              title: 'Employee Auto Check-In',
              message: `${user.full_name} automatically checked in at ${clockInTime}`,
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