import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft, RefreshCw, CheckCircle, XCircle, AlertTriangle, MessageSquare } from 'lucide-react';
import { adminService } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function DisputeResolutionPage() {
  const toast = useToast();
  const [disputes, setDisputes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeAppeal, setActiveAppeal] = useState(null);
  const [resolutionStatus, setResolutionStatus] = useState('accepted');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    loadDisputes();
  }, []);

  const loadDisputes = async () => {
    setIsLoading(true);
    try {
      const res = await adminService.getDisputes();
      setDisputes(res.data.disputes || []);
    } catch {
      toast.error('Failed to load appeals.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolve = async (e) => {
    e.preventDefault();
    if (!activeAppeal) return;
    setIsResolving(true);
    try {
      await adminService.resolveDispute(activeAppeal.id, {
        status: resolutionStatus,
        resolution_notes: resolutionNotes.trim()
      });
      toast.success('Dispute resolved and logged.');
      setActiveAppeal(null);
      setResolutionNotes('');
      loadDisputes();
    } catch (err) {
      toast.error('Failed to resolve dispute.');
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <Link to="/admin" className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>

        {/* Header */}
        <div className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-2">
              <Shield className="w-3.5 h-3.5" /> Disciplinary & Appeal Committee
            </div>
            <h1 className="text-2xl font-bold text-white">Dispute & Appeal Resolution</h1>
            <p className="text-xs text-slate-400 mt-1">
              Review escalated candidate explanations, overturn false positives, and record final administrative verdicts.
            </p>
          </div>
        </div>

        {/* Disputes List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
              <span className="text-xs">Loading disputes...</span>
            </div>
          ) : disputes.length > 0 ? (
            disputes.map((d) => (
              <div key={d.id} className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white text-sm">Appeal #{d.id}</span>
                    <span className="text-xs text-slate-400 ml-2">from Candidate {d.student_name}</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                    d.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : (d.status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20')
                  }`}>
                    {d.status}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-serif leading-relaxed">
                  "{d.statement}"
                </div>

                {d.resolution_notes && (
                  <div className="text-xs text-slate-400 pt-2 border-t border-slate-800">
                    <strong className="text-slate-300">Ruling Notes ({d.reviewer_name || 'Admin'}):</strong> {d.resolution_notes}
                  </div>
                )}

                {d.status === 'submitted' && (
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => {
                        setActiveAppeal(d);
                        setResolutionStatus('accepted');
                      }}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                    >
                      Record Resolution
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-slate-500 text-xs">
              No appeals submitted for review.
            </div>
          )}
        </div>

        {/* Modal */}
        {activeAppeal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
              <h3 className="text-sm font-bold text-white">Record Administrative Ruling</h3>
              <form onSubmit={handleResolve} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Decision</label>
                  <select
                    value={resolutionStatus}
                    onChange={(e) => setResolutionStatus(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                  >
                    <option value="accepted">Accept Appeal (Overturn flags)</option>
                    <option value="rejected">Reject Appeal (Uphold violation)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Ruling Justification / Notes</label>
                  <textarea
                    rows={3}
                    required
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Enter official remarks..."
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs resize-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveAppeal(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isResolving}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                  >
                    {isResolving ? 'Recording...' : 'Submit Ruling'}
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
