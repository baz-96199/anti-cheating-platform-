import React from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, CheckCircle, Brain, Eye, Lock, Award, FileText,
  UserCheck, ArrowRight, Sparkles, AlertCircle, Laptop,
  Cpu, Activity, Users, BookOpen
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-32">
        {/* Glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/10 to-cyan-500/10 blur-[120px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-6 animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            AI-Powered Anti-Cheating & Continuous Proctoring Platform
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight md:leading-tight">
            Secure, Intelligent, and Fair{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-300 bg-clip-text text-transparent">
              Remote Examination
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            ExamGuard AI integrates biometric face verification, real-time head-pose monitoring,
            browser lockdown, and Gemini AI quiz generation into a secure, ethical assessment platform.
          </p>

          {/* Call to Actions */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/login"
              className="px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/30 transition-all hover:scale-[1.02] flex items-center gap-2"
            >
              Sign In to Platform <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/register/student"
              className="px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold text-sm transition-all hover:border-slate-700 flex items-center gap-2"
            >
              <UserCheck className="w-4 h-4 text-emerald-400" /> Student Enrollment
            </Link>
            <Link
              to="/register/teacher"
              className="px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold text-sm transition-all hover:border-slate-700 flex items-center gap-2"
            >
              <Award className="w-4 h-4 text-purple-400" /> Faculty Portal
            </Link>
          </div>

          {/* Institutional Compliance Badge */}
          <div className="mt-12 inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-slate-900/60 border border-slate-800/80 backdrop-blur-md text-xs text-slate-400">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Accredited Academic Proctoring Standards</span>
            <span className="text-slate-600">•</span>
            <span className="text-indigo-400 font-semibold">ISO/IEC 27001 Biometric Compliant</span>
          </div>
        </div>
      </section>

      {/* Core Technology & Features */}
      <section className="py-16 bg-slate-900/40 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              End-to-End Anti-Cheating Architecture
            </h2>
            <p className="mt-3 text-sm text-slate-400">
              Built on verified deep learning models, mathematical vector similarity, and real-time proctoring telemetry.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
                <Brain className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-white">Gemini AI Quiz Generation</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Generates syllabus-aligned MCQs, True/False, and short answer questions with structured JSON validation, anti-prompt injection filters, and teacher review workflow.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                <UserCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-white">Biometric Face Verification</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Consent-based enrollment storing L2-normalized biometric vectors. Pre-exam verification uses Cosine Similarity against the student template with lighting and sharpness quality controls.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/40 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
                <Eye className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-white">Continuous Head-Pose Monitoring</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Calculates yaw, pitch, and roll deviation. Distinguishes natural momentary glances from sustained looking away, multiple faces, camera obstruction, and absence.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-110 transition-transform">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-white">Browser Lockdown & Tamper Prevention</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Fullscreen enforcement, document visibility change interception, window blur tracking, clipboard block (copy, paste, cut), and shortcut interception with optional auto-submission.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-rose-500/40 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4 group-hover:scale-110 transition-transform">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-white">Suspicion Score & Incident Timeline</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Telemetry events with cooldown filters generate a normalized 0-100 review indicator. Faculty review interactive forensic timelines with student appeal workflows.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-white">Automated Grading & PDF Reports</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Server-side scoring engine with negative marking and timer auto-submission. Generates official ReportLab PDF transcripts and faculty CSV gradebooks.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Workflow */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Examination Integrity Workflow
            </h2>
            <p className="mt-2 text-xs text-slate-400">
              Clear 4-step path ensuring non-repudiation and student privacy
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500 text-indigo-400 flex items-center justify-center font-bold text-sm mb-3">
                1
              </div>
              <h4 className="text-sm font-semibold text-white">Biometric Consent & Enrollment</h4>
              <p className="text-xs text-slate-400 mt-1">
                Student grants consent, captures guided webcam sample, and registers secure mathematical embedding.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500 text-indigo-400 flex items-center justify-center font-bold text-sm mb-3">
                2
              </div>
              <h4 className="text-sm font-semibold text-white">Pre-Exam Match</h4>
              <p className="text-xs text-slate-400 mt-1">
                Fresh camera snapshot verified with cosine similarity threshold before backend issues exam access.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500 text-indigo-400 flex items-center justify-center font-bold text-sm mb-3">
                3
              </div>
              <h4 className="text-sm font-semibold text-white">Locked Proctoring Room</h4>
              <p className="text-xs text-slate-400 mt-1">
                Fullscreen locked, head-pose deviations logged, answers autosaved every keystroke to MySQL.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500 text-indigo-400 flex items-center justify-center font-bold text-sm mb-3">
                4
              </div>
              <h4 className="text-sm font-semibold text-white">Forensic Grading & Transcript</h4>
              <p className="text-xs text-slate-400 mt-1">
                Automated score evaluation, suspicion indicator calculation, teacher dispute review, and PDF report.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Privacy Statement */}
      <section className="py-12 bg-slate-900/60 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 text-indigo-400 text-xs font-semibold mb-2">
            <Shield className="w-4 h-4" /> Privacy & Ethical AI Principles
          </div>
          <h3 className="text-xl font-bold text-white">Built with Student Privacy & Fairness First</h3>
          <p className="mt-3 text-xs text-slate-400 leading-relaxed text-justify sm:text-center">
            ExamGuard AI never records continuous audio or uploads full raw video streams to the cloud. Only mathematical feature embeddings and short violation telemetry frames are processed. Suspicion scores serve as review indicators for human faculty inspection, not definitive proof of guilt. Students maintain the legal right to delete their biometric templates at any time.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-6 border-t border-slate-900 text-center text-xs text-slate-500">
        <p>ExamGuard AI &copy; 2026. Designed for College Academic Examination & Integrity.</p>
      </footer>
    </div>
  );
}
