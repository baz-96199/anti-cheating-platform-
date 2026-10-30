import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Award, CheckCircle, XCircle, FileText, Shield, AlertTriangle,
  Clock, ArrowLeft, RefreshCw, Send, HelpCircle, Check, X
} from 'lucide-react';
import { studentService, reportService } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function StudentResultPage() {
  const { attemptId } = useParams();
  const toast = useToast();

  const [resultData, setResultData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [appealStatement, setAppealStatement] = useState('');
  const [submittingAppeal, setSubmittingAppeal] = useState(false);

  useEffect(() => {
    loadResult();
  }, [attemptId]);

  const loadResult = async () => {
    setIsLoading(true);
    try {
      const res = await studentService.getResultDetail(attemptId);
      setResultData(res.data);
    } catch {
      toast.error('Failed to load examination result.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendAppeal = async (e) => {
    e.preventDefault();
    if (!appealStatement.trim()) return;
    setSubmittingAppeal(true);
    try {
      await studentService.submitAppeal({
        attempt_id: attemptId,
        statement: appealStatement.trim()
      });
      toast.success('Your explanation has been submitted to the course examiner for review.');
      setShowAppealModal(false);
      setAppealStatement('');
      loadResult();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit review explanation.');
    } finally {
      setSubmittingAppeal(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const { attempt, exam, can_appeal } = resultData || {};
  if (!attempt) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div>Result not found or not yet evaluated.</div>
        <Link to="/student" className="text-indigo-400 hover:text-indigo-300 text-xs">Return to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Link */}
        <Link to="/student" className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>

        {/* Scorecard Hero Card */}
        <div className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
              <Award className="w-3.5 h-3.5" /> Official Examination Transcript
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{attempt.exam_title}</h1>
            <p className="text-xs text-slate-400">
              Exam Code: <span className="font-mono text-indigo-300 font-bold">{attempt.exam_code}</span> • Submitted on{' '}
              {attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleString() : 'N/A'}
            </p>
          </div>

          <div className="flex flex-col items-center md:items-end gap-2 text-center md:text-right">
            <div className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white flex items-baseline gap-1">
              <span className={attempt.is_passed ? 'text-emerald-400' : 'text-rose-400'}>{attempt.total_score}</span>
              <span className="text-lg text-slate-500 font-normal">/ {attempt.total_exam_marks}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
                attempt.is_passed
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}>
                {attempt.percentage}% — {attempt.is_passed ? 'PASSED' : 'FAILED'}
              </span>
            </div>
          </div>
        </div>

        {/* Verification & Proctoring Summary Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-semibold">Biometric Match</div>
              <div className="text-sm font-bold text-white">
                {attempt.face_verification_passed ? 'Verified Match' : 'Unverified'}
              </div>
              <div className="text-[10px] text-slate-500">
                Score: {attempt.face_similarity_score ? Math.round(attempt.face_similarity_score * 100) : '—'}%
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-semibold">Duration Spent</div>
              <div className="text-sm font-bold text-white">
                {Math.floor((attempt.time_spent_seconds || 0) / 60)} Mins {(attempt.time_spent_seconds || 0) % 60} Secs
              </div>
              <div className="text-[10px] text-slate-500">{attempt.auto_submitted ? 'Auto-submitted' : 'Candidate submitted'}</div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              attempt.suspicion_score < 30 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-semibold">Suspicion Indicator</div>
              <div className="text-sm font-bold text-white">
                {attempt.suspicion_score} / 100
              </div>
              <div className="text-[10px] text-slate-500 capitalize">Review: {attempt.review_status?.replace('_', ' ')}</div>
            </div>
          </div>
        </div>

        {/* Action Buttons: PDF Download & Appeal */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex-wrap gap-3">
          <div className="text-xs text-slate-400">
            Need an official transcript or wish to submit clarification on a proctoring incident?
          </div>
          <div className="flex items-center gap-2">
            {can_appeal && (
              <button
                onClick={() => setShowAppealModal(true)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" /> Submit Appeal / Note
              </button>
            )}

            <a
              href={reportService.downloadAttemptPdf(attempt.id)}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition-all hover:scale-105"
            >
              <FileText className="w-3.5 h-3.5" /> Download PDF Transcript
            </a>
          </div>
        </div>

        {/* Question Breakdown (if released by teacher) */}
        {attempt.answers && attempt.answers.length > 0 ? (
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white">Question Evaluation Breakdown</h3>
            <div className="space-y-4">
              {attempt.answers.map((ans, idx) => (
                <div
                  key={ans.id}
                  className={`p-4 rounded-2xl border ${
                    ans.is_correct
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : (ans.is_correct === false ? 'bg-rose-950/20 border-rose-500/30' : 'bg-slate-950/40 border-slate-800')
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-slate-900 border border-slate-800 flex items-center justify-center font-bold text-xs text-slate-300">
                        {idx + 1}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-white">{ans.question_text}</span>
                    </div>
                    <div className="text-xs font-bold">
                      {ans.is_correct ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> +{ans.marks_awarded} Marks
                        </span>
                      ) : (
                        <span className="text-rose-400 flex items-center gap-1">
                          <X className="w-3.5 h-3.5" /> {ans.marks_awarded} Marks
                        </span>
                      )}
                    </div>
                  </div>

                  {ans.text_response && (
                    <div className="mt-2 text-xs text-slate-300 p-2 rounded-lg bg-slate-950 border border-slate-800">
                      Your response: {ans.text_response}
                    </div>
                  )}

                  {ans.explanation && (
                    <div className="mt-2 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                      <strong className="text-slate-300">Explanation:</strong> {ans.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
            Detailed question keys are retained by the course examiner and will be published upon conclusion of the examination period.
          </div>
        )}

        {/* Appeal Dialog Modal */}
        {showAppealModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-400" /> Submit Review Explanation / Appeal
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                If you experienced technical glitches, webcam lighting issues, or natural involuntary glances during the exam, submit an explanation to your instructor.
              </p>
              <textarea
                rows={4}
                value={appealStatement}
                onChange={(e) => setAppealStatement(e.target.value)}
                placeholder="Explain the circumstances surrounding any flagged alerts or examination events..."
                className="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500 leading-relaxed resize-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowAppealModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendAppeal}
                  disabled={submittingAppeal || !appealStatement.trim()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
                >
                  {submittingAppeal ? 'Submitting...' : 'Submit Explanation'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
