import React, { useRef, useEffect, useState } from 'react';
import { Shield, AlertTriangle, Maximize2, Wifi, WifiOff, Eye, Smartphone, Crosshair, AlertOctagon } from 'lucide-react';

export default function ProctoringOverlay({
  stream,
  violationCount = 0,
  warningLimit = 5,
  latestWarning = null,
  isFullscreen = true,
  isOnline = true,
  telemetry = {}
}) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const warningRatio = Math.min(1, violationCount / (warningLimit || 1));
  const isAlarm = Boolean(latestWarning) || violationCount >= warningLimit - 1;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none select-none">
      {/* High-Visibility Violation Warning Banner */}
      {latestWarning && (
        <div className="pointer-events-auto max-w-sm p-3.5 rounded-2xl bg-rose-950/95 border-2 border-rose-500 shadow-2xl backdrop-blur-xl text-rose-100 text-xs font-medium flex items-start gap-3 animate-bounce">
          <div className="w-8 h-8 rounded-xl bg-rose-600/30 border border-rose-500 flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertOctagon className="w-4 h-4 text-rose-400 animate-pulse" />
          </div>
          <div className="flex-1">
            <div className="font-extrabold text-white text-[13px] flex items-center justify-between">
              <span>SECURITY INFRACTION</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-500 text-white font-mono">
                {violationCount} / {warningLimit}
              </span>
            </div>
            <div className="text-[11px] leading-snug mt-1 text-rose-200">{latestWarning}</div>
          </div>
        </div>
      )}

      {/* Proctoring HUD Card */}
      <div className={`pointer-events-auto bg-slate-950/95 border ${isAlarm ? 'border-rose-500 shadow-rose-950/50' : 'border-indigo-500/40'} rounded-2xl shadow-2xl p-3 backdrop-blur-xl flex flex-col gap-2.5 w-64 transition-all duration-300`}>
        {/* Header bar */}
        <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-800">
          <div className="flex items-center gap-1.5 font-bold text-slate-100">
            <span className={`w-2 h-2 rounded-full ${isAlarm ? 'bg-rose-500 animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[11px] tracking-wider uppercase font-mono">AI Proctor HUD</span>
          </div>
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-950/60 border border-indigo-700/50 text-[10px] text-indigo-300 font-mono">
            <Eye className="w-3 h-3 text-emerald-400" /> Live Vision
          </div>
        </div>

        {/* Video feed with AI Target Reticle */}
        <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center">
          {stream ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform scale-x-[-1]"
            />
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-slate-500 text-[10px]">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              <span>Camera Stream Initializing...</span>
            </div>
          )}

          {/* AI Face Reticle Corners */}
          <div className="absolute inset-2 pointer-events-none border border-indigo-500/30 rounded-lg flex items-center justify-center">
            <div className="w-20 h-28 border border-dashed border-emerald-400/60 rounded-full flex items-center justify-center">
              <Crosshair className="w-4 h-4 text-emerald-400/40" />
            </div>
          </div>

          {/* Floating AI Chips */}
          <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-sm border border-slate-700/60 text-[9px] font-semibold text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Face: Tracked
          </div>

          <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-sm border border-slate-700/60 text-[9px] font-semibold text-indigo-300 font-mono">
            <Smartphone className="w-2.5 h-2.5 text-indigo-400" /> Device Guard: ON
          </div>
        </div>

        {/* Warning gauge */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Warning Threshold:</span>
            <span className={`font-mono font-bold ${violationCount >= warningLimit - 1 ? 'text-rose-400' : (violationCount > 0 ? 'text-amber-400' : 'text-emerald-400')}`}>
              {violationCount} / {warningLimit} Violations
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-300 ${
                warningRatio > 0.7 ? 'bg-rose-500' : (warningRatio > 0.3 ? 'bg-amber-500' : 'bg-emerald-500')
              }`}
              style={{ width: `${Math.max(5, warningRatio * 100)}%` }}
            />
          </div>
        </div>

        {/* Status indicators */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px] text-slate-400">
          <div className="flex items-center gap-1 font-mono">
            {isFullscreen ? (
              <span className="flex items-center gap-1 text-emerald-400">
                <Maximize2 className="w-3 h-3" /> Lockdown ON
              </span>
            ) : (
              <span className="flex items-center gap-1 text-rose-400 font-bold">
                <Maximize2 className="w-3 h-3" /> Exited Fullscreen!
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 font-mono">
            {isOnline ? (
              <span className="flex items-center gap-1 text-emerald-400">
                <Wifi className="w-3 h-3" /> Synchronized
              </span>
            ) : (
              <span className="flex items-center gap-1 text-rose-400 font-bold">
                <WifiOff className="w-3 h-3" /> Offline
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
