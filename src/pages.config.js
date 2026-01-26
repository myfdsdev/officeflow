import AccessDenied from './pages/AccessDenied';
import AdminDashboard from './pages/AdminDashboard';
import AttendanceHistory from './pages/AttendanceHistory';
import AttendanceReports from './pages/AttendanceReports';
import CompleteProfile from './pages/CompleteProfile';
import Dashboard from './pages/Dashboard';
import DirectMessages from './pages/DirectMessages';
import EmployeeDetails from './pages/EmployeeDetails';
import LeaveRequests from './pages/LeaveRequests';
import MyProfile from './pages/MyProfile';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Settings from './pages/Settings';
import Welcome from './pages/Welcome';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AccessDenied": AccessDenied,
    "AdminDashboard": AdminDashboard,
    "AttendanceHistory": AttendanceHistory,
    "AttendanceReports": AttendanceReports,
    "CompleteProfile": CompleteProfile,
    "Dashboard": Dashboard,
    "DirectMessages": DirectMessages,
    "EmployeeDetails": EmployeeDetails,
    "LeaveRequests": LeaveRequests,
    "MyProfile": MyProfile,
    "PrivacyPolicy": PrivacyPolicy,
    "Settings": Settings,
    "Welcome": Welcome,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};