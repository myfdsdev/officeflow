import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import EmployeeDetails from './pages/EmployeeDetails';
import AttendanceHistory from './pages/AttendanceHistory';
import LeaveRequests from './pages/LeaveRequests';


export const PAGES = {
    "Dashboard": Dashboard,
    "AdminDashboard": AdminDashboard,
    "EmployeeDetails": EmployeeDetails,
    "AttendanceHistory": AttendanceHistory,
    "LeaveRequests": LeaveRequests,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
};