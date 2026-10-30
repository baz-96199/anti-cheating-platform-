import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Shield, CheckCircle, AlertTriangle, Clock, Award, FileText,
  Lock, ArrowRight, UserCheck, RefreshCw, AlertCircle
} from 'lucide-react';
import WebcamCapture from '../../components/WebcamCapture';
import { studentService, faceService, examService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function ExamEntrancePage() {
  const { examId } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [verificationError, setVerificationError] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [startingExam, setStartingExam] = useState(false);

  const hasFaceEnrolled = Boolean(user?.student_profile?.face_registered);

  useEffect(() => {
    loadExamDetails();
  }, [examId]);

  const loadExamDetails = async () => {
    setIsLoading(true);
    try {
      const res = await studentService.getExams();
      const found = res.data.exams?.find((e) => String(e.id) === String(examId));
      if (!found) {
        toast.error('Exam not found or unavailable.');
        navigate('/student');
        return;
      }
      setExam(found);
    } catch {
      toast.error('Failed to load examination details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySnapshot = async (base64Image) => {
    if (!hasFaceEnrolled) {
      toast.warning('You must enroll your face template before taking this exam.');
      return;
    }

    setIsVerifying(true);
    setVerificationError('');
    setVerificationResult(null);

    try {
      const res = await faceService.verify({
        image: base64Image
      });
      setVerificationResult(res.data);
      if (res.data.verified) {
        toast.success(`Identity Confirmed! Similarity: ${res.data.similarity_percentage}%`);
      } else {
        toast.warning(res.data.status_message);
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.status_message || 'Verification failed. Please retry.';
      setVerificationError(msg);
      toast.error(msg);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleStartExam = async () => {
    if (exam?.require_face_verification && (!verificationResult || !verificationResult.verified)) {
      toast.warning('Identity verification is required before starting this exam.');
      return;
    }
    if (!termsAccepted) {
      toast.warning('Please acknowledge the examination integrity code.');
      return;
    }

    setStartingExam(true);
    try {
      const res = await examService.start({ exam_id: exam.id });
      toast.success('Exam session authorized! Entering proctored room...');
      navigate(`/exam/take/${res.data.attempt_id}`);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to initialize exam session.';
      toast.error(msg);
      setStartingExam(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const isVerified = verificationResult?.verified || !exam?.require_face_verification;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Title Header */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
              <Shield className="w-3.5 h-3.5" /> Identity Verification & Exam Entrance
            </div>
            <h1 className="text-2xl font-bold text-white">{exam?.title}</h1>
            <p className="text-xs text-slate-400 mt-1">
              Subject: <strong className="text-slate-200">{exam?.subject_name || 'Curriculum Subject'}</strong> • Exam Code:{' '}
              <span className="font-mono text-indigo-300 font-semibold">{exam?.exam_code}</span>
            </p>
          </div>

          <div className="text-right">
            <span className="px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300">
              Duration: <strong className="text-white">{exam?.duration_minutes} Mins</strong>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Rules & Policy Card */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" /> Proctoring Rules & Policies
              </h3>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <Clock className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">Strict Countdown Timer:</strong>
                    <div className="text-slate-400 text-[11px] mt-0.5">
                      Exam duration is {exam?.duration_minutes} minutes. If time expires, your answers are submitted automatically.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <Lock className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">Browser Lockdown:</strong>
                    <div className="text-slate-400 text-[11px] mt-0.5">
                      Exiting fullscreen, switching tabs, or using restricted keys (Ctrl+C, Ctrl+V) triggers proctoring warnings.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">Warning Threshold: {exam?.warning_limit} Warnings</strong>
                    <div className="text-slate-400 text-[11px] mt-0.5">
                      {exam?.auto_submit_on_violations
                        ? 'Reaching the maximum allowed violations triggers automated submission.'
                        : 'Violations are compiled into a suspicion score for faculty inspection.'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <Award className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">Grading Schema:</strong>
                    <div className="text-slate-400 text-[11px] mt-0.5">
                      Total: {exam?.total_marks} Marks • Passing: {exam?.passing_percentage}%
                      {exam?.negative_marking && ` • Negative Marking (-${exam.negative_mark_value} per wrong answer)`}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Acknowledgment */}
            <div className="pt-4 border-t border-slate-800">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span className="text-xs text-slate-300">
                  I commit to academic integrity and understand that this session is monitored by AI proctoring telemetry.
                </span>
              </label>
            </div>
          </div>

          {/* Biometric Verification Card */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" /> Biometric Identity Verification
            </h3>

            {!hasFaceEnrolled ? (
              <div className="p-6 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-center space-y-3">
                <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">Face Template Required</h4>
                <p className="text-xs text-slate-300">
                  This examination requires biometric identity confirmation, but your profile has not enrolled a face template yet.
                </p>
                <Link
                  to="/student/face-enroll"
                  className="inline-block px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                >
                  Enroll Face Now
                </Link>
              </div>
            ) : (
              <>
                <WebcamCapture
                  onCapture={handleVerifySnapshot}
                  guideText="Look directly at the camera"
                />

                {isVerifying && (
                  <div className="text-center py-2 text-xs text-indigo-400 animate-pulse font-semibold">
                    Comparing captured vectors with registered template...
                  </div>
                )}

                {verificationResult && (
                  <div
                    className={`p-3 rounded-xl border text-xs ${
                      verificationResult.verified
                        ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                        : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      {verificationResult.verified ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400" />
                      )}
                      <span>{verificationResult.status_message}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-300">
                      Similarity Score: <strong className="text-white">{verificationResult.similarity_percentage}%</strong> (Required: &ge; {verificationResult.threshold_percentage}%)
                    </div>
                  </div>
                )}

                {verificationError && (
                  <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs">
                    {verificationError}
                  </div>
                )}
              </>
            )}

            {/* Launch Button */}
            <button
              onClick={handleStartExam}
              disabled={!isVerified || !termsAccepted || startingExam}
              className="w-full mt-4 py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
            >
              {startingExam ? (
                <>Initializing Lockdown Session...</>
              ) : (
                <>
                  <Lock className="w-4 h-4" /> Enter Examination & Lock Browser <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
