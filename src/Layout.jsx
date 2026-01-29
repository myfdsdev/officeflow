import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Settings,
  LogOut,
  Menu,
  Users,
  Clock,
  ChevronRight,
  UserCircle,
  BarChart3,
} from "lucide-react";
import NotificationBell from './components/notifications/NotificationBell';
import NotificationPermissionPrompt from './components/notifications/NotificationPermissionPrompt';
import { useUserActivity } from './components/hooks/useUserActivity';
import { useAutoCheckIn } from './components/hooks/useAutoCheckIn';
import { useDesktopNotifications } from './components/hooks/useDesktopNotifications';
import { useMessageDesktopNotifications } from './components/hooks/useMessageDesktopNotifications';
import OnlineStatusIndicator from './components/admin/OnlineStatusIndicator';

const employeeNavItems = [
  { name: 'Dashboard', page: 'Dashboard', icon: LayoutDashboard },
  { name: 'Attendance History', page: 'AttendanceHistory', icon: Clock },
  { name: 'Leave Requests', page: 'LeaveRequests', icon: FileText },
  { name: 'Groups', page: 'Groups', icon: Users },
  { name: 'Direct Messages', page: 'DirectMessages', icon: Users },
  { name: 'My Profile', page: 'MyProfile', icon: UserCircle },
];

const adminNavItems = [
  { name: 'Admin Dashboard', page: 'AdminDashboard', icon: LayoutDashboard },
  { name: 'Attendance Reports', page: 'AttendanceReports', icon: BarChart3 },
  { name: 'Settings', page: 'Settings', icon: Settings },
  { name: 'My Dashboard', page: 'Dashboard', icon: Users },
  { name: 'Attendance History', page: 'AttendanceHistory', icon: Clock },
  { name: 'Leave Requests', page: 'LeaveRequests', icon: FileText },
  { name: 'Groups', page: 'Groups', icon: Users },
  { name: 'Direct Messages', page: 'DirectMessages', icon: Users },
  { name: 'My Profile', page: 'MyProfile', icon: UserCircle },
];

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  // Track user activity and update online status
  useUserActivity(user);

  // Auto check-in on first load of the day
  useAutoCheckIn(user);

  // Enable desktop notifications
  useDesktopNotifications(user);

  // Enable message desktop notifications
  useMessageDesktopNotifications(user);

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  const navItems = user?.role === 'admin' ? adminNavItems : employeeNavItems;
  const isAdminSection = currentPageName === 'AdminDashboard' || currentPageName === 'AttendanceReports' || currentPageName === 'Settings';

  const NavLinks = ({ onClick }) => (
    <div className="space-y-4">
      {/* Admin Section */}
      {user?.role === 'admin' && (
        <div>
          <div className="px-4 py-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Admin Panel</p>
          </div>
          <div className="space-y-1">
            {adminNavItems.slice(0, 3).map((item) => {
              const Icon = item.icon;
              const isActive = currentPageName === item.page;
              
              return (
                <div key={item.page} className="relative">
                  <Link
                    to={createPageUrl(item.page)}
                    onClick={onClick}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-600 font-medium'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                    <span className={item.name === 'Direct Messages' ? 'flex-1 mr-8' : 'flex-1'}>{item.name}</span>
                    {item.name === 'Direct Messages' && user && (
                      <div className="pointer-events-auto">
                        <NotificationBell userEmail={user.email} notificationType="new_message" />
                      </div>
                    )}
                    {isActive && <ChevronRight className="w-4 h-4" />}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Personal Section */}
      <div>
        {user?.role === 'admin' && (
          <div className="px-4 py-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">My Account</p>
          </div>
        )}
        <div className="space-y-1">
          {(user?.role === 'admin' ? adminNavItems.slice(3) : employeeNavItems).map((item) => {
            const Icon = item.icon;
            const isActive = currentPageName === item.page;
            
            return (
              <div key={item.page} className="relative">
                <Link
                  to={createPageUrl(item.page)}
                  onClick={onClick}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-600 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                  <span className={item.name === 'Direct Messages' ? 'flex-1 mr-8' : 'flex-1'}>{item.name}</span>
                  {item.name === 'Direct Messages' && user && (
                    <div className="pointer-events-auto">
                      <NotificationBell userEmail={user.email} notificationType="new_message" />
                    </div>
                  )}
                  {isActive && <ChevronRight className="w-4 h-4" />}
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <NotificationPermissionPrompt />
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-100 p-4">
        <div className="flex items-center gap-3 px-4 py-4 mb-6">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">AttendEase</span>
        </div>

        <nav className="flex-1">
          <NavLinks />
        </nav>

        {user && (
          <div className="border-t border-gray-100 pt-4 mt-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="relative">
                    <Avatar className="w-10 h-10 bg-indigo-100 text-indigo-600">
                      {user.profile_photo ? (
                        <AvatarImage src={user.profile_photo} alt={user.full_name} />
                      ) : (
                        <AvatarFallback className="bg-indigo-100 text-indigo-600 font-semibold">
                          {getInitials(user.full_name)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5">
                      <OnlineStatusIndicator isOnline={true} size="sm" />
                    </div>
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{user.full_name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem className="text-gray-500 text-xs">
                  {user.role === 'admin' ? 'Administrator' : 'Employee'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-rose-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-100 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">AttendEase</span>
          </div>

          <div className="flex items-center gap-2">
            {user && <NotificationBell userEmail={user.email} />}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-0">
                <div className="p-4 border-b">
                  {user && (
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="w-10 h-10 bg-indigo-100 text-indigo-600">
                          {user.profile_photo ? (
                            <AvatarImage src={user.profile_photo} alt={user.full_name} />
                          ) : (
                            <AvatarFallback className="bg-indigo-100 text-indigo-600 font-semibold">
                              {getInitials(user.full_name)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="absolute -bottom-0.5 -right-0.5">
                          <OnlineStatusIndicator isOnline={true} size="sm" />
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.full_name}</p>
                        <p className="text-xs text-gray-500">{user.role === 'admin' ? 'Admin' : 'Employee'}</p>
                      </div>
                    </div>
                  )}
                </div>
                <nav className="p-4">
                  <NavLinks onClick={() => setMobileMenuOpen(false)} />
                </nav>
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
                  <Button
                    variant="outline"
                    onClick={handleLogout}
                    className="w-full text-rose-600 border-rose-200 hover:bg-rose-50"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0">
        <div className="min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}