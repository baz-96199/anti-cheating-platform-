import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, CameraOff, RefreshCw, AlertTriangle, CheckCircle, ShieldCheck } from 'lucide-react';

export default function WebcamCapture({ onCapture, onStreamReady, guideText = "Align your face inside the frame" }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lightingStatus, setLightingStatus] = useState({ quality: 'good', brightness: 120 });

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsLoading(false);
      if (onStreamReady) onStreamReady(mediaStream);
    } catch (err) {
      setIsLoading(false);
      let msg = "Could not access camera. Please check your browser hardware permissions.";
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = "Camera permission was denied. Please allow webcam access in your browser settings to continue.";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = "No webcam device detected on your computer. Please attach a camera.";
      }
      setCameraError(msg);
    }
  }, [onStreamReady]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Periodic lighting check on canvas
  useEffect(() => {
    if (!stream) return;
    const interval = setInterval(() => {
      if (videoRef.current && canvasRef.current && videoRef.current.readyState === 4) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = 160;
        canvas.height = 120;
        ctx.drawImage(video, 0, 0, 160, 120);

        try {
          const frameData = ctx.getImageData(0, 0, 160, 120);
          const data = frameData.data;
          let sum = 0;
          for (let i = 0; i < data.length; i += 4) {
            // Brightness = 0.299*R + 0.587*G + 0.114*B
            sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          }
          const avg = sum / (data.length / 4);
          if (avg < 45) {
            setLightingStatus({ quality: 'too_dark', brightness: Math.round(avg) });
          } else if (avg > 220) {
            setLightingStatus({ quality: 'too_bright', brightness: Math.round(avg) });
          } else {
            setLightingStatus({ quality: 'good', brightness: Math.round(avg) });
          }
        } catch {
          // ignore context errors
        }
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [stream]);

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL('image/jpeg', 0.9);
    if (onCapture) onCapture(base64);
    return base64;
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl flex flex-col items-center justify-center p-3">
      {/* Video & Guides */}
      <div className="relative w-full max-w-md aspect-[4/3] rounded-xl overflow-hidden bg-black flex items-center justify-center">
        {isLoading && (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
            <span className="text-xs">Initializing webcam feed...</span>
          </div>
        )}

        {cameraError && (
          <div className="p-6 text-center text-rose-300 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center">
              <CameraOff className="w-6 h-6 text-rose-400" />
            </div>
            <div className="text-sm font-semibold text-white">Camera Access Required</div>
            <p className="text-xs text-rose-300/80 max-w-xs">{cameraError}</p>
            <button
              onClick={startCamera}
              className="mt-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Permission
            </button>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transform scale-x-[-1] ${cameraError || isLoading ? 'hidden' : 'block'}`}
        />

        {/* Hidden capture canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Face Oval Overlay Guide */}
        {!cameraError && !isLoading && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div
              className={`w-48 h-64 border-2 rounded-[50%] transition-colors duration-300 ${
                lightingStatus.quality === 'good'
                  ? 'border-emerald-400/80 shadow-[0_0_15px_rgba(52,211,153,0.3)]'
                  : 'border-amber-400/80 shadow-[0_0_15px_rgba(251,191,36,0.3)]'
              }`}
            />
            <div className="absolute top-4 text-center px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-sm border border-slate-700 text-[11px] font-medium text-slate-200">
              {guideText}
            </div>
          </div>
        )}
      </div>

      {/* Lighting Quality & Status bar */}
      {!cameraError && !isLoading && (
        <div className="w-full max-w-md mt-3 flex items-center justify-between text-xs px-2 text-slate-400">
          <div className="flex items-center gap-1.5">
            {lightingStatus.quality === 'good' ? (
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle className="w-3.5 h-3.5" /> Optimal Lighting
              </span>
            ) : lightingStatus.quality === 'too_dark' ? (
              <span className="flex items-center gap-1 text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5" /> Environment Too Dark
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5" /> Overexposed Light
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-indigo-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" /> Biometric Ready
          </div>
        </div>
      )}

      {/* Expose capture button if handler provided */}
      {!cameraError && !isLoading && onCapture && (
        <button
          onClick={captureFrame}
          className="mt-4 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Camera className="w-4 h-4" />
          Capture Biometric Sample
        </button>
      )}
    </div>
  );
}
