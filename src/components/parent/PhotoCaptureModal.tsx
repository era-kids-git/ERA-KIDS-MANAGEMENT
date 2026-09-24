import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, SwitchCamera, X, Check, RotateCcw, AlertCircle, Upload } from 'lucide-react';

interface PhotoCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (photoBase64: string) => void;
}

export const PhotoCaptureModal: React.FC<PhotoCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoadingCamera, setIsLoadingCamera] = useState<boolean>(true);

  // Stop current video stream
  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const curStream = videoRef.current.srcObject as MediaStream;
      curStream.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  // Start video stream
  const startCamera = useCallback(async (mode: 'user' | 'environment') => {
    setIsLoadingCamera(true);
    setCameraError(null);
    setCapturedImage(null);

    // Stop existing streams first to free up camera hardware
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const curStream = videoRef.current.srcObject as MediaStream;
      curStream.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser tidak mendukung akses kamera langsung. Silakan gunakan tombol kamera bawaan.');
      }

      let newStream: MediaStream;
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
      } catch {
        // Fallback: try direct facingMode string or general video
        try {
          newStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: mode },
            audio: false
          });
        } catch {
          newStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        }
      }

      setStream(newStream);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.play().catch(() => {});
      }
      setIsLoadingCamera(false);
    } catch (err: any) {
      console.warn('Camera access error:', err);
      let msg = 'Gagal mengakses kamera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Izin kamera ditolak. Berikan izin kamera di browser Anda atau gunakan tombol kamera bawaan HP.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'Tidak ada perangkat kamera yang ditemukan.';
      } else {
        msg = err.message || 'Kamera tidak dapat diaktifkan.';
      }
      setCameraError(msg);
      setIsLoadingCamera(false);
    }
  }, [stream]);

  // Handle open/close lifecycle
  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      startCamera(facingMode);
    } else {
      stopStream();
    }

    return () => {
      stopStream();
    };
  }, [isOpen]);

  // Switch camera facing mode
  const handleSwitchCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const handleSelectFacingMode = (mode: 'user' | 'environment') => {
    if (mode === facingMode && stream) return;
    setFacingMode(mode);
    startCamera(mode);
  };

  // Capture photo from video stream with 3x4 portrait aspect ratio
  const handleTakePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = canvasRef.current || document.createElement('canvas');
    
    // Target 3:4 aspect ratio portrait
    const targetWidth = 600;
    const targetHeight = 800; // 3:4 ratio

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate center crop from video stream
    const vWidth = video.videoWidth;
    const vHeight = video.videoHeight;
    const videoRatio = vWidth / vHeight;
    const targetRatio = targetWidth / targetHeight; // 0.75

    let sX = 0;
    let sY = 0;
    let sWidth = vWidth;
    let sHeight = vHeight;

    if (videoRatio > targetRatio) {
      // Video is wider than 3:4 -> crop horizontally
      sWidth = vHeight * targetRatio;
      sX = (vWidth - sWidth) / 2;
    } else {
      // Video is taller than 3:4 -> crop vertically
      sHeight = vWidth / targetRatio;
      sY = (vHeight - sHeight) / 2;
    }

    // Mirror image if front camera for natural selfie orientation
    if (facingMode === 'user') {
      ctx.translate(targetWidth, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, sX, sY, sWidth, sHeight, 0, 0, targetWidth, targetHeight);

    const base64 = canvas.toDataURL('image/jpeg', 0.88);
    setCapturedImage(base64);
    stopStream();
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedImage(null);
    startCamera(facingMode);
  };

  // Confirm photo
  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      onClose();
    }
  };

  // Fallback native camera file upload
  const handleNativeCameraFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const targetWidth = 600;
        const targetHeight = 800;
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Crop center 3:4
          const iRatio = img.width / img.height;
          const tRatio = 3 / 4;
          let sx = 0, sy = 0, sw = img.width, sh = img.height;
          if (iRatio > tRatio) {
            sw = img.height * tRatio;
            sx = (img.width - sw) / 2;
          } else {
            sh = img.width / tRatio;
            sy = (img.height - sh) / 2;
          }
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          onCapture(compressed);
          onClose();
        } else {
          onCapture(dataUrl);
          onClose();
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-x-hidden">
      <div className="bg-slate-900 border-0 sm:border border-slate-700 rounded-t-3xl sm:rounded-2xl w-full max-w-full sm:max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[96vh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Camera className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm">Kamera Pas Foto 3x4</h3>
              <p className="text-[10px] text-slate-400">Posisikan wajah & bahu di dalam bingkai</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dual Camera Mode Selector Toolbar (Belakang / Depan) */}
        {!capturedImage && (
          <div className="bg-slate-950 px-3 py-2 border-b border-slate-800 flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400 font-medium">
              Pilihan Sisi Kamera:
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                id="btn-facing-environment"
                onClick={() => handleSelectFacingMode('environment')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  facingMode === 'environment'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
                title="Gunakan Kamera Belakang"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Kamera Belakang</span>
              </button>
              <button
                type="button"
                id="btn-facing-user"
                onClick={() => handleSelectFacingMode('user')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  facingMode === 'user'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
                title="Gunakan Kamera Depan (Selfie)"
              >
                <SwitchCamera className="w-3.5 h-3.5" />
                <span>Kamera Depan</span>
              </button>
            </div>
          </div>
        )}

        {/* Viewfinder or Captured Preview */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[300px] sm:min-h-[360px] overflow-hidden">
          {capturedImage ? (
            <div className="relative w-full h-full flex items-center justify-center p-4">
              <div className="w-44 h-58 sm:w-48 sm:h-64 rounded-xl overflow-hidden shadow-2xl border-2 border-indigo-500 bg-black">
                <img
                  src={capturedImage}
                  alt="Hasil Pas Foto"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                <Check className="w-3 h-3" />
                Pas Foto Siap
              </div>
            </div>
          ) : cameraError ? (
            <div className="p-6 text-center text-slate-300 max-w-xs mx-auto space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{cameraError}</p>
              
              {/* Native camera fallback buttons */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.setAttribute('capture', 'environment');
                      fileInputRef.current.click();
                    }
                  }}
                  className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <Camera className="w-4 h-4" />
                  Kamera Belakang HP
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.setAttribute('capture', 'user');
                      fileInputRef.current.click();
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <SwitchCamera className="w-4 h-4" />
                  Kamera Depan HP (Selfie)
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture={facingMode === 'environment' ? 'environment' : 'user'}
                  className="hidden"
                  onChange={handleNativeCameraFile}
                />
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Video Element */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover min-h-[300px] sm:min-h-[360px] ${
                  facingMode === 'user' ? 'scale-x-[-1]' : ''
                }`}
              />

              {/* Active Camera Indicator Badge */}
              <div className="absolute top-3 left-3 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-lg backdrop-blur-xs border border-white/10 flex items-center gap-1 pointer-events-none">
                {facingMode === 'environment' ? (
                  <>
                    <Camera className="w-3 h-3 text-indigo-400" />
                    <span>Kamera Belakang</span>
                  </>
                ) : (
                  <>
                    <SwitchCamera className="w-3 h-3 text-pink-400" />
                    <span>Kamera Depan</span>
                  </>
                )}
              </div>

              {/* 3:4 Oval & Frame Guideline Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4">
                <div className="w-44 h-58 sm:w-48 sm:h-64 rounded-2xl border-2 border-dashed border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] relative flex flex-col items-center justify-between p-2">
                  <span className="text-[10px] font-bold text-white bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-xs">
                    Pas Foto 3 x 4
                  </span>
                  {/* Subtle face guideline oval */}
                  <div className="w-24 h-32 rounded-full border border-white/40 mb-3" />
                  <span className="text-[9px] text-white/90 bg-black/50 px-2 py-0.5 rounded">
                    Tegak & Menghadap Kamera
                  </span>
                </div>
              </div>

              {/* Switch Camera Button (Front / Rear) */}
              <button
                type="button"
                onClick={handleSwitchCamera}
                title={`Ganti ke ${facingMode === 'user' ? 'Kamera Belakang' : 'Kamera Depan'}`}
                className="absolute top-3 right-3 px-2 py-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs border border-white/20 transition-all active:scale-95 flex items-center gap-1 text-[11px] font-bold"
              >
                <SwitchCamera className="w-3.5 h-3.5" />
                <span className="text-[10px] hidden xs:inline">{facingMode === 'user' ? 'Belakang' : 'Depan'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="p-3 sm:p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2">
          {capturedImage ? (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Foto Ulang
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                Gunakan Pas Foto
              </button>
            </>
          ) : !cameraError ? (
            <>
              {/* Native camera secondary option */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 transition-colors"
                title="Gunakan Kamera Bawaan Perangkat"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="text-[11px] hidden sm:inline">Kamera HP</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={handleNativeCameraFile}
              />

              {/* Primary Shutter Button */}
              <button
                type="button"
                onClick={handleTakePhoto}
                disabled={isLoadingCamera}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
                <span>Ambil Foto</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-colors"
              >
                Batal
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors text-center"
            >
              Tutup
            </button>
          )}
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
