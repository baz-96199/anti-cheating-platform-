import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Shield, Bell, User, LogOut, ChevronDown, Check, BookOpen, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { notificationService } from '../services/api';

export default function Navbar() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    if (user) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 30000); // 30s poll
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      const res = await notificationService.getNotifications(6);
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead();
      setUnreadCount(0);
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch {
      // ignore
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getDashboardPath = () => {
    if (role === 'admin') return '/admin';
    if (role === 'teacher') return '/teacher';
    if (role === 'student') return '/student';
    return '/';
  };

  // Don't show full navbar on active exam screen to minimize distractions
  if (location.pathname.startsWith('/exam/take/')) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to={getDashboardPath()} className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Shield className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div>
            <div className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
              ExamGuard <span className="text-indigo-400 font-extrabold text-xs uppercase px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">AI</span>
            </div>
            <div className="text-[10px] text-slate-400 -mt-0.5 tracking-wider uppercase font-semibold">
              Proctoring Platform
            </div>
          </div>
        </Link>

        {/* Center / Role Navigation */}
        {user ? (
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
            {role === 'student' && (
              <>
                <Link to="/student" className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${location.pathname === '/student' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}>
                  Dashboard
                </Link>
                <Link to="/student/exams" className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${location.pathname.startsWith('/student/exams') ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}>
                  Exams
                </Link>
                <Link to="/student/face-enroll" className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${location.pathname === '/student/face-enroll' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}>
                  Biometrics
                </Link>
                <Link to="/student/results" className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${location.pathname === '/student/results' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}>
                  Results & Transcripts
                </Link>
              </>
            )}
            {role === 'teacher' && (
              <>
                <Link to="/teacher" className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${location.pathname === '/teacher' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}>
                  Overview
                </Link>
                <Link to="/teacher/exams/create" className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${location.pathname === '/teacher/exams/create' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}>
                  Create Exam
                </Link>
                <Link to="/teacher/ai-generator" className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${location.pathname === '/teacher/ai-generator' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}>
                  AI Quiz Generator
                </Link>
                <Link to="/teacher/question-banks" className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${location.pathname === '/teacher/question-banks' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}>
                  Question Banks
                </Link>
              </>
            )}
            {role === 'admin' && (
              <>
                <Link to="/admin" className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${location.pathname === '/admin' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}>
                  System Stats
                </Link>
                <Link to="/admin/users" className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${location.pathname === '/admin/users' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}>
                  User Approvals
                </Link>
                <Link to="/admin/academic" className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${location.pathname === '/admin/academic' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}>
                  Courses & Subjects
                </Link>
                <Link to="/admin/audit-logs" className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${location.pathname === '/admin/audit-logs' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}>
                  Security Audit
                </Link>
                <Link to="/admin/disputes" className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${location.pathname === '/admin/disputes' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}>
                  Disputes
                </Link>
              </>
            )}
          </nav>
        ) : (
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-xs font-medium text-slate-300 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link to="/register/student" className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all">
              Register
            </Link>
          </div>
        )}

        {/* Right actions */}
        {user && (
          <div className="flex items-center gap-3">
            {/* Notification Drawer */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowProfileMenu(false);
                }}
                className="relative p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-4 z-50">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="font-semibold text-sm text-white">Notifications</div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60 my-2">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className={`py-3 px-1 transition-colors ${n.is_read ? 'opacity-70' : 'bg-indigo-500/5 rounded-lg'}`}>
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-200">{n.title}</span>
                            <span className="text-[10px] text-slate-500">
                              {n.created_at ? new Date(n.created_at).toLocaleDateString() : ''}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowProfileMenu(!showProfileMenu);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left text-xs pr-1">
                  <div className="font-semibold text-slate-200 leading-none">{user.name.split(' ')[0]}</div>
                  <div className="text-[10px] text-indigo-400 uppercase font-bold tracking-wider mt-0.5">{user.role}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 divide-y divide-slate-800">
                  <div className="px-3 py-2">
                    <div className="text-xs font-semibold text-white">{user.name}</div>
                    <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
                    <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase">
                      {user.role}
                    </div>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
