import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { month, format } = await req.json();

    // Fetch data
    const employees = await base44.asServiceRole.entities.User.list();
    const employeeUsers = employees.filter(e => e.role === 'user');
    
    const attendance = await base44.asServiceRole.entities.Attendance.filter({
      date: { 
        $gte: `${month}-01`, 
        $lte: `${month}-31` 
      }
    });

    if (format === 'pdf') {
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(18);
      doc.text(`Attendance Report - ${month}`, 20, 20);
      
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30);

      // Table headers
      let y = 45;
      doc.setFontSize(9);
      doc.text('Employee', 20, y);
      doc.text('Present', 80, y);
      doc.text('Late', 105, y);
      doc.text('Half Day', 125, y);
      doc.text('Leave', 155, y);
      doc.text('Total', 175, y);

      y += 7;

      // Employee data
      employeeUsers.forEach((employee) => {
        const empAttendance = attendance.filter(a => a.employee_email === employee.email);
        const presentCount = empAttendance.filter(a => a.status === 'present').length;
        const lateCount = empAttendance.filter(a => a.status === 'late').length;
        const halfDayCount = empAttendance.filter(a => a.status === 'half_day').length;
        const leaveCount = empAttendance.filter(a => a.status === 'on_leave').length;
        const totalDays = empAttendance.length;

        if (y > 270) {
          doc.addPage();
          y = 20;
        }

        doc.setFontSize(8);
        doc.text(employee.full_name.substring(0, 25), 20, y);
        doc.text(presentCount.toString(), 85, y);
        doc.text(lateCount.toString(), 110, y);
        doc.text(halfDayCount.toString(), 135, y);
        doc.text(leaveCount.toString(), 160, y);
        doc.text(totalDays.toString(), 180, y);
        
        y += 7;
      });

      const pdfBytes = doc.output('arraybuffer');
      
      return new Response(pdfBytes, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename=attendance-report-${month}.pdf`
        }
      });
    } else if (format === 'excel') {
      // Simple CSV format (Excel compatible)
      let csv = 'Employee Name,Email,Present,Late,Half Day,Leave,Total Days,Total Hours,Avg Hours,Attendance %\n';
      
      employeeUsers.forEach((employee) => {
        const empAttendance = attendance.filter(a => a.employee_email === employee.email);
        const presentCount = empAttendance.filter(a => a.status === 'present').length;
        const lateCount = empAttendance.filter(a => a.status === 'late').length;
        const halfDayCount = empAttendance.filter(a => a.status === 'half_day').length;
        const leaveCount = empAttendance.filter(a => a.status === 'on_leave').length;
        const totalDays = empAttendance.length;
        const totalHours = empAttendance.reduce((sum, a) => sum + (a.work_hours || 0), 0);
        const avgHours = totalDays > 0 ? (totalHours / totalDays).toFixed(1) : '0';
        const attendancePercentage = totalDays > 0 ? ((presentCount / totalDays) * 100).toFixed(1) : '0';

        csv += `"${employee.full_name}","${employee.email}",${presentCount},${lateCount},${halfDayCount},${leaveCount},${totalDays},${totalHours.toFixed(1)},${avgHours},${attendancePercentage}\n`;
      });

      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename=attendance-report-${month}.csv`
        }
      });
    }

    return Response.json({ error: 'Invalid format' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});