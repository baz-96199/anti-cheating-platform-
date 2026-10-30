import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen, Award, CheckCircle, Clock, AlertTriangle, ArrowRight,
  TrendingUp, FileText, Shield, UserCheck, Play, Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { studentService, reportService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function StudentDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [examCodeInput, setExamCodeInput] = useState('');
  const [codeVerifying, setCodeVerifying] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setIsLoading(true);
    try {
      const res = await studentService.getDashboard();
      setDashboardData(res.data);
    } catch (err) {
      toast.error('Failed to load dashboard data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyExamCode = async (e) => {
    e.preventDefault();
    if (!examCodeInput.trim()) return;
    setCodeVerifying(true);
    try {
      const res = await studentService.verifyCode(examCodeInput.trim());
      toast.success(`Exam "${res.data.exam.title}" found!`);
      navigate(`/exam/entrance/${res.data.exam.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid exam code.');
    } finally {
      setCodeVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium">Loading candidate academic portal...</span>
        </div>
      </div>
    );
  }

  const { stats, active_attempt, available_exams, upcoming_exams, recent_completed, performance_trend, subject_performance } = dashboardData || {};

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome & Biometric Banner */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-indigo-900/40 via-slate-900/80 to-slate-900/90 border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" /> Candidate Examination Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Program: <strong className="text-white">{user?.student_profile?.course || 'Engineering'}</strong> • ID:{' '}
              <span className="font-mono text-indigo-300 font-semibold">{user?.student_profile?.student_id || 'STU-000'}</span>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 relative z-10 w-full md:w-auto">
            {stats?.has_face_enrolled ? (
              <div className="px-4 py-2.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Biometrics Enrolled</span>
              </div>
            ) : (
              <Link
                to="/student/face-enroll"
                className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-transform active:scale-95"
              >
                <AlertTriangle className="w-4 h-4" /> Enroll Face Template
              </Link>
            )}

            {/* Quick exam code input */}
            <form onSubmit={handleVerifyExamCode} className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="Enter Exam Code (e.g. AI2026)"
                value={examCodeInput}
                onChange={(e) => setExamCodeInput(e.target.value.toUpperCase())}
                className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs uppercase font-mono focus:outline-none focus:border-indigo-500 w-44"
              />
              <button
                type="submit"
                disabled={codeVerifying}
                className="px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition-colors"
              >
                Go
              </button>
            </form>
          </div>
        </div>

        {/* Active Ongoing Exam Alert */}
        {active_attempt && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-indigo-950/60 border border-emerald-500/40 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <Play className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Exam in Progress</div>
                <div className="text-base font-bold text-white">{active_attempt.exam_title}</div>
                <div className="text-xs text-slate-400">
                  Attempt #{active_attempt.id} • Started {active_attempt.start_time ? new Date(active_attempt.start_time).toLocaleTimeString() : ''}
                </div>
              </div>
            </div>
            <Link
              to={`/exam/take/${active_attempt.id}`}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
            >
              Resume Examination <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* KPI Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>Completed Exams</span>
              <BookOpen className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white">
              {stats?.exams_completed || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Official graded sessions</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>Average Score</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">
              {stats?.average_score || 0}%
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Across all completed assessments</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>Available Tests</span>
              <Clock className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white">
              {available_exams?.length || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Ready for candidate entry</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>Identity Status</span>
              <Shield className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-white">
              {stats?.has_face_enrolled ? (
                <span className="text-emerald-400 flex items-center gap-1.5 text-lg">
                  <CheckCircle className="w-5 h-5" /> Enrolled
                </span>
              ) : (
                <span className="text-amber-400 text-lg">Unregistered</span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Biometric face template</div>
          </div>
        </div>

        {/* Charts Section: Performance Trend & Subject Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend Chart (2 cols) */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Academic Performance Trajectory</h3>
                <p className="text-xs text-slate-400">Percentage score history across recent examinations</p>
              </div>
              <span className="text-xs font-semibold text-indigo-400 px-2 py-1 rounded bg-indigo-500/10 border border-indigo-500/20">
                Recharts Analytics
              </span>
            </div>
            <div className="h-64 w-full">
              {performance_trend && performance_trend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={performance_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="exam" stroke="#64748b" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                      itemStyle={{ color: '#818cf8', fontSize: '12px' }}
                    />
                    <Area type="monotone" dataKey="percentage" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#scoreGradient)" name="Score %" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                  <TrendingUp className="w-8 h-8 text-slate-700 mb-2" />
                  No completed examinations recorded yet. Take an exam to generate analytics!
                </div>
              )}
            </div>
          </div>

          {/* Subject Performance Breakdown (1 col) */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-white mb-1">Subject Proficiency</h3>
              <p className="text-xs text-slate-400 mb-4">Cumulative assessment marks by domain</p>
              
              <div className="space-y-4">
                {subject_performance && subject_performance.length > 0 ? (
                  subject_performance.map((sub, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-200">{sub.subject}</span>
                        <span className="font-bold text-indigo-400">{sub.avg_percentage}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full"
                          style={{ width: `${Math.min(100, sub.avg_percentage)}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    No subject scores calculated yet.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span>Biometric Verification</span>
              <span className="text-emerald-400 font-semibold">Active & Armed</span>
            </div>
          </div>
        </div>

        {/* Available Examinations Table */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Published Examinations</h3>
              <p className="text-xs text-slate-400">Available assessments for immediate candidate entry</p>
            </div>
            <Link to="/student/exams" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">
              View All ({available_exams?.length || 0}) &rarr;
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Exam Details</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Total Marks</th>
                  <th className="py-3 px-4">Proctoring Rules</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {available_exams && available_exams.length > 0 ? (
                  available_exams.map((ex) => (
                    <tr key={ex.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{ex.title}</div>
                        <div className="text-[11px] text-slate-400">{ex.subject_name || 'General'}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-indigo-400 font-bold">
                          {ex.exam_code}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">{ex.duration_minutes} Mins</td>
                      <td className="py-3.5 px-4 text-slate-300">{ex.total_marks} Marks</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {ex.require_face_verification && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] border border-emerald-500/20">
                              Face Match
                            </span>
                          )}
                          {ex.negative_marking && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[10px] border border-rose-500/20">
                              Negative Mark
                            </span>
                          )}
                          {ex.enable_fullscreen_lock && (
                            <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px] border border-indigo-500/20">
                              Lockdown
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to={`/exam/entrance/${ex.id}`}
                          className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition-all inline-flex items-center gap-1.5"
                        >
                          Enter Exam <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-500 text-xs">
                      No active examinations published right now. Check back shortly!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Transcripts & Scorecards */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Recent Examination Results</h3>
              <p className="text-xs text-slate-400">Verified scorecards and downloadable PDF credentials</p>
            </div>
            <Link to="/student/results" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">
              All Results &rarr;
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Exam</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Marks</th>
                  <th className="py-3 px-4">Percentage</th>
                  <th className="py-3 px-4">Outcome</th>
                  <th className="py-3 px-4">Integrity Review</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recent_completed && recent_completed.length > 0 ? (
                  recent_completed.map((att) => (
                    <tr key={att.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-white">{att.exam_title}</td>
                      <td className="py-3 px-4 text-slate-400">
                        {att.submitted_at ? new Date(att.submitted_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-200 font-semibold">
                        {att.total_score} / {att.total_exam_marks}
                      </td>
                      <td className="py-3 px-4 text-slate-200 font-semibold">{att.percentage}%</td>
                      <td className="py-3 px-4">
                        {att.is_passed ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                            PASSED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-[10px] font-bold border border-rose-500/20">
                            FAILED
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                          att.suspicion_score < 30
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                            : (att.suspicion_score < 60
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-300 border-rose-500/20')
                        }`}>
                          Score: {att.suspicion_score}/100 ({att.review_status})
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <Link
                          to={`/student/results/${att.id}`}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                        >
                          View Breakdown
                        </Link>
                        <a
                          href={reportService.downloadAttemptPdf(att.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-medium inline-flex items-center gap-1 transition-colors"
                        >
                          <FileText className="w-3 h-3 text-indigo-400" /> PDF
                        </a>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-500 text-xs">
                      No results logged yet. Complete an examination to view your official transcript.
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
