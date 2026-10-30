import React, { useState, useEffect } from 'react';
import {
  Sparkles, Brain, CheckCircle, Trash2, Edit3, Plus, RefreshCw,
  BookOpen, Award, ArrowRight, AlertCircle, FileText, Check, X
} from 'lucide-react';
import { teacherService } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function AiQuizGeneratorPage() {
  const toast = useToast();

  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [formData, setFormData] = useState({
    subject: 'Computer Science & Engineering',
    topic: 'Graph Algorithms & Asymptotic Complexity',
    num_questions: 4,
    question_type: 'mcq',
    difficulty: 'medium',
    marks_per_question: 2.0,
    include_explanations: true,
    reference_material: ''
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [generationMeta, setGenerationMeta] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    loadTeacherExams();
  }, []);

  const loadTeacherExams = async () => {
    try {
      const res = await teacherService.getExams();
      setExams(res.data.exams || []);
      if (res.data.exams && res.data.exams.length > 0) {
        setSelectedExamId(res.data.exams[0].id);
      }
    } catch {
      // ignore
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!formData.topic.trim()) {
      toast.warning('Please enter an exam topic or syllabus keyword.');
      return;
    }

    setIsGenerating(true);
    setGeneratedQuestions([]);
    setGenerationMeta(null);

    try {
      const res = await teacherService.generateQuizAi(formData);
      setGeneratedQuestions(res.data.questions || []);
      setGenerationMeta({
        ai_generated: res.data.ai_generated,
        model: res.data.model || 'Curriculum Fallback Engine',
        warning: res.data.warning || res.data.note
      });
      toast.success(`Generated ${res.data.questions?.length || 0} structured questions!`);
    } catch (err) {
      toast.error('Failed to generate questions. Please retry.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteQuestion = (index) => {
    setGeneratedQuestions(generatedQuestions.filter((_, idx) => idx !== index));
  };

  const handleUpdateQuestionText = (index, newText) => {
    const updated = [...generatedQuestions];
    updated[index].question_text = newText;
    setGeneratedQuestions(updated);
  };

  const handleToggleOptionCorrect = (qIndex, optIndex) => {
    const updated = [...generatedQuestions];
    const q = updated[qIndex];
    if (q.question_type === 'mcq' || q.question_type === 'true_false') {
      // Exactly one correct for standard MCQ/TrueFalse
      q.options.forEach((opt, idx) => {
        opt.is_correct = idx === optIndex;
      });
    }
    setGeneratedQuestions(updated);
  };

  const handleImportToExam = async () => {
    if (!selectedExamId) {
      toast.warning('Please select a target examination to import questions.');
      return;
    }
    if (generatedQuestions.length === 0) {
      toast.warning('No generated questions to import.');
      return;
    }

    setIsImporting(true);
    try {
      const res = await teacherService.batchImportQuestions({
        exam_id: selectedExamId,
        questions: generatedQuestions
      });
      toast.success(res.data.message || 'Questions successfully imported into exam!');
      setGeneratedQuestions([]);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to import questions.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" /> Powered by Google Gemini API
            </div>
            <h1 className="text-2xl font-bold text-white">AI-Powered Quiz Generator</h1>
            <p className="text-xs text-slate-400 mt-1">
              Generate curriculum-aligned exam questions with structured JSON validation and teacher editorial controls.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400 font-semibold">Target Exam:</label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
            >
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.title} ({ex.exam_code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Generator Form */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Subject</label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="e.g. Data Structures & Algorithms"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Topic / Syllabus Module</label>
                <input
                  type="text"
                  required
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  placeholder="e.g. Dijkstra, Bellman-Ford, Minimum Spanning Trees"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Question Type</label>
                <select
                  value={formData.question_type}
                  onChange={(e) => setFormData({ ...formData, question_type: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="mcq">MCQ (4 Options)</option>
                  <option value="true_false">True / False</option>
                  <option value="short_answer">Short Answer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Difficulty</label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Questions Count</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={formData.num_questions}
                  onChange={(e) => setFormData({ ...formData, num_questions: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Marks Per Question</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={formData.marks_per_question}
                  onChange={(e) => setFormData({ ...formData, marks_per_question: parseFloat(e.target.value) || 1 })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Optional Study Material or Syllabus Text (Untrusted Content Sanitized)
              </label>
              <textarea
                rows={3}
                value={formData.reference_material}
                onChange={(e) => setFormData({ ...formData, reference_material: e.target.value })}
                placeholder="Paste reference text, lecture notes, or textbook excerpt here to ground questions..."
                className="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={formData.include_explanations}
                  onChange={(e) => setFormData({ ...formData, include_explanations: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span>Include detailed explanations for answer keys</span>
              </label>

              <button
                type="submit"
                disabled={isGenerating}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Generating with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Generate Questions
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Generation Metadata & Disclaimer */}
        {generationMeta && (
          <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2 text-indigo-300 font-semibold">
              <Brain className="w-4 h-4" />
              <span>Engine: {generationMeta.ai_generated ? `Live ${generationMeta.model}` : 'Curriculum Template Set'}</span>
            </div>
            {generationMeta.warning && (
              <span className="text-[11px] text-amber-300">{generationMeta.warning}</span>
            )}
          </div>
        )}

        {/* Generated Questions Review Cards */}
        {generatedQuestions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Editorial Review & Approval</h3>
                <p className="text-xs text-slate-400">
                  Review, edit, and designate correct answer options before approving into the exam.
                </p>
              </div>

              <button
                onClick={handleImportToExam}
                disabled={isImporting}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all hover:scale-105"
              >
                <CheckCircle className="w-4 h-4" />
                {isImporting ? 'Importing...' : `Approve & Import All (${generatedQuestions.length})`}
              </button>
            </div>

            <div className="space-y-4">
              {generatedQuestions.map((q, qIdx) => (
                <div key={qIdx} className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center flex-shrink-0">
                        {qIdx + 1}
                      </span>
                      <input
                        type="text"
                        value={q.question_text}
                        onChange={(e) => handleUpdateQuestionText(qIdx, e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <button
                      onClick={() => handleDeleteQuestion(qIdx)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Delete question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-9">
                    {q.options?.map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        onClick={() => handleToggleOptionCorrect(qIdx, oIdx)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between gap-2 transition-all ${
                          opt.is_correct
                            ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-slate-500 uppercase">{String.fromCharCode(65 + oIdx)}.</span>
                          <span>{opt.option_text}</span>
                        </div>
                        {opt.is_correct && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-bold uppercase flex items-center gap-1">
                            <Check className="w-3 h-3" /> Correct
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Explanation */}
                  {q.explanation && (
                    <div className="pl-9 text-xs text-slate-400">
                      <strong className="text-slate-300">Explanation:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
