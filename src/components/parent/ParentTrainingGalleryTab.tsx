import React, { useState, useMemo } from 'react';
import { 
  Camera, 
  Download, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  CheckCircle2, 
  Sparkles, 
  Maximize2, 
  X, 
  Video, 
  Grid3X3,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';
import { TrainingSession, MediaDocumentation } from '../../types.ts';
import { 
  getMediaRemainingDays, 
  isMediaExpired, 
  getMediaExpiryDate, 
  MEDIA_RETENTION_DAYS 
} from '../../utils/mediaRetention';
import { EraKidsLogo } from '../common/EraKidsLogo';

interface ParentTrainingGalleryTabProps {
  sessions: TrainingSession[];
  initialSessionId?: string | null;
}

export const ParentTrainingGalleryTab: React.FC<ParentTrainingGalleryTabProps> = ({
  sessions,
  initialSessionId
}) => {
  // Select active session: prefer initialSessionId, else latest session
  const [selectedSessionId, setSelectedSessionId] = useState<string>(() => {
    if (initialSessionId && sessions.some(s => s.id === initialSessionId)) {
      return initialSessionId;
    }
    return sessions.length > 0 ? sessions[0].id : '';
  });

  // Synchronize selectedSessionId whenever sessions list arrives from Firestore
  React.useEffect(() => {
    if (sessions.length > 0) {
      if (!selectedSessionId || !sessions.some(s => s.id === selectedSessionId)) {
        const target = initialSessionId && sessions.some(s => s.id === initialSessionId)
          ? initialSessionId
          : sessions[0].id;
        setSelectedSessionId(target);
      }
    }
  }, [sessions, initialSessionId, selectedSessionId]);

  // Lightbox preview modal
  const [previewMedia, setPreviewMedia] = useState<MediaDocumentation | null>(null);

  // Mobile density toggle: 'compact' (3-4 cols on mobile) or 'cozy' (2 cols on mobile)
  const [galleryDensity, setGalleryDensity] = useState<'compact' | 'cozy'>('compact');

  // Get currently selected session
  const currentSession = useMemo(() => {
    return sessions.find(s => s.id === selectedSessionId) || sessions[0] || null;
  }, [sessions, selectedSessionId]);

  // Format date in Indonesian
  const formatIndonesianDate = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Safe file downloader for both base64 and web URLs
  const handleDownloadMedia = async (url: string, name: string) => {
    try {
      if (url.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = url;
        link.download = name || `ERA_Kids_Dokumentasi_${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      // Fetch as blob for cross-origin or remote images
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = name || `ERA_Kids_Dokumentasi_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
    } catch (e) {
      console.warn('Download fallback to new tab:', e);
      window.open(url, '_blank');
    }
  };

  // Compile media items from session
  const mediaItems: MediaDocumentation[] = useMemo(() => {
    if (!currentSession) return [];
    const list: MediaDocumentation[] = [];
    if (currentSession.documentationMedia && currentSession.documentationMedia.length > 0) {
      currentSession.documentationMedia.forEach(m => {
        if (m && m.url && typeof m.url === 'string' && m.url.trim().length > 0) {
          list.push(m);
        }
      });
    }
    if (list.length === 0 && currentSession.photos && currentSession.photos.length > 0) {
      currentSession.photos.forEach((p, idx) => {
        if (p && typeof p === 'string' && p.trim().length > 0) {
          list.push({
            id: `photo_${idx}`,
            type: 'photo' as const,
            url: p,
            name: `Foto Latihan #${idx + 1}`,
            sizeFormatted: 'Standar HD',
            uploadedAt: currentSession.createdAt || new Date().toISOString()
          });
        }
      });
    }
    return list;
  }, [currentSession]);

  // Generate distinct filename with photo / video number so each file is uniquely numbered
  const getDownloadFileName = (media: MediaDocumentation, index?: number): string => {
    const idx = index !== undefined && index >= 0 
      ? index 
      : mediaItems.findIndex(m => m.id === media.id || m.url === media.url);
    const mediaNumber = idx >= 0 ? idx + 1 : 1;
    const paddedNumber = String(mediaNumber).padStart(2, '0');
    
    const isVideo = media.type === 'video';
    const ext = isVideo ? 'mp4' : 'jpg';
    
    // Format session date for clean filename, e.g. 2026-09-19
    const dateStr = currentSession?.date 
      ? currentSession.date.replace(/[^a-zA-Z0-9]/g, '-') 
      : 'Latihan';
      
    return isVideo 
      ? `ERA_Kids_Video_${paddedNumber}_${dateStr}.${ext}`
      : `ERA_Kids_Foto_${paddedNumber}_${dateStr}.${ext}`;
  };

  // Index of currently previewed media
  const previewIndex = useMemo(() => {
    if (!previewMedia) return -1;
    return mediaItems.findIndex(m => m.id === previewMedia.id || m.url === previewMedia.url);
  }, [mediaItems, previewMedia]);

  const handlePrevMedia = () => {
    if (previewIndex > 0) {
      setPreviewMedia(mediaItems[previewIndex - 1]);
    }
  };

  const handleNextMedia = () => {
    if (previewIndex >= 0 && previewIndex < mediaItems.length - 1) {
      setPreviewMedia(mediaItems[previewIndex + 1]);
    }
  };

  if (sessions.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-3">
        <div className="w-16 h-16 flex items-center justify-center mx-auto">
          <EraKidsLogo className="w-14 h-14" />
        </div>
        <h3 className="text-base font-bold text-slate-900">
          Belum Ada Dokumentasi Sesi Latihan
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          Dokumentasi foto dan rekaman latihan di <strong>GOR VOLI KUBA</strong> akan diunggah oleh Pelatih / Admin ERA Kids setelah setiap sesi latihan selesai.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 w-full max-w-full overflow-x-hidden">
      {/* 1. TOP HEADER & INSTRUCTION BANNER */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm border border-indigo-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center text-lg sm:text-xl shadow-xs shrink-0">
              📸
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-sm sm:text-lg font-black tracking-tight text-white">
                  Galeri & Foto Latihan Anak
                </h2>
                <span className="text-[9.5px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 whitespace-nowrap">
                  Resmi ERA Kids
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 leading-tight">
                Pilih sesi latihan di bawah ini untuk melihat dan mengunduh foto anak.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="text-[10px] sm:text-[11px] text-amber-200 bg-amber-500/15 px-2.5 py-1 rounded-lg sm:rounded-xl border border-amber-400/30 flex items-center gap-1.5 self-start sm:self-auto shrink-0" title="Foto dan video galeri otomatis dibersihkan setiap 3 minggu (21 hari) dari tanggal sesi">
              <Clock className="w-3 h-3 text-amber-400 shrink-0" />
              <span>Auto-Hapus 3 Minggu (21 Hari)</span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-indigo-200 bg-indigo-900/60 px-2.5 py-1 rounded-lg sm:rounded-xl border border-indigo-400/25 flex items-center gap-1.5 self-start sm:self-auto shrink-0">
              <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
              <span>Kualitas Asli (Bebas Watermark)</span>
            </div>
          </div>
        </div>

        {/* SESSION PICKER TABS / PILLS */}
        <div className="mt-3 pt-2.5 border-t border-indigo-500/30 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs -mx-1 px-1">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-0.5">
            Pilih Sesi:
          </span>
          {sessions.map(s => {
            const isSelected = (currentSession && currentSession.id === s.id) || selectedSessionId === s.id;
            const photoCount = s.documentationMedia?.length || s.photos?.length || 0;

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedSessionId(s.id)}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0 text-xs ${
                  isSelected
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'bg-indigo-900/80 hover:bg-indigo-800 text-slate-200 border border-indigo-500/30'
                }`}
              >
                <span>{s.sessionTitle || 'Sesi Latihan'}</span>
                <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-mono ${
                  isSelected ? 'bg-amber-500 text-slate-950 font-black' : 'bg-indigo-950/80 text-indigo-300'
                }`}>
                  {s.date}
                </span>
                {photoCount > 0 && (
                  <span className="text-[9.5px] opacity-85">
                    ({photoCount} 📸)
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. CURRENT SELECTED SESSION DETAILS */}
      {currentSession && (
        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-2xs border border-slate-200/80 space-y-3 sm:space-y-4">
          {/* Metadata Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                  {currentSession.sessionTitle}
                </h3>
                <span className="text-[11px] sm:text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {formatIndonesianDate(currentSession.date)}
                </span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-slate-600 mt-1 flex-wrap">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {currentSession.timeRange || '18.45 - 21.00 WIB'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  {currentSession.location || 'GOR VOLI KUBA'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-semibold text-indigo-900">
                  <User className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  Coach {currentSession.coachName || 'Riviansyah'}
                </span>
              </div>
            </div>

            {/* Attendance Quick Count */}
            {currentSession.summary && (
              <div className="flex items-center gap-1.5 self-start sm:self-auto text-[11px] sm:text-xs font-bold flex-wrap">
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200">
                  {currentSession.summary.hadir} Hadir
                </span>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                  {currentSession.summary.izin} Izin
                </span>
                <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded-md border border-rose-200">
                  {currentSession.summary.tidakHadir ?? ((currentSession.summary.alpa || 0) + (currentSession.summary.sakit || 0))} Tidak Hadir
                </span>
              </div>
            )}
          </div>

          {/* 3. PHOTO & VIDEO GALLERY GRID - COMPACT FOR MOBILE */}
          <div>
            {/* Retention Notice Banner when media is present */}
            {mediaItems.length > 0 && (() => {
              const remainingDays = getMediaRemainingDays(undefined, currentSession.date, currentSession.createdAt);
              return (
                <div className="mb-2.5 px-3 py-1.5 rounded-lg bg-amber-50/90 border border-amber-200/80 text-[11px] text-amber-900 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>
                      Masa simpan foto: <strong>tersisa {remainingDays} hari lagi</strong> (otomatis terhapus setelah 3 minggu).
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded font-semibold">
                    Simpan/unduh foto anak ke galeri HP
                  </span>
                </div>
              );
            })()}

            <div className="flex items-center justify-between gap-1 mb-2">
              <div className="flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <h4 className="font-extrabold text-xs sm:text-sm text-slate-900">
                  Foto Dokumentasi ({mediaItems.length} Foto)
                </h4>
              </div>

              {/* Density toggle for mobile: compact (3-4 cols) vs cozy (2 cols) */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setGalleryDensity('compact')}
                  className={`px-2 py-1 rounded text-[10px] font-semibold flex items-center gap-1 transition-all ${
                    galleryDensity === 'compact'
                      ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  title="Grid kecil: 3-4 foto per baris, hemat scroll di HP"
                >
                  <Grid3X3 className="w-3 h-3 shrink-0" />
                  <span className="hidden sm:inline">Kecil (3-4 Kolom)</span>
                  <span className="sm:hidden">Kecil</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGalleryDensity('cozy')}
                  className={`px-2 py-1 rounded text-[10px] font-semibold flex items-center gap-1 transition-all ${
                    galleryDensity === 'cozy'
                      ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  title="Grid sedang: 2 kolom foto"
                >
                  <LayoutGrid className="w-3 h-3 shrink-0" />
                  <span className="hidden sm:inline">Sedang (2 Kolom)</span>
                  <span className="sm:hidden">Sedang</span>
                </button>
              </div>
            </div>

            {mediaItems.length === 0 ? (
              isMediaExpired(undefined, currentSession.date, currentSession.createdAt) ? (
                <div className="py-7 px-4 rounded-xl bg-amber-50/60 border border-dashed border-amber-200 text-center space-y-1.5">
                  <div className="w-10 h-10 mx-auto rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-lg">
                    ⏳
                  </div>
                  <p className="text-xs font-bold text-amber-900">
                    Dokumentasi Sesi Telah Melewati Batas Simpan 3 Minggu (21 Hari)
                  </p>
                  <p className="text-[11px] text-amber-700/90 max-w-md mx-auto leading-relaxed">
                    Sesuai kebijakan sistem, file foto dan video latihan otomatis dihapus dari database setiap 3 minggu sejak tanggal sesi ({formatIndonesianDate(currentSession.date)}) untuk menjaga kebersihan dan efisiensi penyimpanan server.
                  </p>
                </div>
              ) : (
                <div className="py-8 px-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-1.5">
                  <div className="text-2xl">📷</div>
                  <p className="text-xs font-semibold text-slate-600">
                    Belum ada foto yang diunggah untuk sesi {currentSession.sessionTitle} ({currentSession.date}).
                  </p>
                  <p className="text-[10.5px] text-slate-400">
                    Pelatih / Admin ERA Kids akan mengunggah foto saat atau sesudah sesi selesai.
                  </p>
                </div>
              )
            ) : (
              <div className={`grid gap-1.5 sm:gap-2.5 ${
                galleryDensity === 'compact'
                  ? 'grid-cols-3 min-[440px]:grid-cols-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6'
                  : 'grid-cols-2 min-[440px]:grid-cols-3 sm:grid-cols-3 md:grid-cols-4'
              }`}>
                {mediaItems.map((media, idx) => {
                  const isVideo = media.type === 'video';

                  return (
                    <div
                      key={media.id || idx}
                      className="bg-slate-900 rounded-lg sm:rounded-xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md transition-all group relative aspect-square flex flex-col justify-end"
                    >
                      {/* Media Display */}
                      <div 
                        className="absolute inset-0 bg-slate-950 cursor-pointer overflow-hidden"
                        onClick={() => setPreviewMedia(media)}
                      >
                        {isVideo ? (
                          <div className="w-full h-full relative flex items-center justify-center">
                            <video
                              src={media.url}
                              className="w-full h-full object-cover"
                              preload="metadata"
                            />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <div className="w-8 h-8 rounded-full bg-slate-900/80 text-white flex items-center justify-center backdrop-blur-xs border border-white/20">
                                <Video className="w-4 h-4" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <img
                            src={media.url}
                            alt={media.name || `Dokumentasi Latihan ${idx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            loading="lazy"
                          />
                        )}
                      </div>

                      {/* Top Label */}
                      <span className="absolute top-1 left-1 px-1 py-0.2 rounded bg-slate-950/75 text-white text-[8px] sm:text-[9px] font-bold font-mono backdrop-blur-xs pointer-events-none z-10">
                        {isVideo ? `VIDEO #${idx + 1}` : `#${idx + 1}`}
                      </span>

                      {/* Zoom Trigger for Media */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewMedia(media);
                        }}
                        className="absolute top-1 right-1 p-1 rounded bg-slate-950/75 hover:bg-slate-900 text-white backdrop-blur-xs transition-opacity shadow-xs z-10"
                        title={isVideo ? "Buka Pratinjau Video" : "Perbesar Tampilan Foto"}
                      >
                        <Maximize2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </button>

                      {/* Bottom Direct Download Overlay - Compact */}
                      <div className="relative z-10 p-1 sm:p-1.5 flex items-center justify-between gap-1 bg-gradient-to-t from-black/85 via-black/45 to-transparent pointer-events-auto">
                        <span className="text-[8px] sm:text-[9px] text-white/90 font-medium truncate drop-shadow-xs max-w-[55%]">
                          {media.sizeFormatted || 'HD'}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadMedia(media.url, getDownloadFileName(media, idx));
                          }}
                          className="p-1 sm:px-1.5 sm:py-0.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded text-[8.5px] sm:text-[9.5px] font-bold transition-all flex items-center gap-0.5 shadow-2xs shrink-0"
                          title={isVideo ? `Unduh video #${idx + 1} ke HP` : `Unduh foto #${idx + 1} ke HP`}
                        >
                          <Download className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
                          <span className="hidden min-[400px]:inline">Unduh</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. LIGHTBOX / ZOOM PHOTO & VIDEO MODAL */}
      {previewMedia && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/90 backdrop-blur-xs overflow-x-hidden"
          onClick={() => setPreviewMedia(null)}
        >
          <div 
            className="bg-slate-900 rounded-none sm:rounded-2xl max-w-full sm:max-w-3xl w-full h-full sm:h-auto overflow-hidden shadow-2xl border-0 sm:border border-slate-700 flex flex-col max-h-screen sm:max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Informasi Berkas */}
            <div className="px-4 py-3 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2 min-w-0">
                <span className="px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-300 text-[10px] font-bold uppercase tracking-wider font-mono border border-indigo-700/50 shrink-0">
                  {previewMedia.type === 'video' ? 'Video' : 'Foto'} #{previewIndex + 1}
                </span>
                <span className="text-xs font-bold text-slate-200 truncate">
                  {getDownloadFileName(previewMedia, previewIndex)}
                </span>
              </div>
              <span className="text-slate-400 text-[11px] hidden sm:inline shrink-0">
                {currentSession?.sessionTitle}
              </span>
            </div>

            {/* Media Body dengan Tombol Navigasi Prev/Next */}
            <div className="relative p-2 sm:p-4 flex items-center justify-center bg-black/60 overflow-hidden flex-1 min-h-[240px]">
              {previewIndex > 0 && (
                <button
                  type="button"
                  onClick={handlePrevMedia}
                  className="absolute left-2 sm:left-4 z-20 p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white shadow-lg backdrop-blur-xs border border-slate-700 transition-all active:scale-95"
                  title="Foto / Video Sebelumnya"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}

              {previewMedia.type === 'video' ? (
                <video
                  src={previewMedia.url}
                  controls
                  autoPlay
                  playsInline
                  className="max-h-[62vh] w-auto max-w-full rounded-lg shadow-xl"
                />
              ) : (
                <img
                  src={previewMedia.url}
                  alt={previewMedia.name}
                  className="max-h-[62vh] w-auto max-w-full object-contain rounded-lg shadow-xl"
                />
              )}

              {previewIndex >= 0 && previewIndex < mediaItems.length - 1 && (
                <button
                  type="button"
                  onClick={handleNextMedia}
                  className="absolute right-2 sm:right-4 z-20 p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white shadow-lg backdrop-blur-xs border border-slate-700 transition-all active:scale-95"
                  title="Foto / Video Selanjutnya"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Footer / Bagian Bawah Layar: Tombol X / Tutup Terpisah dari Unduh */}
            <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              {/* Tombol X / Tutup di Bawah Layar */}
              <button
                type="button"
                onClick={() => setPreviewMedia(null)}
                className="order-2 sm:order-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 hover:text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition-all shadow-sm"
                title="Tutup Pratinjau"
              >
                <X className="w-4 h-4 text-slate-300" />
                <span>Tutup Pratinjau</span>
              </button>

              {/* Status Nomor Foto / Video di Bagian Bawah */}
              <div className="order-1 sm:order-2 text-center text-slate-400 text-xs">
                <span className="font-bold text-slate-200">
                  {previewMedia.type === 'video' ? 'Video' : 'Foto'} #{previewIndex + 1}
                </span>
                <span className="text-slate-500"> dari {mediaItems.length}</span>
                {previewMedia.sizeFormatted && (
                  <span className="text-slate-500 ml-1.5 hidden sm:inline">
                    • {previewMedia.sizeFormatted}
                  </span>
                )}
              </div>

              {/* Tombol Unduh Media Terpisah dengan Nomor Foto */}
              <button
                type="button"
                onClick={() => handleDownloadMedia(previewMedia.url, getDownloadFileName(previewMedia, previewIndex))}
                className="order-3 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-all shrink-0"
                title="Unduh berkas ini ke perangkat dengan nomor foto"
              >
                <Download className="w-4 h-4" />
                <span>
                  {previewMedia.type === 'video' 
                    ? `Unduh Video #${previewIndex + 1}` 
                    : `Unduh Foto #${previewIndex + 1}`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
