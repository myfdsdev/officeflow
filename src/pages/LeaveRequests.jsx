import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Calendar, CheckCircle2, XCircle, Clock } from "lucide-react";
import { motion } from "framer-motion";

import LeaveRequestForm from '../components/leave/LeaveRequestForm';
import LeaveRequestList from '../components/leave/LeaveRequestList';
import StatsCard from '../components/attendance/StatsCard';

export default function LeaveRequests() {
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: leaveRequests = [], isLoading } = useQuery({
    queryKey: ['myLeaveRequests', user?.email],
    queryFn: () => base44.entities.LeaveRequest.filter({ employee_email: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const createLeaveMutation = useMutation({
    mutationFn: (data) => base44.entities.LeaveRequest.create({
      ...data,
      employee_id: user.id,
      employee_email: user.email,
      employee_name: user.full_name,
      status: 'pending',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myLeaveRequests'] });
      setShowForm(false);
    },
  });

  const pendingCount = leaveRequests.filter(l => l.status === 'pending').length;
  const approvedCount = leaveRequests.filter(l => l.status === 'approved').length;
  const rejectedCount = leaveRequests.filter(l => l.status === 'rejected').length;

  const filteredRequests = activeTab === 'all' 
    ? leaveRequests 
    : leaveRequests.filter(l => l.status === activeTab);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              My Leave Requests
            </h1>
            <p className="text-gray-500 mt-1">Manage your leave applications</p>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            New Request
          </Button>
        </motion.div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatsCard
            title="Pending"
            value={pendingCount}
            icon={Clock}
            color="amber"
            delay={0.1}
          />
          <StatsCard
            title="Approved"
            value={approvedCount}
            icon={CheckCircle2}
            color="green"
            delay={0.2}
          />
          <StatsCard
            title="Rejected"
            value={rejectedCount}
            icon={XCircle}
            color="rose"
            delay={0.3}
          />
        </div>

        <Card className="border-0 shadow-sm mb-6">
          <CardContent className="p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-gray-100">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">
                  Pending
                  {pendingCount > 0 && (
                    <span className="ml-1 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {pendingCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        <LeaveRequestList requests={filteredRequests} />

        <LeaveRequestForm
          open={showForm}
          onClose={() => setShowForm(false)}
          onSubmit={(data) => createLeaveMutation.mutate(data)}
          isLoading={createLeaveMutation.isPending}
        />
      </div>
    </div>
  );
}