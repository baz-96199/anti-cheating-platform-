import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, Plus, Trash2, CheckCircle, ArrowLeft, RefreshCw,
  Edit, FolderPlus, HelpCircle
} from 'lucide-react';
import { teacherService } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function QuestionBanksPage() {
  const toast = useToast();
  const [banks, setBanks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [bankTitle, setBankTitle] = useState('');
  const [bankDesc, setBankDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadBanks();
  }, []);

  const loadBanks = async () => {
    setIsLoading(true);
    try {
      const res = await teacherService.getQuestionBanks();
      setBanks(res.data.banks || []);
    } catch {
      toast.error('Failed to load question banks.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBank = async (e) => {
    e.preventDefault();
    if (!bankTitle.trim()) return;
    setIsSubmitting(true);
    try {
      await teacherService.createQuestionBank({
        title: bankTitle.trim(),
        description: bankDesc.trim()
      });
      toast.success('Question bank created successfully!');
      setShowCreateModal(false);
      setBankTitle('');
      setBankDesc('');
      loadBanks();
    } catch (err) {
      toast.error('Failed to create question bank.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <Link to="/teacher" className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-medium">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>

        {/* Header */}
        <div className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold mb-2">
              <BookOpen className="w-3.5 h-3.5" /> Curated Question Repositories
            </div>
            <h1 className="text-2xl font-bold text-white">Reusable Question Banks</h1>
            <p className="text-xs text-slate-400 mt-1">
              Organize reusable item banks for assessments and AI-generated question libraries.
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-all hover:scale-105"
          >
            <FolderPlus className="w-4 h-4" /> New Question Bank
          </button>
        </div>

        {/* Question Banks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {banks.map((bank) => (
            <div key={bank.id} className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/40 transition-all shadow-xl space-y-4">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                  <BookOpen className="w-5 h-5" />
                </div>
                <span className="text-[11px] text-slate-500 font-mono">
                  {bank.created_at ? new Date(bank.created_at).toLocaleDateString() : ''}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-white">{bank.title}</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {bank.description || 'General course assessment question repository.'}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-purple-400 font-semibold">{bank.questions_count} Questions Stored</span>
                <Link to="/teacher/ai-generator" className="text-indigo-400 hover:text-indigo-300 font-medium">
                  + Add via AI &rarr;
                </Link>
              </div>
            </div>
          ))}

          {/* Create New Prompt Card */}
          <div
            onClick={() => setShowCreateModal(true)}
            className="p-8 rounded-2xl border-2 border-dashed border-slate-800 hover:border-purple-500/50 bg-slate-950/40 hover:bg-slate-900/30 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-3"
          >
            <div className="w-12 h-12 rounded-full bg-slate-900 text-slate-400 flex items-center justify-center">
              <Plus className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-300">Create Question Bank</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Group related questions by subject or difficulty</div>
            </div>
          </div>
        </div>

        {/* Create Bank Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
              <h3 className="text-sm font-bold text-white">Create Question Bank</h3>
              <form onSubmit={handleCreateBank} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Bank Title</label>
                  <input
                    type="text"
                    required
                    value={bankTitle}
                    onChange={(e) => setBankTitle(e.target.value)}
                    placeholder="e.g. Graph Theory Midterm Item Bank"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={bankDesc}
                    onChange={(e) => setBankDesc(e.target.value)}
                    placeholder="Brief description of topics covered..."
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Bank'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
