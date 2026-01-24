import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { motion } from "framer-motion";
import { Clock, Calendar } from "lucide-react";

const statusStyles = {
  present: "bg-emerald-100 text-emerald-700 border-emerald-200",
  absent: "bg-rose-100 text-rose-700 border-rose-200",
  late: "bg-yellow-100 text-yellow-700 border-yellow-200",
  half_day: "bg-orange-100 text-orange-700 border-orange-200",
  on_leave: "bg-blue-100 text-blue-700 border-blue-200",
};

const statusLabels = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  half_day: "Half Day",
  on_leave: "On Leave",
};

export default function AttendanceHistory({ attendance, limit }) {
  const displayData = limit ? attendance.slice(0, limit) : attendance;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600" />
          Recent Attendance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayData.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No attendance records yet</p>
          ) : (
            displayData.map((record, index) => (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex flex-col items-center justify-center">
                    <span className="text-xs text-gray-400 uppercase">
                      {format(parseISO(record.date), "MMM")}
                    </span>
                    <span className="text-lg font-bold text-gray-900">
                      {format(parseISO(record.date), "d")}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {format(parseISO(record.date), "EEEE")}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      {record.clock_in && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {record.clock_in} - {record.clock_out || "..."}
                        </span>
                      )}
                      {record.work_hours && (
                        <span className="text-indigo-600 font-medium">
                          {record.work_hours.toFixed(1)}h
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Badge className={`${statusStyles[record.status]} border capitalize`}>
                  {statusLabels[record.status] || record.status}
                </Badge>
              </motion.div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}