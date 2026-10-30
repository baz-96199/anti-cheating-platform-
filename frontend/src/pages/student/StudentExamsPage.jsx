import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, Award, Shield, ArrowRight, RefreshCw, CheckCircle } from 'lucide-react';
import { studentService } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function StudentExamsPage() {
  const toast = useToast();
  const [exams, setExams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available');

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    setIsLoading(true);
    try {
      const res = await studentService.getExams();
      setExams(res.data.exams || []);
    } catch {
      toast.error('Failed to load examinations.');
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = exams.filter((e) => {
    if (activeTab === 'available') return e.category === 'available' || e.category === 'in_progress';
    if (activeTab === 'upcoming') return e.category === 'upcoming';
    if (activeTab === 'completed') return e.category === 'completed';
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
              <BookOpen className="w-3.5 h-3.5" /> Course Examination Catalog
            </div>
            <h1 className="text-2xl font-bold text-white">Your Scheduled Examinations</h1>
            <p className="text-xs text-slate-400 mt-1">
              Browse available, scheduled, and concluded proctored assessments.
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('available')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === 'available'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white bg-slate-900/60'
            }`}
          >
            Available Now
          </button>
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === 'upcoming'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white bg-slate-900/60'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === 'completed'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white bg-slate-900/60'
            }`}
          >
            Concluded & Graded
          </button>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isLoading ? (
            <div className="col-span-2 py-12 text-center text-slate-400 flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
              <span className="text-xs">Loading examinations...</span>
            </div>
          ) : filtered.length > 0 ? (
            filtered.map((ex) => (
              <div key={ex.id} className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <span className="px-2 py-0.5 rounded font-mono text-xs bg-slate-950 border border-slate-800 text-indigo-400 font-bold">
                      {ex.exam_code}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">{ex.duration_minutes} Mins</span>
                  </div>

                  <h3 className="text-base font-bold text-white mt-2">{ex.title}</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {ex.description || 'Proctored institutional examination.'}
                  </p>

                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    {ex.require_face_verification && (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] border border-emerald-500/20">
                        Biometric Verified
                      </span>
                    )}
                    {ex.negative_marking && (
                      <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[10px] border border-rose-500/20">
                        Negative Marking
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px] border border-indigo-500/20">
                      Total: {ex.total_marks} Marks
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Pass criteria: <strong className="text-white">{ex.passing_percentage}%</strong>
                  </span>

                  {ex.category === 'completed' ? (
                    <Link
                      to={`/student/results/${ex.attempt?.id}`}
                      className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-400 text-xs font-semibold"
                    >
                      View Transcript &rarr;
                    </Link>
                  ) : ex.category === 'in_progress' ? (
                    <Link
                      to={`/exam/take/${ex.attempt?.id}`}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
                    >
                      Resume Exam &rarr;
                    </Link>
                  ) : (
                    <Link
                      to={`/exam/entrance/${ex.id}`}
                      className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20"
                    >
                      Enter Assessment &rarr;
                    </Link>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 py-12 text-center text-slate-500 text-xs">
              No examinations found in this category.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
