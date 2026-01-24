import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Calendar, Clock, CheckCircle2, XCircle, PlusCircle } from "lucide-react";
import { motion } from "framer-motion";

import AttendanceCard from '../components/attendance/AttendanceCard';
import StatsCard from '../components/attendance/StatsCard';
import AttendanceHistory from '../components/attendance/AttendanceHistory';
import LeaveRequestForm from '../components/leave/LeaveRequestForm';
import LeaveRequestList from '../components/leave/LeaveRequestList';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
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
    mutationFn: () => {
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
      
      return base44.entities.Attendance.create({
        employee_id: user.id,
        employee_email: user.email,
        employee_name: user.full_name,
        date: today,
        clock_in: clockInTime,
        status: status,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myAttendance'] }),
  });

  const clockOutMutation = useMutation({
    mutationFn: () => {
      const clockInTime = todayAttendance.clock_in.split(':');
      const clockOutTime = format(new Date(), 'HH:mm').split(':');
      const clockInMinutes = parseInt(clockInTime[0]) * 60 + parseInt(clockInTime[1]);
      const clockOutMinutes = parseInt(clockOutTime[0]) * 60 + parseInt(clockOutTime[1]);
      const workHours = Math.max(0, (clockOutMinutes - clockInMinutes) / 60);
      
      // Determine final status based on work hours
      // If less than 4 hours → Half Day
      let finalStatus = todayAttendance.status;
      if (workHours < 4) {
        finalStatus = 'half_day';
      }
      
      return base44.entities.Attendance.update(todayAttendance.id, {
        clock_out: format(new Date(), 'HH:mm'),
        work_hours: workHours,
        status: finalStatus,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myAttendance'] }),
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
  const totalHours = thisMonthAttendance.reduce((sum, a) => sum + (a.work_hours || 0), 0);
  const pendingLeaves = myLeaves.filter(l => l.status === 'pending').length;

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center gap-4"
        >
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Welcome back, {user.full_name?.split(' ')[0]}
            </h1>
            <p className="text-gray-500 mt-1">Track your attendance and manage your leave requests</p>
          </div>
        </motion.div>

        <div className="mb-8">
          <AttendanceCard
            todayAttendance={todayAttendance}
            onClockIn={() => clockInMutation.mutate()}
            onClockOut={() => clockOutMutation.mutate()}
            isLoading={clockInMutation.isPending || clockOutMutation.isPending}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Present Days"
            value={presentDays}
            subtitle="This month"
            icon={CheckCircle2}
            color="green"
            delay={0.1}
          />
          <StatsCard
            title="Total Hours"
            value={totalHours.toFixed(1)}
            subtitle="This month"
            icon={Clock}
            color="indigo"
            delay={0.2}
          />
          <StatsCard
            title="Pending Leaves"
            value={pendingLeaves}
            subtitle="Awaiting approval"
            icon={Calendar}
            color="amber"
            delay={0.3}
          />
          <StatsCard
            title="Attendance"
            value={`${thisMonthAttendance.length}`}
            subtitle="Days recorded"
            icon={Calendar}
            color="blue"
            delay={0.4}
          />
        </div>

        <div className="flex justify-end mb-4">
          <Button
            onClick={() => setShowLeaveForm(true)}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Request Leave
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <AttendanceHistory attendance={myAttendance} limit={7} />
          <LeaveRequestList requests={myLeaves} />
        </div>

        <LeaveRequestForm
          open={showLeaveForm}
          onClose={() => setShowLeaveForm(false)}
          onSubmit={(data) => leaveRequestMutation.mutate(data)}
          isLoading={leaveRequestMutation.isPending}
        />
      </div>
    </div>
  );
}