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

// Live Timer Component
function LiveTimer({ clockIn, clockOut }) {
  const [elapsed, setElapsed] = useState('00:00:00');

  useEffect(() => {
    if (!clockIn || clockOut) {
      // If not clocked in or already clocked out, show static time
      if (clockOut && clockIn) {
        const [inH, inM] = clockIn.split(':').map(Number);
        const [outH, outM] = clockOut.split(':').map(Number);
        const totalMinutes = (outH * 60 + outM) - (inH * 60 + inM);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const seconds = 0;
        setElapsed(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
      } else {
        setElapsed('00:00:00');
      }
      return;
    }

    // Calculate and update elapsed time every second
    const updateTimer = () => {
      const now = new Date();
      const [clockInHours, clockInMinutes] = clockIn.split(':').map(Number);
      
      const clockInDate = new Date();
      clockInDate.setHours(clockInHours, clockInMinutes, 0, 0);
      
      const diffMs = now - clockInDate;
      const diffSeconds = Math.floor(diffMs / 1000);
      
      const hours = Math.floor(diffSeconds / 3600);
      const minutes = Math.floor((diffSeconds % 3600) / 60);
      const seconds = diffSeconds % 60;
      
      setElapsed(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [clockIn, clockOut]);

  return (
    <div className="text-5xl font-bold text-gray-900 font-mono">
      {elapsed}
    </div>
  );
}

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
          <Card className="p-8 md:p-12 border-0 shadow-lg bg-white">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* Left Side - Check In/Out Button */}
              <div className="flex flex-col items-center">
                <p className="text-gray-400 text-sm uppercase tracking-wide mb-6">
                  {!todayAttendance?.clock_in ? 'Ready to Start?' : todayAttendance?.clock_out ? 'Great Job Today!' : 'Currently Working'}
                </p>
                
                {!todayAttendance?.clock_in && (
                  <button
                    onClick={() => clockInMutation.mutate()}
                    disabled={clockInMutation.isPending}
                    className="relative w-64 h-64 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-2xl hover:shadow-indigo-300 hover:scale-105 transition-all duration-300 group disabled:opacity-50"
                  >
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <LogIn className="w-12 h-12 text-white mb-3 group-hover:scale-110 transition-transform" />
                      <span className="text-white font-bold text-2xl">Check In</span>
                    </div>
                  </button>
                )}

                {todayAttendance?.clock_in && !todayAttendance?.clock_out && (
                  <button
                    onClick={() => setShowCheckoutConfirm(true)}
                    disabled={clockOutMutation.isPending}
                    className="relative w-64 h-64 rounded-full bg-gradient-to-br from-rose-500 to-rose-700 shadow-2xl hover:shadow-rose-300 hover:scale-105 transition-all duration-300 group disabled:opacity-50"
                  >
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <LogOut className="w-12 h-12 text-white mb-3 group-hover:scale-110 transition-transform" />
                      <span className="text-white font-bold text-2xl">Check Out</span>
                    </div>
                  </button>
                )}

                {todayAttendance?.clock_out && (
                  <div className="relative w-64 h-64 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-2xl">
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <CheckCircle2 className="w-12 h-12 text-white mb-3" />
                      <span className="text-white font-bold text-2xl">Completed</span>
                    </div>
                  </div>
                )}

                <div className="mt-8 text-center">
                  <p className="text-gray-400 text-sm mb-2">Time Elapsed</p>
                  <LiveTimer 
                    clockIn={todayAttendance?.clock_in}
                    clockOut={todayAttendance?.clock_out}
                  />
                </div>
              </div>

              {/* Right Side - Stats */}
              <div className="space-y-6">
                <Card className="p-6 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-indigo-50">
                      <Clock className="w-5 h-5 text-indigo-600" />
                    </div>
                    <span className="text-gray-600 font-medium">Today's Hours</span>
                  </div>
                  <p className="text-4xl font-bold text-gray-900">
                    {todayAttendance?.work_hours 
                      ? `${Math.floor(todayAttendance.work_hours)}h ${Math.round((todayAttendance.work_hours % 1) * 60)}m`
                      : '0h 0m'
                    }
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    {todayAttendance?.clock_in || '00:00:00'}
                  </p>
                </Card>

                <Card className="p-6 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-purple-50">
                      <CheckCircle2 className="w-5 h-5 text-purple-600" />
                    </div>
                    <span className="text-gray-600 font-medium">Status</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      todayAttendance?.clock_in && !todayAttendance?.clock_out 
                        ? 'bg-green-500' 
                        : 'bg-gray-300'
                    }`} />
                    <span className="text-2xl font-bold text-gray-900">
                      {todayAttendance?.clock_in && !todayAttendance?.clock_out 
                        ? 'Online' 
                        : 'Offline'
                      }
                    </span>
                  </div>
                </Card>

                {todayAttendance?.clock_in && (
                  <Card className="p-6 border border-gray-200 shadow-sm bg-indigo-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <LogIn className="w-4 h-4" />
                        <span>Check In: {todayAttendance.clock_in}</span>
                      </div>
                      {todayAttendance.clock_out && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <LogOut className="w-4 h-4" />
                          <span>Check Out: {todayAttendance.clock_out}</span>
                        </div>
                      )}
                    </div>
                  </Card>
                )}
              </div>
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