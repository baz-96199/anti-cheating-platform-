import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, CheckCircle, XCircle, Shield, ArrowLeft, RefreshCw,
  Search, AlertTriangle, Lock, Unlock
} from 'lucide-react';
import { adminService } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function UserManagementPage() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadUsers();
  }, [roleFilter, statusFilter]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const res = await adminService.getUsers({
        role: roleFilter || undefined,
        status: statusFilter || undefined
      });
      setUsers(res.data.users || []);
    } catch {
      toast.error('Failed to load user accounts.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSuspend = async (userId) => {
    try {
      const res = await adminService.toggleUserStatus(userId);
      toast.success(res.data.message);
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update user status.');
    }
  };

  const handleApproveTeacher = async (userId) => {
    try {
      await adminService.approveTeacher(userId);
      toast.success('Teacher approved successfully.');
      loadUsers();
    } catch {
      toast.error('Failed to approve teacher.');
    }
  };

  const filtered = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <Link to="/admin" className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Admin Dashboard
        </Link>

        {/* Header */}
        <div className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
              <Users className="w-3.5 h-3.5" /> Institutional Identity Directory
            </div>
            <h1 className="text-2xl font-bold text-white">User & Faculty Management</h1>
            <p className="text-xs text-slate-400 mt-1">
              Verify credentials, review candidate profiles, and manage system access permissions.
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500 w-56"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Roles</option>
              <option value="student">Students</option>
              <option value="teacher">Teachers</option>
              <option value="admin">Administrators</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div className="text-xs text-slate-400 font-medium">
            Showing <strong className="text-white">{filtered.length}</strong> accounts
          </div>
        </div>

        {/* Users Table */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl overflow-x-auto">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
              <span className="text-xs">Loading directory...</span>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Institutional Details</th>
                  <th className="py-3 px-4">Biometrics</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{u.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        u.role === 'admin'
                          ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          : (u.role === 'teacher'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20')
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {u.role === 'student' && (
                        <div>
                          <div>{u.student_profile?.course || 'General'}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{u.student_profile?.student_id}</div>
                        </div>
                      )}
                      {u.role === 'teacher' && (
                        <div>
                          <div>{u.teacher_profile?.designation} • {u.teacher_profile?.department}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{u.teacher_profile?.teacher_id}</div>
                        </div>
                      )}
                      {u.role === 'admin' && <span className="text-slate-500">System Administrator</span>}
                    </td>
                    <td className="py-3.5 px-4">
                      {u.role === 'student' ? (
                        u.has_face_enrolled ? (
                          <span className="text-emerald-400 flex items-center gap-1 font-medium">
                            <CheckCircle className="w-3.5 h-3.5" /> Enrolled
                          </span>
                        ) : (
                          <span className="text-slate-500">Not enrolled</span>
                        )
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        u.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : (u.status === 'pending_approval'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20')
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      {u.status === 'pending_approval' && u.role === 'teacher' && (
                        <button
                          onClick={() => handleApproveTeacher(u.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs"
                        >
                          Approve
                        </button>
                      )}

                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleToggleSuspend(u.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors ${
                            u.status === 'suspended'
                              ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-300'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          {u.status === 'suspended' ? (
                            <>
                              <Unlock className="w-3 h-3 text-emerald-400" /> Reactivate
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3 text-rose-400" /> Suspend
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
