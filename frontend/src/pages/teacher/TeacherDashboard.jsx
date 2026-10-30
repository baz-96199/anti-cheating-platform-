import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Award, BookOpen, Users, TrendingUp, AlertTriangle, CheckCircle,
  PlusCircle, Sparkles, FileText, ArrowRight, RefreshCw, Download
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { teacherService, reportService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const toast = useToast();

  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setIsLoading(true);
    try {
      const res = await teacherService.getDashboard();
      setDashboardData(res.data);
    } catch {
      toast.error('Failed to load instructor dashboard.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const { stats, score_distribution, recent_submissions, flagged_attempts, exams } = dashboardData || {};

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome Header & Action Buttons */}
        <div className="p-8 rounded-3xl bg-gradient-to-r from-purple-950/60 via-slate-900/90 to-slate-900 border border-slate-800 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold">
              <Award className="w-3.5 h-3.5" /> Faculty & Examiner Dashboard
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              {user?.name}
            </h1>
            <p className="text-xs text-slate-400">
              {user?.teacher_profile?.designation} • {user?.teacher_profile?.department} • ID: <span className="font-mono text-purple-300 font-bold">{user?.teacher_profile?.teacher_id}</span>
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Link
              to="/teacher/exams/create"
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-purple-600/30 transition-all hover:scale-105 active:scale-95"
            >
              <PlusCircle className="w-4 h-4" /> Create Examination
            </Link>
            <Link
              to="/teacher/ai-generator"
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-indigo-500/30 font-bold text-xs flex items-center gap-1.5 transition-all hover:border-indigo-500"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" /> AI Quiz Generator
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>Total Exams</span>
              <BookOpen className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white">{stats?.total_exams || 0}</div>
            <div className="text-[11px] text-slate-500 mt-1">{stats?.published_exams || 0} published live</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>Candidate Submissions</span>
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white">{stats?.student_submissions || 0}</div>
            <div className="text-[11px] text-slate-500 mt-1">Evaluated across all tests</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>Pass Rate</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">{stats?.pass_percentage || 0}%</div>
            <div className="text-[11px] text-slate-500 mt-1">Average marks: {stats?.average_marks || 0}%</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>Flagged Attempts</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-400">{stats?.flagged_attempts_count || 0}</div>
            <div className="text-[11px] text-slate-500 mt-1">Awaiting instructor review</div>
          </div>
        </div>

        {/* Chart: Score Distribution */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Student Grade Distribution</h3>
              <p className="text-xs text-slate-400">Class performance breakdown across percentage brackets</p>
            </div>
            <span className="text-xs font-semibold text-purple-400 px-2 py-1 rounded bg-purple-500/10 border border-purple-500/20">
              Recharts Visualizer
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={score_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="range" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  itemStyle={{ color: '#c084fc', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#a855f7" radius={[6, 6, 0, 0]} name="Candidates" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Flagged Attempts Awaiting Review */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" /> Proctoring Incidents Awaiting Faculty Review
              </h3>
              <p className="text-xs text-slate-400">Attempts with elevated suspicion scores or student clarification requests</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Candidate</th>
                  <th className="py-3 px-4">Exam</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4">Violations</th>
                  <th className="py-3 px-4">Suspicion Indicator</th>
                  <th className="py-3 px-4">Review Status</th>
                  <th className="py-3 px-4 text-right">Forensic Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {flagged_attempts && flagged_attempts.length > 0 ? (
                  flagged_attempts.map((att) => (
                    <tr key={att.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{att.student_name}</div>
                        <div className="text-[11px] text-slate-400">{att.student_email}</div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-300">{att.exam_title}</td>
                      <td className="py-3.5 px-4 font-semibold text-white">{att.total_score} ({att.percentage}%)</td>
                      <td className="py-3.5 px-4 text-amber-400 font-bold">{att.violation_count} Flags</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {att.suspicion_score} / 100
                        </span>
                      </td>
                      <td className="py-3.5 px-4 capitalize text-slate-300 font-medium">
                        {att.review_status?.replace('_', ' ')}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to={`/teacher/attempts/${att.id}/review`}
                          className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs inline-flex items-center gap-1.5 transition-colors"
                        >
                          Review Timeline <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-500 text-xs">
                      No unresolved suspicious incidents detected. All examinations operating cleanly!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Faculty Managed Exams List */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Your Created Examinations</h3>
              <p className="text-xs text-slate-400">Manage questions, view gradebooks, and export CSV reports</p>
            </div>
            <Link to="/teacher/exams/create" className="text-xs text-purple-400 hover:text-purple-300 font-semibold">
              + New Exam
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Questions</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {exams && exams.length > 0 ? (
                  exams.map((ex) => (
                    <tr key={ex.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-white">{ex.title}</td>
                      <td className="py-3 px-4 font-mono text-purple-300 font-bold">{ex.exam_code}</td>
                      <td className="py-3 px-4 text-slate-300">{ex.question_count} Qs</td>
                      <td className="py-3 px-4 text-slate-300">{ex.duration_minutes} Mins</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ex.is_published ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {ex.is_published ? 'PUBLISHED' : 'DRAFT'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <Link
                          to={`/teacher/exams/${ex.id}/submissions`}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                        >
                          Submissions
                        </Link>
                        <a
                          href={reportService.downloadExamCsv(ex.id)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-medium inline-flex items-center gap-1 transition-colors"
                        >
                          <Download className="w-3 h-3 text-purple-400" /> CSV
                        </a>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-500 text-xs">
                      No examinations created yet. Click "Create Examination" to begin.
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
