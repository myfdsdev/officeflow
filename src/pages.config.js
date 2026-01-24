import AdminDashboard from './pages/AdminDashboard';
import AttendanceHistory from './pages/AttendanceHistory';
import AttendanceReports from './pages/AttendanceReports';
import CompleteProfile from './pages/CompleteProfile';
import Dashboard from './pages/Dashboard';
import EmployeeDetails from './pages/EmployeeDetails';
import LeaveRequests from './pages/LeaveRequests';
import MyProfile from './pages/MyProfile';
import Settings from './pages/Settings';
import Welcome from './pages/Welcome';
import PrivacyPolicy from './pages/PrivacyPolicy';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminDashboard": AdminDashboard,
    "AttendanceHistory": AttendanceHistory,
    "AttendanceReports": AttendanceReports,
    "CompleteProfile": CompleteProfile,
    "Dashboard": Dashboard,
    "EmployeeDetails": EmployeeDetails,
    "LeaveRequests": LeaveRequests,
    "MyProfile": MyProfile,
    "Settings": Settings,
    "Welcome": Welcome,
    "PrivacyPolicy": PrivacyPolicy,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};