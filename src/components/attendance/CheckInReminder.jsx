import React, { useEffect, useState } from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function CheckInReminder({ user, todayAttendance }) {
  const [open, setOpen] = useState(false);
  const [reminderShownToday, setReminderShownToday] = useState(false);

  useEffect(() => {
    if (!user || !todayAttendance) return;

    // Check if user has NOT checked in and reminder hasn't been shown
    if (!todayAttendance.first_check_in && !reminderShownToday) {
      // Show reminder after 1 second (when page loads)
      const timer = setTimeout(() => {
        setOpen(true);
        setReminderShownToday(true);
        // Store in session to prevent re-showing on refresh during same day
        sessionStorage.setItem(`reminder_shown_${user.id}_${format(new Date(), 'yyyy-MM-dd')}`, 'true');
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [user, todayAttendance, reminderShownToday]);

  // Close and clear reminder if user checks in
  useEffect(() => {
    if (todayAttendance?.first_check_in && open) {
      setOpen(false);
    }
  }, [todayAttendance?.first_check_in, open]);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-indigo-600" />
            <AlertDialogTitle>Time to Check In</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="mt-2">
            You haven't checked in yet today. Please click the Check In button on your dashboard to start your work day.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex justify-end gap-2 pt-4">
          <Button
            onClick={() => setOpen(false)}
            variant="outline"
          >
            Dismiss
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}