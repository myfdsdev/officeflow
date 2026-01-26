import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar, Clock, CheckCircle2, LogIn, LogOut, FileText, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

import LeaveRequestForm from '../components/leave/LeaveRequestForm';
import LeaveRequestList from '../components/leave/LeaveRequestList';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: myAttendance = [], isLoading: loadingAttendance } = useQuery({
    queryKey: ['myAttendance', user?.email],
    queryFn: () => base44.entities.Attendance.filter({ employee_email: user.email }, '-date', 30),
    enabled: !!user?.email,
  });

  const { data: myLeaves = [], isLoading: loadingLeaves } = useQuery({
    queryKey: ['myLeaves', user?.email],
    queryFn: () => base44.entities.LeaveRequest.filter({ employee_email: user.email }, '-created_date', 10),
    enabled: !!user?.email,
  });

  const todayAttendance = myAttendance.find(a => a.date === today);

  const clockInMutation = useMutation({
    mutationFn: async () => {
      // Check for duplicate attendance
      const existingAttendance = await base44.entities.Attendance.filter({
        employee_email: user.email,
        date: today
      });

      if (existingAttendance.length > 0) {
        throw new Error('Attendance already marked for today');
      }

      const now = new Date();
      const clockInTime = format(now, 'HH:mm');
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const totalMinutes = hours * 60 + minutes;
      
      // Determine status based on check-in time
      // Before 10:00 AM (600 minutes) → Present
      // After 10:15 AM (615 minutes) → Late
      // Between 10:00 and 10:15 → Present (grace period)
      let status = 'present';
      if (totalMinutes > 615) {
        status = 'late';
      }
      
      const attendance = await base44.entities.Attendance.create({
        employee_id: user.id,
        employee_email: user.email,
        employee_name: user.full_name,
        date: today,
        clock_in: clockInTime,
        status: status,
      });

      // Send success notification to employee
      await base44.entities.Notification.create({
        user_email: user.email,
        title: 'Check-in Successful',
        message: `You checked in at ${clockInTime}${status === 'late' ? ' (Late Entry)' : ''}`,
        type: 'check_in',
        related_id: attendance.id,
      });

      // If late, send late entry alert
      if (status === 'late') {
        await base44.entities.Notification.create({
          user_email: user.email,
          title: 'Late Entry Alert',
          message: `Your check-in at ${clockInTime} is after office time. Please contact HR if needed.`,
          type: 'check_in',
          related_id: attendance.id,
        });
      }

      // Get all admins and notify them
      const allUsers = await base44.entities.User.list();
      const admins = allUsers.filter(u => u.role === 'admin');

      for (const admin of admins) {
        await base44.entities.Notification.create({
          user_email: admin.email,
          title: 'Employee Checked In',
          message: `${user.full_name} has checked in at ${clockInTime} (${status})`,
          type: 'check_in',
          related_id: attendance.id,
        });
      }

      return attendance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myAttendance'] });
      alert('Check-in successful! ✓');
    },
    onError: (error) => {
      alert(error.message || 'Failed to check in. Please try again.');
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      const clockInTime = todayAttendance.clock_in.split(':');
      const clockOutTimeStr = format(new Date(), 'HH:mm');
      const clockOutTime = clockOutTimeStr.split(':');
      const clockInMinutes = parseInt(clockInTime[0]) * 60 + parseInt(clockInTime[1]);
      const clockOutMinutes = parseInt(clockOutTime[0]) * 60 + parseInt(clockOutTime[1]);
      const workHours = Math.max(0, (clockOutMinutes - clockInMinutes) / 60);
      
      // Determine final status based on work hours
      // If less than 4 hours → Half Day
      let finalStatus = todayAttendance.status;
      if (workHours < 4) {
        finalStatus = 'half_day';
      }
      
      const updated = await base44.entities.Attendance.update(todayAttendance.id, {
        clock_out: clockOutTimeStr,
        work_hours: workHours,
        status: finalStatus,
      });

      // Send success notification to employee
      await base44.entities.Notification.create({
        user_email: user.email,
        title: 'Check-out Successful',
        message: `You checked out at ${clockOutTimeStr}. Total work hours: ${workHours.toFixed(1)}hrs`,
        type: 'check_in',
        related_id: todayAttendance.id,
      });

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myAttendance'] });
      alert('Check-out successful! ✓');
    },
    onError: (error) => {
      alert(error.message || 'Failed to check out. Please try again.');
    },
  });

  const leaveRequestMutation = useMutation({
    mutationFn: (data) => base44.entities.LeaveRequest.create({
      ...data,
      employee_id: user.id,
      employee_email: user.email,
      employee_name: user.full_name,
      status: 'pending',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myLeaves'] });
      setShowLeaveForm(false);
    },
  });

  const thisMonthAttendance = myAttendance.filter(a => 
    a.date.startsWith(format(new Date(), 'yyyy-MM'))
  );
  const presentDays = thisMonthAttendance.filter(a => a.status === 'present').length;
  const lateDays = thisMonthAttendance.filter(a => a.status === 'late').length;
  const totalHours = thisMonthAttendance.reduce((sum, a) => sum + (a.work_hours || 0), 0);
  const pendingLeaves = myLeaves.filter(l => l.status === 'pending').length;
  const totalWorkingDays = thisMonthAttendance.length;
  const attendancePercentage = totalWorkingDays > 0 
    ? ((presentDays / totalWorkingDays) * 100).toFixed(1) 
    : '0';

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50">
      <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8 pb-20">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="p-6 border-0 shadow-sm bg-white/80 backdrop-blur">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16 border-4 border-indigo-100">
                {user.profile_photo ? (
                  <AvatarImage src={user.profile_photo} alt={user.full_name} />
                ) : (
                  <AvatarFallback className="bg-indigo-600 text-white text-xl font-bold">
                    {getInitials(user.full_name)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">
                  Welcome, {user.full_name?.split(' ')[0]}!
                </h1>
                <p className="text-gray-500 text-sm mt-1">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
              </div>
              <div className="text-right hidden md:block">
                <div className="text-3xl font-bold text-indigo-600">{attendancePercentage}%</div>
                <p className="text-xs text-gray-500">This Month</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Large Check-In/Out Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <Card className="p-8 border-0 shadow-lg bg-gradient-to-br from-indigo-600 to-indigo-700 text-white">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold mb-2">Today's Attendance</h2>
              {todayAttendance ? (
                <div className="flex items-center justify-center gap-4 flex-wrap">
                  {todayAttendance.clock_in && (
                    <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
                      <LogIn className="w-4 h-4" />
                      <span>In: {todayAttendance.clock_in}</span>
                    </div>
                  )}
                  {todayAttendance.clock_out && (
                    <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
                      <LogOut className="w-4 h-4" />
                      <span>Out: {todayAttendance.clock_out}</span>
                    </div>
                  )}
                  {todayAttendance.work_hours && (
                    <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
                      <Clock className="w-4 h-4" />
                      <span>{todayAttendance.work_hours.toFixed(1)} hrs</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-indigo-200">No attendance marked yet</p>
              )}
            </div>

            <div className="flex gap-4 justify-center">
              {!todayAttendance?.clock_in && (
                <Button
                  onClick={() => clockInMutation.mutate()}
                  disabled={clockInMutation.isPending}
                  size="lg"
                  className="bg-white text-indigo-600 hover:bg-indigo-50 font-bold text-lg px-12 py-8 rounded-2xl shadow-xl h-auto"
                >
                  <LogIn className="w-6 h-6 mr-3" />
                  Check In
                </Button>
              )}
              {todayAttendance?.clock_in && !todayAttendance?.clock_out && (
                <Button
                  onClick={() => setShowCheckoutConfirm(true)}
                  disabled={clockOutMutation.isPending}
                  size="lg"
                  className="bg-white text-indigo-600 hover:bg-indigo-50 font-bold text-lg px-12 py-8 rounded-2xl shadow-xl h-auto"
                >
                  <LogOut className="w-6 h-6 mr-3" />
                  Check Out
                </Button>
              )}
              {todayAttendance?.clock_out && (
                <div className="flex items-center gap-3 bg-white/20 rounded-2xl px-8 py-6">
                  <CheckCircle2 className="w-6 h-6" />
                  <span className="font-semibold text-lg">Attendance Completed</span>
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
        >
          <Card className="p-5 border-0 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-500 text-xs font-medium mb-1">Present</p>
                <p className="text-2xl font-bold text-gray-900">{presentDays}</p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-50">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </Card>

          <Card className="p-5 border-0 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-500 text-xs font-medium mb-1">Late</p>
                <p className="text-2xl font-bold text-gray-900">{lateDays}</p>
              </div>
              <div className="p-2 rounded-lg bg-amber-50">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </Card>

          <Card className="p-5 border-0 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-500 text-xs font-medium mb-1">Total Hours</p>
                <p className="text-2xl font-bold text-gray-900">{totalHours.toFixed(0)}</p>
              </div>
              <div className="p-2 rounded-lg bg-indigo-50">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
          </Card>

          <Card className="p-5 border-0 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-500 text-xs font-medium mb-1">Pending Leaves</p>
                <p className="text-2xl font-bold text-gray-900">{pendingLeaves}</p>
              </div>
              <div className="p-2 rounded-lg bg-rose-50">
                <FileText className="w-5 h-5 text-rose-600" />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <div className="flex justify-end">
            <Button
              onClick={() => setShowLeaveForm(true)}
              size="lg"
              className="bg-indigo-600 hover:bg-indigo-700 shadow-md"
            >
              <FileText className="w-5 h-5 mr-2" />
              Request Leave
            </Button>
          </div>
        </motion.div>

        {/* Recent Leaves */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <LeaveRequestList requests={myLeaves.slice(0, 5)} />
        </motion.div>

        <LeaveRequestForm
          open={showLeaveForm}
          onClose={() => setShowLeaveForm(false)}
          onSubmit={(data) => leaveRequestMutation.mutate(data)}
          isLoading={leaveRequestMutation.isPending}
        />

        {/* Checkout Confirmation Dialog */}
        <AlertDialog open={showCheckoutConfirm} onOpenChange={setShowCheckoutConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Check Out की पुष्टि करें</AlertDialogTitle>
              <AlertDialogDescription>
                क्या आप वाकई चेक आउट करना चाहते हैं? यह आपके आज के काम का समय दर्ज कर देगा।
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>रद्द करें</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setShowCheckoutConfirm(false);
                  clockOutMutation.mutate();
                }}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                हाँ, Check Out करें
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}