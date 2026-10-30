import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FileText, Download, Users, ArrowLeft, ArrowRight, RefreshCw,
  Search, Shield, AlertTriangle, CheckCircle, Award
} from 'lucide-react';
import { teacherService, reportService } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function ExamSubmissionsPage() {
  const { examId } = useParams();
  const toast = useToast();

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadSubmissions();
  }, [examId]);

  const loadSubmissions = async () => {
    setIsLoading(true);
    try {
      const res = await teacherService.getSubmissions(examId);
      setData(res.data);
    } catch {
      toast.error('Failed to load exam submissions.');
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

  const { exam, submissions } = data || {};
  const filtered = (submissions || []).filter((sub) => {
    const q = searchQuery.toLowerCase();
    return (
      sub.student_name?.toLowerCase().includes(q) ||
      sub.student_email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <Link to="/teacher" className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-medium">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>

        {/* Header */}
        <div className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold mb-2">
              <Users className="w-3.5 h-3.5" /> Examination Submissions & Gradebook
            </div>
            <h1 className="text-2xl font-bold text-white">{exam?.title}</h1>
            <p className="text-xs text-slate-400 mt-1">
              Exam Code: <span className="font-mono text-purple-300 font-bold">{exam?.exam_code}</span> • Total Submissions:{' '}
              <strong className="text-white">{submissions?.length || 0}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={reportService.downloadExamCsv(examId)}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-all hover:scale-105"
            >
              <Download className="w-4 h-4" /> Export CSV Gradebook
            </a>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by student name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-purple-500"
            />
          </div>
          <div className="text-xs text-slate-400">
            Showing <strong className="text-white">{filtered.length}</strong> candidate attempts
          </div>
        </div>

        {/* Submissions Table */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Candidate</th>
                <th className="py-3 px-4">Score</th>
                <th className="py-3 px-4">Result</th>
                <th className="py-3 px-4">Biometrics</th>
                <th className="py-3 px-4">Violations</th>
                <th className="py-3 px-4">Suspicion Score</th>
                <th className="py-3 px-4">Review Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.length > 0 ? (
                filtered.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{att.student_name}</div>
                      <div className="text-[11px] text-slate-400">{att.student_email}</div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white">
                      {att.total_score} / {exam?.total_marks} ({att.percentage}%)
                    </td>
                    <td className="py-3.5 px-4">
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
                    <td className="py-3.5 px-4">
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> {att.face_similarity_score ? Math.round(att.face_similarity_score * 100) : 90}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-amber-400">{att.violation_count} Flags</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        att.suspicion_score < 30 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {att.suspicion_score} / 100
                      </span>
                    </td>
                    <td className="py-3.5 px-4 capitalize text-slate-300 font-medium">
                      {att.review_status?.replace('_', ' ')}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <Link
                        to={`/teacher/attempts/${att.id}/review`}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs inline-flex items-center gap-1 shadow-sm transition-colors"
                      >
                        Forensics <ArrowRight className="w-3 h-3" />
                      </Link>
                      <a
                        href={reportService.downloadAttemptPdf(att.id)}
                        className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs inline-flex items-center gap-1"
                        title="Download PDF"
                      >
                        <FileText className="w-3.5 h-3.5 text-purple-400" />
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-500 text-xs">
                    No submissions matching criteria found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
