import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { Users, Mail, Shield, User } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function EmployeeList({ employees, todayAttendance = [] }) {
  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getTodayStatus = (email) => {
    const attendance = todayAttendance.find(a => a.employee_email === email);
    if (!attendance) return null;
    return attendance.status;
  };

  const statusStyles = {
    present: "bg-emerald-100 text-emerald-700",
    absent: "bg-rose-100 text-rose-700",
    late: "bg-orange-100 text-orange-700",
    half_day: "bg-amber-100 text-amber-700",
    on_leave: "bg-blue-100 text-blue-700",
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-600" />
          Employees
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {employees.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No employees found</p>
          ) : (
            employees.map((employee, index) => {
              const status = getTodayStatus(employee.email);
              
              return (
                <motion.div
                  key={employee.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Link
                    to={createPageUrl("EmployeeDetails") + `?id=${employee.id}`}
                    className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors block"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="w-12 h-12 bg-indigo-100 text-indigo-600">
                        {employee.profile_photo ? (
                          <AvatarImage src={employee.profile_photo} alt={employee.full_name} />
                        ) : (
                          <AvatarFallback className="bg-indigo-100 text-indigo-600 font-semibold">
                            {getInitials(employee.full_name)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <p className="font-medium text-gray-900">{employee.full_name}</p>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {employee.email}
                        </p>
                        {employee.department && (
                          <p className="text-xs text-gray-400">{employee.department}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {status && (
                        <Badge className={`${statusStyles[status]} capitalize`}>
                          {status.replace("_", " ")}
                        </Badge>
                      )}
                      <Badge 
                        variant="outline" 
                        className={employee.role === "admin" 
                          ? "border-indigo-200 text-indigo-600" 
                          : "border-gray-200 text-gray-600"
                        }
                      >
                        {employee.role === "admin" ? (
                          <><Shield className="w-3 h-3 mr-1" /> Admin</>
                        ) : (
                          <><User className="w-3 h-3 mr-1" /> Employee</>
                        )}
                      </Badge>
                    </div>
                  </Link>
                </motion.div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}