import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Mail, Shield, User, Clock, CheckCircle2, XCircle, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

import StatsCard from '../components/attendance/StatsCard';
import AttendanceHistory from '../components/attendance/AttendanceHistory';
import LeaveRequestList from '../components/leave/LeaveRequestList';

export default function EmployeeDetails() {
  const [currentUser, setCurrentUser] = useState(null);
  const urlParams = new URLSearchParams(window.location.search);
  const employeeId = urlParams.get('id');

  useEffect(() => {
    base44.auth.me().then(setCurrentUser);
  }, []);

  const { data: employee, isLoading: loadingEmployee } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: async () => {
      const users = await base44.entities.User.filter({ id: employeeId });
      return users[0];
    },
    enabled: !!employeeId,
  });

  const { data: attendance = [], isLoading: loadingAttendance } = useQuery({
    queryKey: ['employeeAttendance', employee?.email],
    queryFn: () => base44.entities.Attendance.filter({ employee_email: employee.email }, '-date', 30),
    enabled: !!employee?.email,
  });

  const { data: leaveRequests = [] } = useQuery({
    queryKey: ['employeeLeaves', employee?.email],
    queryFn: () => base44.entities.LeaveRequest.filter({ employee_email: employee.email }, '-created_date', 10),
    enabled: !!employee?.email,
  });

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const thisMonthAttendance = attendance.filter(a => 
    a.date.startsWith(format(new Date(), 'yyyy-MM'))
  );
  const presentDays = thisMonthAttendance.filter(a => a.status === 'present').length;
  const absentDays = thisMonthAttendance.filter(a => a.status === 'absent').length;
  const totalHours = thisMonthAttendance.reduce((sum, a) => sum + (a.work_hours || 0), 0);
  const approvedLeaves = leaveRequests.filter(l => l.status === 'approved').length;

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  if (currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
          <p className="text-gray-500 mt-2">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  if (loadingEmployee || !employee) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading employee data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link to={createPageUrl("AdminDashboard")}>
            <Button variant="ghost" className="mb-4 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <Avatar className="w-24 h-24 bg-indigo-100 text-indigo-600">
                  <AvatarFallback className="bg-indigo-100 text-indigo-600 text-2xl font-semibold">
                    {getInitials(employee.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center md:text-left">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                    {employee.full_name}
                  </h1>
                  <p className="text-gray-500 flex items-center justify-center md:justify-start gap-2 mt-2">
                    <Mail className="w-4 h-4" />
                    {employee.email}
                  </p>
                  <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                    {employee.role === 'admin' ? (
                      <span className="inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-sm font-medium">
                        <Shield className="w-3 h-3 mr-1" />
                        Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
                        <User className="w-3 h-3 mr-1" />
                        Employee
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

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
            title="Absent Days"
            value={absentDays}
            subtitle="This month"
            icon={XCircle}
            color="rose"
            delay={0.3}
          />
          <StatsCard
            title="Approved Leaves"
            value={approvedLeaves}
            subtitle="All time"
            icon={Calendar}
            color="blue"
            delay={0.4}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <AttendanceHistory attendance={attendance} />
          <LeaveRequestList requests={leaveRequests} />
        </div>
      </div>
    </div>
  );
}