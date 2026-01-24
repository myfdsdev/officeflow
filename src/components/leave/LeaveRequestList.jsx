import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, parseISO, differenceInDays } from "date-fns";
import { motion } from "framer-motion";
import { FileText, Check, X, Clock } from "lucide-react";

const statusStyles = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-50 text-rose-700 border-rose-200",
};

const leaveTypeLabels = {
  sick: "Sick Leave",
  casual: "Casual Leave",
  annual: "Annual Leave",
  emergency: "Emergency",
  other: "Other",
};

export default function LeaveRequestList({ requests, isAdmin = false, onApprove, onReject }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600" />
          {isAdmin ? "Leave Requests" : "My Leave Requests"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {requests.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No leave requests</p>
          ) : (
            requests.map((request, index) => {
              const days = differenceInDays(parseISO(request.end_date), parseISO(request.start_date)) + 1;
              
              return (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      {isAdmin && (
                        <p className="font-semibold text-gray-900 mb-1">
                          {request.employee_name}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge variant="outline" className="font-medium">
                          {leaveTypeLabels[request.leave_type]}
                        </Badge>
                        <Badge className={`${statusStyles[request.status]} border capitalize`}>
                          {request.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        {format(parseISO(request.start_date), "MMM d, yyyy")} - {format(parseISO(request.end_date), "MMM d, yyyy")}
                        <span className="text-indigo-600 font-medium ml-2">({days} day{days > 1 ? 's' : ''})</span>
                      </p>
                      <p className="text-sm text-gray-500">{request.reason}</p>
                      {request.admin_remarks && (
                        <p className="text-sm text-gray-400 mt-2 italic">
                          Admin: {request.admin_remarks}
                        </p>
                      )}
                    </div>

                    {isAdmin && request.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => onApprove(request)}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onReject(request)}
                          className="text-rose-600 border-rose-200 hover:bg-rose-50"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}

                    {!isAdmin && request.status === "pending" && (
                      <div className="flex items-center gap-2 text-amber-600">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-medium">Awaiting approval</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}