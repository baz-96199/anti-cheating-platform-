import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Award, FileText, ArrowLeft, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { studentService, reportService } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function StudentResultsListPage() {
  const toast = useToast();
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setIsLoading(true);
    try {
      const res = await studentService.getResults();
      setResults(res.data.results || []);
    } catch {
      toast.error('Failed to load results.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <Link to="/student" className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>

        {/* Header */}
        <div className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
              <Award className="w-3.5 h-3.5" /> Official Academic Transcripts
            </div>
            <h1 className="text-2xl font-bold text-white">Examination Results & Performance</h1>
            <p className="text-xs text-slate-400 mt-1">
              Access your evaluated assessment scorecards, answer breakdowns, and ReportLab PDF transcripts.
            </p>
          </div>
        </div>

        {/* Results Table */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl overflow-x-auto">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
              <span className="text-xs">Loading transcripts...</span>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Examination</th>
                  <th className="py-3 px-4">Submission Date</th>
                  <th className="py-3 px-4">Marks Obtained</th>
                  <th className="py-3 px-4">Percentage</th>
                  <th className="py-3 px-4">Outcome</th>
                  <th className="py-3 px-4">Proctoring Review</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {results.length > 0 ? (
                  results.map((att) => (
                    <tr key={att.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{att.exam_title}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{att.exam_code}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {att.submitted_at ? new Date(att.submitted_at).toLocaleString() : '—'}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white">
                        {att.total_score} / {att.total_exam_marks}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white">{att.percentage}%</td>
                      <td className="py-3.5 px-4">
                        {att.is_passed ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                            PASSED
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-[10px] font-bold border border-rose-500/20">
                            FAILED
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                          att.suspicion_score < 30 ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                        }`}>
                          Suspicion: {att.suspicion_score}/100 ({att.review_status})
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <Link
                          to={`/student/results/${att.id}`}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                        >
                          View Details &rarr;
                        </Link>
                        <a
                          href={reportService.downloadAttemptPdf(att.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold inline-flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5 text-indigo-400" /> PDF
                        </a>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-500 text-xs">
                      No examination results recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
