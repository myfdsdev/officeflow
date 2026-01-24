import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, FileSpreadsheet, Calendar, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

import StatsCard from '../components/attendance/StatsCard';
import EmployeeList from '../components/admin/EmployeeList';
import AttendanceReportTable from '../components/admin/AttendanceReportTable';
import LeaveRequestList from '../components/leave/LeaveRequestList';

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: allAttendance = [], isLoading: loadingAttendance } = useQuery({
    queryKey: ['allAttendance', dateRange],
    queryFn: () => base44.entities.Attendance.filter({
      date: { $gte: dateRange.start, $lte: dateRange.end }
    }, '-date'),
  });

  const { data: todayAttendance = [] } = useQuery({
    queryKey: ['todayAttendance'],
    queryFn: () => base44.entities.Attendance.filter({ date: today }),
  });

  const { data: leaveRequests = [], isLoading: loadingLeaves } = useQuery({
    queryKey: ['leaveRequests'],
    queryFn: () => base44.entities.LeaveRequest.list('-created_date'),
  });

  const editAttendanceMutation = useMutation({
    mutationFn: ({ id, data }) => {
      let workHours = null;
      if (data.clock_in && data.clock_out) {
        const clockInTime = data.clock_in.split(':');
        const clockOutTime = data.clock_out.split(':');
        const clockInMinutes = parseInt(clockInTime[0]) * 60 + parseInt(clockInTime[1]);
        const clockOutMinutes = parseInt(clockOutTime[0]) * 60 + parseInt(clockOutTime[1]);
        workHours = Math.max(0, (clockOutMinutes - clockInMinutes) / 60);
      }
      return base44.entities.Attendance.update(id, { ...data, work_hours: workHours });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['allAttendance'] }),
  });

  const approveLeave = useMutation({
    mutationFn: (request) => base44.entities.LeaveRequest.update(request.id, {
      status: 'approved',
      reviewed_by: user.email,
      reviewed_at: new Date().toISOString(),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leaveRequests'] }),
  });

  const rejectLeave = useMutation({
    mutationFn: (request) => base44.entities.LeaveRequest.update(request.id, {
      status: 'rejected',
      reviewed_by: user.email,
      reviewed_at: new Date().toISOString(),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leaveRequests'] }),
  });

  const totalEmployees = employees.filter(e => e.role === 'user').length;
  const presentToday = todayAttendance.filter(a => a.status === 'present').length;
  const lateToday = todayAttendance.filter(a => a.status === 'late').length;
  const absentToday = totalEmployees - todayAttendance.length;
  const pendingLeaves = leaveRequests.filter(l => l.status === 'pending').length;
  const avgHours = allAttendance.length > 0 
    ? (allAttendance.reduce((sum, a) => sum + (a.work_hours || 0), 0) / allAttendance.length).toFixed(1)
    : '0';

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
          <p className="text-gray-500 mt-2">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Admin Dashboard
          </h1>
          <p className="text-gray-500 mt-1">Manage employees, attendance, and leave requests</p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Total Employees"
            value={totalEmployees}
            icon={Users}
            color="indigo"
            delay={0.1}
          />
          <StatsCard
            title="Present Today"
            value={presentToday}
            icon={CheckCircle2}
            color="green"
            delay={0.2}
          />
          <StatsCard
            title="Late Today"
            value={lateToday}
            icon={AlertCircle}
            color="amber"
            delay={0.3}
          />
          <StatsCard
            title="Absent Today"
            value={absentToday}
            icon={AlertCircle}
            color="rose"
            delay={0.4}
          />
        </div>

        <Tabs defaultValue="employees" className="space-y-6">
          <TabsList className="bg-white shadow-sm border p-1 rounded-xl">
            <TabsTrigger value="employees" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 rounded-lg px-4">
              <Users className="w-4 h-4 mr-2" />
              Employees
            </TabsTrigger>
            <TabsTrigger value="attendance" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 rounded-lg px-4">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Attendance
            </TabsTrigger>
            <TabsTrigger value="leaves" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 rounded-lg px-4">
              <Calendar className="w-4 h-4 mr-2" />
              Leaves
              {pendingLeaves > 0 && (
                <span className="ml-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {pendingLeaves}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="employees">
            <EmployeeList employees={employees} todayAttendance={todayAttendance} />
          </TabsContent>

          <TabsContent value="attendance">
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500">From:</label>
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="w-40"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500">To:</label>
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="w-40"
                />
              </div>
            </div>
            <AttendanceReportTable
              attendance={allAttendance}
              onEdit={(id, data) => editAttendanceMutation.mutate({ id, data })}
              isEditing={editAttendanceMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="leaves">
            <LeaveRequestList
              requests={leaveRequests}
              isAdmin={true}
              onApprove={(request) => approveLeave.mutate(request)}
              onReject={(request) => rejectLeave.mutate(request)}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}