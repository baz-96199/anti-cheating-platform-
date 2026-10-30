import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Shield, AlertTriangle, CheckCircle, Clock, ArrowLeft, RefreshCw,
  User, Award, Eye, FileText, Check, X, AlertCircle, Save
} from 'lucide-react';
import { teacherService, reportService } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function AttemptReviewPage() {
  const { attemptId } = useParams();
  const toast = useToast();

  const [attemptData, setAttemptData] = useState(null);
  const [reviewStatus, setReviewStatus] = useState('none');
  const [teacherRemarks, setTeacherRemarks] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAttemptDetail();
  }, [attemptId]);

  const loadAttemptDetail = async () => {
    setIsLoading(true);
    try {
      const res = await teacherService.getAttemptDetail(attemptId);
      setAttemptData(res.data);
      setReviewStatus(res.data.attempt?.review_status || 'none');
      setTeacherRemarks(res.data.attempt?.teacher_remarks || '');
    } catch {
      toast.error('Failed to load attempt details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveReview = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await teacherService.reviewAttempt(attemptId, {
        review_status: reviewStatus,
        teacher_remarks: teacherRemarks
      });
      toast.success('Attempt review status updated.');
      loadAttemptDetail();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update review status.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReviewEvent = async (eventId, newStatus) => {
    try {
      const res = await teacherService.reviewEvent(eventId, { review_status: newStatus });
      toast.success(`Event marked as ${newStatus}. Suspicion score updated: ${res.data.updated_suspicion_score}`);
      loadAttemptDetail();
    } catch {
      toast.error('Failed to update event status.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const { attempt, exam, events, appeals } = attemptData || {};
  if (!attempt) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-2">
        <div>Attempt not found.</div>
        <Link to="/teacher" className="text-purple-400 text-xs">Return to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <Link to="/teacher" className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-medium">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>

        {/* Header Summary */}
        <div className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
              <Eye className="w-3.5 h-3.5" /> Proctoring Telemetry & Forensic Review
            </div>
            <h1 className="text-2xl font-bold text-white">
              Candidate Attempt #{attempt.id}: {attempt.student_name}
            </h1>
            <p className="text-xs text-slate-400">
              Examination: <strong className="text-slate-200">{attempt.exam_title}</strong> ({attempt.exam_code}) • Email:{' '}
              <span className="font-mono text-slate-300">{attempt.student_email}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={reportService.downloadAttemptPdf(attempt.id)}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-400" /> Download PDF Transcript
            </a>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Score Result</div>
            <div className="text-2xl font-bold text-white mt-1">
              {attempt.total_score} <span className="text-xs text-slate-400 font-normal">/ {attempt.total_exam_marks}</span>
            </div>
            <div className="text-[10px] text-slate-500">{attempt.percentage}% • {attempt.is_passed ? 'PASSED' : 'FAILED'}</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Biometric Match</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {attempt.face_verification_passed ? 'Verified' : 'Failed'}
            </div>
            <div className="text-[10px] text-slate-500">
              Similarity: {attempt.face_similarity_score ? Math.round(attempt.face_similarity_score * 100) : '—'}%
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Suspicion Indicator</div>
            <div className="text-2xl font-bold text-amber-400 mt-1">{attempt.suspicion_score} / 100</div>
            <div className="text-[10px] text-slate-500">{attempt.violation_count} Total flags captured</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Review Status</div>
            <div className="text-lg font-bold text-white mt-1 capitalize">{reviewStatus.replace('_', ' ')}</div>
            <div className="text-[10px] text-slate-500">Examiner verdict</div>
          </div>
        </div>

        {/* Student Appeals (if any) */}
        {appeals && appeals.length > 0 && (
          <div className="p-6 rounded-3xl bg-purple-950/20 border border-purple-500/30 space-y-3">
            <h3 className="text-sm font-bold text-purple-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-purple-400" /> Student Explanation / Appeal Submission
            </h3>
            {appeals.map((ap) => (
              <div key={ap.id} className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>Submitted on: {new Date(ap.created_at).toLocaleString()}</span>
                  <span className="uppercase font-bold text-purple-400">{ap.status}</span>
                </div>
                <p className="text-slate-200 leading-relaxed font-serif text-sm">"{ap.statement}"</p>
              </div>
            ))}
          </div>
        )}

        {/* Proctoring Event Chronological Timeline */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" /> Incident Forensics Timeline
              </h3>
              <p className="text-xs text-slate-400">Captured telemetry flags recorded by browser lockdown & webcam AI</p>
            </div>
            <span className="text-xs font-semibold px-2 py-1 rounded bg-slate-800 text-slate-300 font-mono">
              {events?.length || 0} Events
            </span>
          </div>

          <div className="space-y-3">
            {events && events.length > 0 ? (
              events.map((ev) => {
                const details = ev.details || {};
                const isDismissed = ev.review_status === 'dismissed';
                return (
                  <div
                    key={ev.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      isDismissed
                        ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                        : (ev.severity === 'critical'
                        ? 'bg-rose-950/30 border-rose-500/40'
                        : (ev.severity === 'high'
                        ? 'bg-amber-950/30 border-amber-500/40'
                        : 'bg-slate-950 border-slate-800'))
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          ev.severity === 'critical' ? 'bg-rose-500/20 text-rose-400' : (ev.severity === 'high' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-300')
                        }`}>
                          {ev.severity}
                        </span>
                        <span className="text-xs font-bold text-white">
                          {ev.event_type.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : ''}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300">
                        {details.message || `Violation logged: ${ev.event_type}`}
                      </div>
                      {(details.yaw !== undefined || details.pitch !== undefined) && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          Angles: Yaw={details.yaw}° • Pitch={details.pitch}° • Confidence={Math.round(ev.confidence * 100)}%
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">{ev.review_status}</span>
                      {ev.review_status !== 'dismissed' ? (
                        <button
                          onClick={() => handleReviewEvent(ev.id, 'dismissed')}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium"
                        >
                          Dismiss (Ignore)
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReviewEvent(ev.id, 'confirmed')}
                          className="px-2.5 py-1 rounded-lg bg-rose-950 border border-rose-500/40 text-rose-300 text-[11px] font-medium"
                        >
                          Confirm Violation
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs">
                No telemetry violation incidents recorded for this examination attempt.
              </div>
            )}
          </div>
        </div>

        {/* Examiner Ruling & Verdict Form */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
          <form onSubmit={handleSaveReview} className="space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-400" /> Record Official Faculty Ruling
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Integrity Ruling Status</label>
                <select
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-purple-500"
                >
                  <option value="none">None (Standard Evaluation)</option>
                  <option value="needs_review">Needs Review / Under Inspection</option>
                  <option value="explained">Explained / Dismissed (Student Justification Accepted)</option>
                  <option value="confirmed_violation">Confirmed Policy Violation</option>
                  <option value="escalated">Escalate to Academic Disciplinary Committee (Admin)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Faculty Feedback & Remarks</label>
                <textarea
                  rows={2}
                  value={teacherRemarks}
                  onChange={(e) => setTeacherRemarks(e.target.value)}
                  placeholder="Record justification, notes on student explanation, or instructions..."
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-purple-500 resize-none leading-relaxed"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-all hover:scale-105"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving Verdict...' : 'Save Official Verdict'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
