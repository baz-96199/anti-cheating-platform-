import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Shield, Clock, AlertTriangle, CheckCircle, Flag, ArrowLeft,
  ArrowRight, X, RefreshCw, Send, Lock, Eye, AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { examService, proctoringService } from '../../services/api';
import ProctoringOverlay from '../../components/ProctoringOverlay';
import { useToast } from '../../context/ToastContext';

export default function ActiveExamRoom() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [savedAnswers, setSavedAnswers] = useState({});
  const [remainingSeconds, setRemainingSeconds] = useState(3600);
  const [violationCount, setViolationCount] = useState(0);
  const [warningLimit, setWarningLimit] = useState(5);
  const [latestWarning, setLatestWarning] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [isTabLocked, setIsTabLocked] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Hidden video stream for background AI proctoring telemetry
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraStream, setCameraStream] = useState(null);

  // Sound synthesizer for real-time violation warning alert
  const playAlarm = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
  }, []);

  // Load state and questions
  useEffect(() => {
    loadExamState();
  }, [attemptId]);

  const loadExamState = async () => {
    setIsLoading(true);
    try {
      const res = await examService.getState(attemptId);
      const attempt = res.data.attempt;
      if (attempt.status in ['submitted', 'evaluated']) {
        navigate(`/student/results/${attemptId}`);
        return;
      }
      setExam(attempt);
      setRemainingSeconds(res.data.remaining_seconds);
      setSavedAnswers(res.data.saved_answers || {});
      setViolationCount(res.data.violation_count || 0);
      setWarningLimit(res.data.warning_limit || 5);

      // Now fetch questions
      const startRes = await examService.start({ exam_id: attempt.exam_id });
      setQuestions(startRes.data.questions || []);
    } catch (err) {
      toast.error('Failed to restore examination session.');
      navigate('/student');
    } finally {
      setIsLoading(false);
    }
  };

  // Start background webcam capture
  useEffect(() => {
    let activeStream = null;
    const initWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: 'user' },
          audio: false
        });
        activeStream = stream;
        setCameraStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        logViolation('permission_revoked', { reason: 'Camera stream disconnected or denied' });
      }
    };
    initWebcam();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Request Fullscreen on load
  const enterFullscreen = useCallback(() => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    enterFullscreen();
  }, [enterFullscreen]);

  // Periodic proctoring telemetry frame capture (every 2.5 seconds)
  useEffect(() => {
    if (!cameraStream) return;
    const interval = setInterval(() => {
      if (videoRef.current && canvasRef.current && videoRef.current.readyState === 4) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = 320;
        canvas.height = 240;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, 320, 240);
        const b64 = canvas.toDataURL('image/jpeg', 0.65);

        proctoringService.analyzeFrame({
          attempt_id: attemptId,
          image: b64
        }).then((res) => {
          if (res.data.auto_submitted) {
            playAlarm();
            handleAutoSubmission(res.data.reason || 'Exceeded permitted proctoring violation limits.');
          } else if (res.data.event_logged) {
            playAlarm();
            setViolationCount(res.data.violation_count);
            const msg = res.data.event?.details?.message || 'Proctoring security anomaly detected.';
            triggerWarning(msg);
          }
        }).catch(() => {});
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [cameraStream, attemptId, playAlarm]);

  // Log browser-level violation
  const logViolation = async (eventType, details = {}) => {
    playAlarm();
    try {
      const res = await proctoringService.logEvent({
        attempt_id: attemptId,
        event_type: eventType,
        details
      });
      if (res.data.auto_submitted) {
        handleAutoSubmission(`Exam auto-submitted: Exceeded maximum allowed warnings (${res.data.warning_limit}).`);
      } else if (res.data.success) {
        setViolationCount(res.data.violation_count);
        const alertText = details.message || `Proctoring Policy Violation: ${eventType.replace(/_/g, ' ').toUpperCase()}`;
        triggerWarning(alertText);
      }
    } catch {
      // ignore network hiccup
    }
  };

  const triggerWarning = (msg) => {
    playAlarm();
    setLatestWarning(msg);
    toast.error(msg);
    setTimeout(() => setLatestWarning(null), 5000);
  };

  // Browser Lockdown Listeners (Visibility, Fullscreen, Shortcuts, Clipboard)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsTabLocked(true);
        logViolation('tab_switch', {
          action: 'document_hidden',
          message: 'Tab switch / background minimization detected!',
          timestamp: new Date().toISOString()
        });
      }
    };

    const handleFullscreenChange = () => {
      const isFull = Boolean(document.fullscreenElement);
      setIsFullscreen(isFull);
      if (!isFull) {
        setIsTabLocked(true);
        logViolation('fullscreen_exit', {
          action: 'fullscreen_disabled',
          message: 'Fullscreen lockdown exited! Screen unpinned.'
        });
      }
    };

    const handleWindowBlur = () => {
      setIsTabLocked(true);
      logViolation('tab_switch', {
        action: 'window_blur',
        message: 'Window focus lost! User clicked outside examination window.'
      });
    };

    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      // Block Ctrl/Cmd key combos: Copy, Paste, Cut, Select All, Print, Save, Inspect, View Source, Reload
      if (e.ctrlKey || e.metaKey) {
        if (['c', 'v', 'x', 'a', 'p', 's', 'u', 'r', 'f', 'w', 'q'].includes(key)) {
          e.preventDefault();
          e.stopPropagation();
          logViolation('copy_paste_attempt', { key: e.key, message: `Blocked shortcut Ctrl+${e.key.toUpperCase()}` });
          return false;
        }
        if (e.shiftKey && ['i', 'j', 'c', 'k', 's'].includes(key)) {
          e.preventDefault();
          e.stopPropagation();
          logViolation('restricted_shortcut', { key: `Ctrl+Shift+${e.key.toUpperCase()}`, message: 'Developer Tools shortcut blocked!' });
          return false;
        }
      }

      // Block F-keys (F12 DevTools, F11 Fullscreen, F5 Reload)
      if (['f12', 'f11', 'f5', 'f1'].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
        logViolation('restricted_shortcut', { key: e.key, message: `Function key ${e.key.toUpperCase()} blocked!` });
        return false;
      }

      // Block Alt+Tab or Windows key
      if (e.altKey || key === 'meta' || key === 'contextmenu' || key === 'printscreen') {
        e.preventDefault();
        e.stopPropagation();
        logViolation('restricted_shortcut', { key: e.key, message: `Prohibited system key ${e.key} intercepted!` });
        return false;
      }
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      logViolation('restricted_shortcut', { action: 'context_menu', message: 'Right-click context menu blocked!' });
      return false;
    };

    const handleCopy = (e) => {
      e.preventDefault();
      logViolation('copy_paste_attempt', { action: 'clipboard_copy', message: 'Clipboard copy operation blocked!' });
    };

    const handlePaste = (e) => {
      e.preventDefault();
      logViolation('copy_paste_attempt', { action: 'clipboard_paste', message: 'Clipboard paste operation blocked!' });
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Internet connection lost. Reconnecting...');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [attemptId, playAlarm]);

  // Countdown Timer
  useEffect(() => {
    if (remainingSeconds <= 0) return;
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmission('Time has expired.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingSeconds]);

  const handleAutoSubmission = async (reason) => {
    toast.error(`Auto-submitting examination: ${reason}`);
    try {
      await examService.submit({ attempt_id: attemptId, auto_submitted: true });
      navigate(`/student/results/${attemptId}`);
    } catch {
      navigate(`/student/results/${attemptId}`);
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Answer selection & autosave
  const handleSelectOption = async (qId, optId) => {
    const updated = {
      ...savedAnswers,
      [qId]: {
        ...savedAnswers[qId],
        selected_option_id: optId,
        is_answered: true
      }
    };
    setSavedAnswers(updated);
    autosaveToServer(qId, optId, updated[qId]?.text_response, updated[qId]?.is_marked_for_review);
  };

  const handleTextAnswerChange = (qId, text) => {
    const updated = {
      ...savedAnswers,
      [qId]: {
        ...savedAnswers[qId],
        text_response: text,
        is_answered: Boolean(text && text.trim().length > 0)
      }
    };
    setSavedAnswers(updated);
    autosaveToServer(qId, updated[qId]?.selected_option_id, text, updated[qId]?.is_marked_for_review);
  };

  const handleToggleMarkReview = (qId) => {
    const currentMarked = Boolean(savedAnswers[qId]?.is_marked_for_review);
    const updated = {
      ...savedAnswers,
      [qId]: {
        ...savedAnswers[qId],
        is_marked_for_review: !currentMarked
      }
    };
    setSavedAnswers(updated);
    autosaveToServer(qId, updated[qId]?.selected_option_id, updated[qId]?.text_response, !currentMarked);
  };

  const handleClearAnswer = (qId) => {
    const updated = {
      ...savedAnswers,
      [qId]: {
        ...savedAnswers[qId],
        selected_option_id: null,
        text_response: '',
        is_answered: false
      }
    };
    setSavedAnswers(updated);
    autosaveToServer(qId, null, '', updated[qId]?.is_marked_for_review);
  };

  const autosaveToServer = async (qId, selectedOptionId, textResponse, isMarked) => {
    setIsAutosaving(true);
    try {
      await examService.autosave({
        attempt_id: attemptId,
        question_id: qId,
        selected_option_id: selectedOptionId,
        text_response: textResponse,
        is_marked_for_review: isMarked
      });
    } catch {
      // retry or ignore
    } finally {
      setTimeout(() => setIsAutosaving(false), 500);
    }
  };

  const handleSubmitExam = async () => {
    setIsSubmitting(true);
    try {
      await examService.submit({ attempt_id: attemptId, auto_submitted: false });
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
      toast.success('Examination submitted and evaluated successfully!');
      navigate(`/student/results/${attemptId}`);
    } catch (err) {
      toast.error('Failed to submit exam.');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const currentQ = questions[currentIdx];
  const currentAns = currentQ ? savedAnswers[currentQ.id] : null;

  // Stats for palette
  const answeredCount = Object.values(savedAnswers).filter((a) => a?.is_answered).length;
  const markedCount = Object.values(savedAnswers).filter((a) => a?.is_marked_for_review).length;
  const unansweredCount = Math.max(0, questions.length - answeredCount);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col select-none overflow-hidden">
      {/* Hidden background camera elements */}
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      {/* Proctoring HUD PIP Overlay */}
      <ProctoringOverlay
        stream={cameraStream}
        violationCount={violationCount}
        warningLimit={warningLimit}
        latestWarning={latestWarning}
        isFullscreen={isFullscreen}
        isOnline={isOnline}
      />

      {/* Examination Top Bar */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 flex items-center justify-between z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-sm text-white leading-tight">
              {exam?.exam_title || 'Examination Assessment'}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-2">
              <span>Candidate: <strong className="text-slate-300">{exam?.student_name}</strong></span>
              <span>•</span>
              <span className="text-emerald-400 flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {isAutosaving ? 'Autosaving...' : 'All answers autosaved'}
              </span>
            </div>
          </div>
        </div>

        {/* Right side: Countdown Timer & Submit */}
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-mono font-bold shadow-inner ${
            remainingSeconds < 300
              ? 'bg-rose-950/80 border-rose-500/50 text-rose-300 animate-pulse'
              : 'bg-slate-950 border-slate-800 text-indigo-300'
          }`}>
            <Clock className="w-4 h-4 text-indigo-400" />
            <span className="text-sm">{formatTimer(remainingSeconds)}</span>
          </div>

          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95"
          >
            <Send className="w-3.5 h-3.5" /> Submit Examination
          </button>
        </div>
      </header>

      {/* Main Examination Workspace */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-hidden">
        {/* Left: Active Question Area (3 cols) */}
        <div className="lg:col-span-3 flex flex-col justify-between rounded-3xl bg-slate-900/70 border border-slate-800 p-6 sm:p-8 shadow-xl">
          {currentQ ? (
            <div className="space-y-6">
              {/* Question Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-lg bg-indigo-600 text-white font-extrabold text-xs">
                    Question {currentIdx + 1} of {questions.length}
                  </span>
                  <span className="text-xs text-slate-400 uppercase font-semibold">
                    {currentQ.question_type.replace('_', ' ')}
                  </span>
                  {currentQ.topic && (
                    <span className="text-xs text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                      {currentQ.topic}
                    </span>
                  )}
                </div>

                <div className="text-xs font-bold text-slate-300">
                  Marks: <span className="text-indigo-400">{currentQ.marks}</span>
                </div>
              </div>

              {/* Question Text */}
              <div className="text-sm sm:text-base font-medium text-white leading-relaxed">
                {currentQ.question_text}
              </div>

              {/* Options / Input */}
              {currentQ.question_type === 'short_answer' ? (
                <div className="space-y-2">
                  <label className="text-xs text-slate-400 font-semibold">Your Response:</label>
                  <textarea
                    rows={6}
                    value={currentAns?.text_response || ''}
                    onChange={(e) => handleTextAnswerChange(currentQ.id, e.target.value)}
                    placeholder="Type your explanation or solution here..."
                    className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-indigo-500 leading-relaxed resize-none"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  {currentQ.options?.map((opt, oIdx) => {
                    const isSelected = currentAns?.selected_option_id === opt.id;
                    const letter = String.fromCharCode(65 + oIdx);
                    return (
                      <div
                        key={opt.id}
                        onClick={() => handleSelectOption(currentQ.id, opt.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5 ${
                          isSelected
                            ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-600/10'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-950'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-900 border border-slate-800 text-slate-400'
                          }`}
                        >
                          {letter}
                        </div>
                        <div className="text-xs sm:text-sm leading-relaxed">{opt.option_text}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 text-slate-500">No questions loaded.</div>
          )}

          {/* Navigation Controls Bar */}
          <div className="pt-6 border-t border-slate-800 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleToggleMarkReview(currentQ.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  currentAns?.is_marked_for_review
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-950 hover:bg-slate-800 border border-slate-800 text-amber-400'
                }`}
              >
                <Flag className="w-3.5 h-3.5" />
                {currentAns?.is_marked_for_review ? 'Marked for Review' : 'Mark for Review'}
              </button>

              <button
                onClick={() => handleClearAnswer(currentQ.id)}
                className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-400 hover:text-white transition-colors"
              >
                Clear Answer
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 disabled:opacity-30 border border-slate-800 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Previous
              </button>

              <button
                disabled={currentIdx === questions.length - 1}
                onClick={() => setCurrentIdx((prev) => Math.min(questions.length - 1, prev + 1))}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-xs font-semibold text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-colors"
              >
                Next <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Question Palette & Overview (1 col) */}
        <div className="rounded-3xl bg-slate-900/70 border border-slate-800 p-6 flex flex-col justify-between shadow-xl">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Question Palette</h3>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 text-[11px] mb-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="w-3 h-3 rounded bg-indigo-600 inline-block" /> Answered ({answeredCount})
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="w-3 h-3 rounded bg-slate-950 border border-slate-800 inline-block" /> Unanswered ({unansweredCount})
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="w-3 h-3 rounded bg-amber-500 inline-block" /> Review ({markedCount})
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="w-3 h-3 rounded border-2 border-indigo-400 inline-block" /> Current
              </div>
            </div>

            {/* Questions Number Grid */}
            <div className="grid grid-cols-5 gap-2 max-h-64 overflow-y-auto pr-1">
              {questions.map((q, idx) => {
                const ans = savedAnswers[q.id];
                const isCurrent = idx === currentIdx;
                const isAnswered = ans?.is_answered;
                const isMarked = ans?.is_marked_for_review;

                let bgClass = 'bg-slate-950 border-slate-800 text-slate-400';
                if (isMarked) bgClass = 'bg-amber-500 text-slate-950 font-bold border-amber-400';
                else if (isAnswered) bgClass = 'bg-indigo-600 text-white font-bold border-indigo-500';

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIdx(idx)}
                    className={`h-9 rounded-xl border text-xs flex items-center justify-center transition-all ${bgClass} ${
                      isCurrent ? 'ring-2 ring-indigo-400 scale-105' : 'hover:border-slate-600'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800">
            <button
              onClick={() => setShowSubmitModal(true)}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all"
            >
              Finish & Submit Test
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="font-bold text-sm text-white flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" /> Confirm Exam Submission
              </div>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to finalize your examination? Once submitted, answers will be evaluated on the server and you cannot modify responses.
            </p>

            <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center text-xs">
              <div>
                <div className="text-[10px] text-slate-500 uppercase">Answered</div>
                <div className="text-base font-bold text-emerald-400">{answeredCount}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase">Unanswered</div>
                <div className="text-base font-bold text-slate-400">{unansweredCount}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase">Marked</div>
                <div className="text-base font-bold text-amber-400">{markedCount}</div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Resume Test
              </button>
              <button
                onClick={handleSubmitExam}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-emerald-600/30"
              >
                {isSubmitting ? 'Submitting...' : 'Yes, Submit Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen & Tab Switch Lockdown Warning Modal */}
      {isTabLocked && (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-6 text-center">
          <div className="max-w-lg w-full p-8 rounded-3xl bg-slate-900 border-2 border-rose-500 shadow-2xl shadow-rose-950/80 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-600/20 border border-rose-500 flex items-center justify-center animate-pulse">
              <AlertTriangle className="w-8 h-8 text-rose-500" />
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              SECURITY LOCKDOWN: FOCUS LOSS / TAB SWITCH DETECTED
            </h2>
            <p className="text-xs text-rose-200/90 leading-relaxed">
              You navigated away from the exam window or switched applications. This action is strictly prohibited under institutional integrity rules and has been <strong>recorded into your permanent proctoring audit log</strong>.
            </p>
            <div className="px-4 py-2 rounded-xl bg-slate-950 border border-rose-500/40 text-xs text-rose-300 font-mono">
              Recorded Violations: <strong className="text-white text-sm">{violationCount}</strong> / {warningLimit} allowed warnings
            </div>
            <button
              onClick={() => {
                setIsTabLocked(false);
                enterFullscreen();
              }}
              className="mt-2 px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/40 transition-all hover:scale-105"
            >
              Resume Examination (Return to Fullscreen)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
