import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowLeft, RefreshCw, Filter, Shield } from 'lucide-react';
import { adminService } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function AuditLogsPage() {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    loadLogs();
  }, [actionFilter]);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const res = await adminService.getAuditLogs({
        action: actionFilter || undefined,
        limit: 100
      });
      setLogs(res.data.logs || []);
    } catch {
      toast.error('Failed to load security audit records.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <Link to="/admin" className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>

        {/* Header */}
        <div className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-2">
              <Activity className="w-3.5 h-3.5" /> System Accountability & Forensic Ledger
            </div>
            <h1 className="text-2xl font-bold text-white">Security Audit Logs</h1>
            <p className="text-xs text-slate-400 mt-1">
              Immutable chronological record of logins, password updates, exam submissions, and administrative approvals.
            </p>
          </div>
        </div>

        {/* Action Filter */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Security Events</option>
              <option value="LOGIN">User Logins</option>
              <option value="REGISTER">Registrations</option>
              <option value="TEACHER_APPROVED">Teacher Approvals</option>
              <option value="EXAM_STARTED">Exam Starts</option>
              <option value="EXAM_SUBMITTED">Exam Submissions</option>
              <option value="FACE_TEMPLATE_ENROLLED">Biometric Enrollments</option>
              <option value="USER_STATUS_CHANGE">Suspensions / Reactivations</option>
            </select>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            {logs.length} Logged Entries
          </div>
        </div>

        {/* Table */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl overflow-x-auto">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-cyan-500" />
              <span className="text-xs">Loading ledger...</span>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Event Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Target Resource</th>
                  <th className="py-3 px-4">Client IP</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-cyan-400">{log.action}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{log.user_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{log.user_email}</div>
                    </td>
                    <td className="py-3.5 px-4 uppercase text-[10px] font-bold text-slate-300">{log.user_role}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {log.resource_type} {log.resource_id ? `#${log.resource_id}` : ''}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">{log.ip_address}</td>
                    <td className="py-3.5 px-4 text-right text-slate-400 font-mono text-[11px]">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}
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
