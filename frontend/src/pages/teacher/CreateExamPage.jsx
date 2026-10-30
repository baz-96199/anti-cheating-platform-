import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Shield, Clock, Award, Lock, PlusCircle, ArrowRight, ArrowLeft,
  AlertTriangle, CheckCircle, Eye, Settings, Calendar
} from 'lucide-react';
import { teacherService } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function CreateExamPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration_minutes: 60,
    total_marks: 50.0,
    passing_percentage: 40.0,
    start_time: new Date().toISOString().slice(0, 16),
    end_time: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 16),
    negative_marking: true,
    negative_mark_value: 0.25,
    randomize_questions: true,
    randomize_options: true,
    require_face_verification: true,
    warning_limit: 5,
    auto_submit_on_violations: true,
    enable_head_pose_detection: true,
    enable_tab_switch_detection: true,
    enable_fullscreen_lock: true,
    show_result_immediately: true,
    allow_review_requests: true,
    is_published: true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.warning('Please enter an exam title.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await teacherService.createExam(formData);
      toast.success(`Exam "${res.data.exam.title}" created with code: ${res.data.exam.exam_code}!`);
      navigate('/teacher');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create examination.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link to="/teacher" className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-medium">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>

        <div className="p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold mb-2">
            <PlusCircle className="w-3.5 h-3.5" /> Assessment Configuration Wizard
          </div>
          <h1 className="text-2xl font-bold text-white">Create New Examination</h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure proctoring lockdown rules, timing constraints, grading rubrics, and publish settings.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {/* 1. Basic Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2 flex items-center gap-2">
                <Settings className="w-4 h-4 text-purple-400" /> Basic Details
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Exam Title</label>
                <input
                  type="text"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g. End Semester Exam: Design & Analysis of Algorithms"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Description & Candidate Instructions</label>
                <textarea
                  rows={3}
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Provide syllabus instructions, rules, and guidance for test takers..."
                  className="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-purple-500 resize-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Duration (Minutes)</label>
                  <input
                    type="number"
                    name="duration_minutes"
                    min={5}
                    max={360}
                    value={formData.duration_minutes}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Total Marks</label>
                  <input
                    type="number"
                    name="total_marks"
                    value={formData.total_marks}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Passing %</label>
                  <input
                    type="number"
                    name="passing_percentage"
                    min={1}
                    max={100}
                    value={formData.passing_percentage}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-purple-400" /> Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    name="start_time"
                    value={formData.start_time}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-purple-400" /> End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    name="end_time"
                    value={formData.end_time}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* 2. Proctoring & Anti-Cheating Lockdown */}
            <div className="space-y-4 pt-4">
              <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" /> Anti-Cheating & Proctoring Lockdown
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="require_face_verification"
                    checked={formData.require_face_verification}
                    onChange={handleChange}
                    className="mt-0.5 rounded border-slate-700 bg-slate-950 text-purple-600 focus:ring-purple-500 h-4 w-4"
                  />
                  <div>
                    <span className="text-xs font-semibold text-white block">Biometric Face Match</span>
                    <span className="text-[11px] text-slate-400">Require camera face similarity match before entering exam.</span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="enable_head_pose_detection"
                    checked={formData.enable_head_pose_detection}
                    onChange={handleChange}
                    className="mt-0.5 rounded border-slate-700 bg-slate-950 text-purple-600 focus:ring-purple-500 h-4 w-4"
                  />
                  <div>
                    <span className="text-xs font-semibold text-white block">Continuous Head-Pose Tracking</span>
                    <span className="text-[11px] text-slate-400">Detect prolonged looking away, absence, and multiple faces.</span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="enable_tab_switch_detection"
                    checked={formData.enable_tab_switch_detection}
                    onChange={handleChange}
                    className="mt-0.5 rounded border-slate-700 bg-slate-950 text-purple-600 focus:ring-purple-500 h-4 w-4"
                  />
                  <div>
                    <span className="text-xs font-semibold text-white block">Tab Switch & Window Blur Detection</span>
                    <span className="text-[11px] text-slate-400">Log violations whenever candidate switches to another app.</span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="enable_fullscreen_lock"
                    checked={formData.enable_fullscreen_lock}
                    onChange={handleChange}
                    className="mt-0.5 rounded border-slate-700 bg-slate-950 text-purple-600 focus:ring-purple-500 h-4 w-4"
                  />
                  <div>
                    <span className="text-xs font-semibold text-white block">Fullscreen Lockdown</span>
                    <span className="text-[11px] text-slate-400">Enforce browser fullscreen mode and log escapes.</span>
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Violation Warning Limit</label>
                  <input
                    type="number"
                    name="warning_limit"
                    min={1}
                    max={20}
                    value={formData.warning_limit}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Number of notices given to candidate before final action.</p>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      name="auto_submit_on_violations"
                      checked={formData.auto_submit_on_violations}
                      onChange={handleChange}
                      className="rounded border-slate-700 bg-slate-950 text-purple-600 focus:ring-purple-500 h-4 w-4"
                    />
                    <div>
                      <span className="text-xs font-semibold text-white block">Auto-Submit on Warning Limit</span>
                      <span className="text-[10px] text-slate-400">Automatically submit attempt when candidate exceeds warning limit.</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* 3. Grading & Evaluation Controls */}
            <div className="space-y-4 pt-4">
              <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2 flex items-center gap-2">
                <Award className="w-4 h-4 text-cyan-400" /> Grading & Randomization
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    name="randomize_questions"
                    checked={formData.randomize_questions}
                    onChange={handleChange}
                    className="rounded border-slate-700 bg-slate-950 text-purple-600 focus:ring-purple-500 h-4 w-4"
                  />
                  <span>Randomize Question Order</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    name="randomize_options"
                    checked={formData.randomize_options}
                    onChange={handleChange}
                    className="rounded border-slate-700 bg-slate-950 text-purple-600 focus:ring-purple-500 h-4 w-4"
                  />
                  <span>Randomize Answer Choices</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    name="show_result_immediately"
                    checked={formData.show_result_immediately}
                    onChange={handleChange}
                    className="rounded border-slate-700 bg-slate-950 text-purple-600 focus:ring-purple-500 h-4 w-4"
                  />
                  <span>Release Result Immediately</span>
                </label>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    name="negative_marking"
                    checked={formData.negative_marking}
                    onChange={handleChange}
                    className="rounded border-slate-700 bg-slate-950 text-purple-600 focus:ring-purple-500 h-4 w-4"
                  />
                  <span>Enable Negative Marking</span>
                </label>

                {formData.negative_marking && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400">Penalty value per incorrect answer:</span>
                    <input
                      type="number"
                      step="0.05"
                      min="0.1"
                      max="5.0"
                      name="negative_mark_value"
                      value={formData.negative_mark_value}
                      onChange={handleChange}
                      className="w-20 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Submit Bar */}
            <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-white">
                <input
                  type="checkbox"
                  name="is_published"
                  checked={formData.is_published}
                  onChange={handleChange}
                  className="rounded border-slate-700 bg-slate-950 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <span>Publish Immediately (Make available to students)</span>
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                {isSubmitting ? 'Creating Exam...' : 'Create Examination'} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
