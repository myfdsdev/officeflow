import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import EmployeeDetails from './pages/EmployeeDetails';
import AttendanceHistory from './pages/AttendanceHistory';
import LeaveRequests from './pages/LeaveRequests';
import CompleteProfile from './pages/CompleteProfile';
import MyProfile from './pages/MyProfile';
import Welcome from './pages/Welcome';
import AttendanceReports from './pages/AttendanceReports';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "AdminDashboard": AdminDashboard,
    "EmployeeDetails": EmployeeDetails,
    "AttendanceHistory": AttendanceHistory,
    "LeaveRequests": LeaveRequests,
    "CompleteProfile": CompleteProfile,
    "MyProfile": MyProfile,
    "Welcome": Welcome,
    "AttendanceReports": AttendanceReports,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};