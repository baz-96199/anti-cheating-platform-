import React, { useState } from 'react';
import { Shield, CheckCircle, AlertTriangle, Trash2, Camera, UserCheck, Info } from 'lucide-react';
import WebcamCapture from '../../components/WebcamCapture';
import { faceService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function FaceEnrollmentPage() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();

  const [hasConsent, setHasConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [enrollmentResult, setEnrollmentResult] = useState(null);

  const isEnrolled = Boolean(user?.student_profile?.face_registered);

  const handleCapture = async (base64Image) => {
    if (!hasConsent && !isEnrolled) {
      toast.warning('Please confirm the biometric consent agreement before enrolling.');
      return;
    }

    setIsSubmitting(true);
    setEnrollmentResult(null);
    try {
      const res = await faceService.register({
        image: base64Image,
        consent: true
      });
      setEnrollmentResult(res.data);
      toast.success('Face template successfully registered and enrolled!');
      await refreshUser();
    } catch (err) {
      const msg = err.response?.data?.error || 'Face enrollment failed. Please check camera lighting and look directly into the lens.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!window.confirm('Are you sure you want to delete your biometric face template? You will need to re-enroll before taking proctored exams.')) {
      return;
    }
    setIsDeleting(true);
    try {
      await faceService.deleteTemplate();
      toast.info('Biometric face template has been completely deleted.');
      await refreshUser();
      setEnrollmentResult(null);
    } catch (err) {
      toast.error('Failed to purge face template.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
              <Shield className="w-3.5 h-3.5" /> Biometric Identity Verification
            </div>
            <h1 className="text-2xl font-bold text-white">Face Template Registration</h1>
            <p className="text-xs text-slate-400 mt-1">
              Enroll your normalized facial biometric template used to verify your identity during exams.
            </p>
          </div>

          <div>
            {isEnrolled ? (
              <span className="px-3.5 py-1.5 rounded-xl bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-400" /> Active Enrollment
              </span>
            ) : (
              <span className="px-3.5 py-1.5 rounded-xl bg-amber-950 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" /> Pending Enrollment
              </span>
            )}
          </div>
        </div>

        {/* Biometric Consent Agreement */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
            <Info className="w-4 h-4 text-indigo-400" /> Informed Consent & Biometric Retention Policy
          </div>
          <p className="text-xs text-slate-400 leading-relaxed text-justify">
            By proceeding, you grant ExamGuard AI permission to capture a photographic sample through your webcam to extract a mathematical feature embedding (128/512-dimensional vector). <strong>ExamGuard AI does NOT store raw continuous video.</strong> Your facial embedding is encrypted and used strictly for identity verification during authorized university examinations. You retain the right to delete your biometric template at any time.
          </p>

          <label className="flex items-start gap-3 pt-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hasConsent || isEnrolled}
              disabled={isEnrolled}
              onChange={(e) => setHasConsent(e.target.checked)}
              className="mt-0.5 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
            />
            <span className="text-xs text-slate-300 font-medium">
              I have read, understood, and consent to biometric face verification for examination integrity.
            </span>
          </label>
        </div>

        {/* Camera Capture Card */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <div className="text-center max-w-md mx-auto">
            <h3 className="text-base font-bold text-white">Live Camera Enrollment</h3>
            <p className="text-xs text-slate-400 mt-1">
              Center your face inside the oval frame. Ensure ample frontal lighting and remove caps or sunglasses.
            </p>
          </div>

          <div className="max-w-md mx-auto">
            <WebcamCapture
              onCapture={handleCapture}
              guideText="Position face inside oval"
            />
          </div>

          {isSubmitting && (
            <div className="text-center py-2 text-xs text-indigo-400 animate-pulse font-semibold">
              Extracting biometric vectors and computing quality score...
            </div>
          )}

          {enrollmentResult && (
            <div className="max-w-md mx-auto p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-emerald-400">
                <CheckCircle className="w-4 h-4" /> Enrollment Successful!
              </div>
              <p>Model Version: <span className="font-mono text-white">{enrollmentResult.model_version}</span></p>
              <p>Image Brightness: <span className="font-mono text-white">{enrollmentResult.quality?.brightness}</span> • Sharpness: <span className="font-mono text-white">{enrollmentResult.quality?.sharpness}</span></p>
            </div>
          )}
        </div>

        {/* Purge / Retention Controls */}
        {isEnrolled && (
          <div className="p-5 rounded-2xl bg-rose-950/20 border border-rose-500/30 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-rose-300">Biometric Retention & Data Privacy</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Permanently purge your enrolled biometric vector from the server database.
              </div>
            </div>
            <button
              onClick={handleDeleteTemplate}
              disabled={isDeleting}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-rose-600/20"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isDeleting ? 'Purging...' : 'Delete Face Template'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
