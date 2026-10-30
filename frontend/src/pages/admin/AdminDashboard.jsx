import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, Users, CheckCircle, XCircle, AlertTriangle, BookOpen,
  Activity, ArrowRight, RefreshCw, Lock, UserCheck, Award
} from 'lucide-react';
import { adminService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function AdminDashboard() {
  const { user } = useAuth();
  const toast = useToast();

  const [statsData, setStatsData] = useState(null);
  const [pendingTeachers, setPendingTeachers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setIsLoading(true);
    try {
      const res = await adminService.getStats();
      setStatsData(res.data);

      const usersRes = await adminService.getUsers({ role: 'teacher', status: 'pending_approval' });
      setPendingTeachers(usersRes.data.users || []);
    } catch {
      toast.error('Failed to load system administration statistics.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveTeacher = async (userId) => {
    try {
      await adminService.approveTeacher(userId);
      toast.success('Instructor credentials approved and activated.');
      loadDashboard();
    } catch {
      toast.error('Failed to approve teacher.');
    }
  };

  const handleRejectTeacher = async (userId) => {
    try {
      await adminService.rejectTeacher(userId);
      toast.info('Instructor application rejected.');
      loadDashboard();
    } catch {
      toast.error('Failed to reject teacher.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const { stats, recent_audit_logs } = statsData || {};

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="p-8 rounded-3xl bg-gradient-to-r from-indigo-950/70 via-slate-900 to-slate-900 border border-slate-800 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
              <Shield className="w-3.5 h-3.5" /> Institutional Administration
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">System Command Center</h1>
            <p className="text-xs text-slate-400">
              ExamGuard AI Governance, Faculty Verification, Integrity Oversight & Audit Logs
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/admin/users"
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all"
            >
              <Users className="w-4 h-4" /> User Management
            </Link>
            <Link
              to="/admin/audit-logs"
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <Activity className="w-4 h-4 text-cyan-400" /> Security Audit
            </Link>
          </div>
        </div>

        {/* System KPIs Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>Total Candidates</span>
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white">{stats?.total_students || 0}</div>
            <div className="text-[11px] text-slate-500 mt-1">Registered student profiles</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>Approved Faculty</span>
              <Award className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white">{stats?.total_teachers || 0}</div>
            <div className="text-[11px] text-slate-500 mt-1">
              <strong className="text-amber-400 font-semibold">{stats?.pending_teachers || 0}</strong> awaiting verification
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>Examinations Managed</span>
              <BookOpen className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white">{stats?.total_exams || 0}</div>
            <div className="text-[11px] text-slate-500 mt-1">{stats?.published_exams || 0} published across courses</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>Integrity Incidents</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-400">{stats?.flagged_attempts || 0}</div>
            <div className="text-[11px] text-slate-500 mt-1">Escalated proctoring attempts</div>
          </div>
        </div>

        {/* Pending Teacher Verification Queue */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-purple-400" /> Faculty Registration Approval Queue
              </h3>
              <p className="text-xs text-slate-400">
                Verify instructor institutional details before granting assessment creation rights
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-bold text-xs border border-amber-500/20">
              {pendingTeachers.length} Pending
            </span>
          </div>

          <div className="divide-y divide-slate-800/60">
            {pendingTeachers.length > 0 ? (
              pendingTeachers.map((tch) => {
                const prof = tch.teacher_profile || {};
                return (
                  <div key={tch.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="font-bold text-white text-sm">{tch.name}</div>
                      <div className="text-xs text-slate-400">
                        {prof.designation} • {prof.department} • {prof.qualification}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Email: {tch.email} • Staff ID: {prof.teacher_id}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRejectTeacher(tch.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                      <button
                        onClick={() => handleApproveTeacher(tch.id)}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-emerald-600/20 transition-all hover:scale-105"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Verify & Approve
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs">
                All instructor registrations are currently verified and up to date!
              </div>
            )}
          </div>
        </div>

        {/* Recent Security Audit Logs Feed */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" /> Security Audit Log Stream
              </h3>
              <p className="text-xs text-slate-400">Chronological history of administrative and authentication operations</p>
            </div>
            <Link to="/admin/audit-logs" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">
              Full Logs &rarr;
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Resource</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recent_audit_logs && recent_audit_logs.length > 0 ? (
                  recent_audit_logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-400">{log.action}</td>
                      <td className="py-3 px-4 text-slate-200">{log.user_name}</td>
                      <td className="py-3 px-4 uppercase text-[10px] font-bold text-slate-400">{log.user_role}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{log.resource_type} ({log.resource_id || '—'})</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{log.ip_address}</td>
                      <td className="py-3 px-4 text-right text-slate-400 font-mono text-[11px]">
                        {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="py-6 text-center text-slate-500 text-xs">
                      No security audit events recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
