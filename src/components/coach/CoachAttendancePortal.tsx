import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  UserCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Save,
  Share2,
  Download,
  Printer,
  History,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
  Trash2,
  Award,
  FileText,
  Building2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Camera,
  Video,
  Play,
  Maximize2,
  Upload,
  X,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useRealtime } from '../../context/RealtimeContext.tsx';
import { AttendanceStatus, StudentAttendanceRecord, TrainingSession, StudentRegistration, MediaDocumentation } from '../../types.ts';
import { getMediaRemainingDays, isMediaExpired, MEDIA_RETENTION_DAYS } from '../../utils/mediaRetention.ts';
import { 
  getSessionMediaFromFirestore, 
  saveSessionMediaOnlyToFirestore, 
  deleteTrainingMediaFromFirestore 
} from '../../lib/firestoreService.ts';
import { TrainingReportModal } from './TrainingReportModal.tsx';
import { EraKidsLogo } from '../common/EraKidsLogo.tsx';

interface CoachAttendancePortalProps {
  isEmbedded?: boolean;
  onOpenAdmin?: () => void;
}

const DEFAULT_TIME = "18.45 - 21.00 WIB";
const DEFAULT_LOCATION = "GOR VOLI KUBA";
const DEFAULT_COACH = "Riviansyah";

const SESSION_CHOICES = [
  "Reguler Jumat",
  "Reguler Rabu",
  "Latihan Tambahan",
  "Kejuaraan"
] as const;

export const CoachAttendancePortal: React.FC<CoachAttendancePortalProps> = ({
  isEmbedded = false,
  onOpenAdmin
}) => {
  const {
    registrations,
    trainingSessions,
    saveTrainingSession,
    deleteTrainingSession,
    updateRegistration,
    isConnected,
    isCloudConnected
  } = useRealtime();

  // Active view: 'input' or 'history'
  const [activeTab, setActiveTab] = useState<'input' | 'history'>('input');

  // Session form states
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [sessionDate, setSessionDate] = useState<string>(todayStr);
  const [sessionTime, setSessionTime] = useState<string>(DEFAULT_TIME);
  const [sessionLocation, setSessionLocation] = useState<string>(DEFAULT_LOCATION);
  const [sessionCoach, setSessionCoach] = useState<string>(DEFAULT_COACH);
  const [sessionTitle, setSessionTitle] = useState<string>(SESSION_CHOICES[0]);
  const [sessionNotes, setSessionNotes] = useState<string>('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);

  // Media documentation states (Foto & Video)
  const [sessionMedia, setSessionMedia] = useState<MediaDocumentation[]>([]);
  const [isProcessingMedia, setIsProcessingMedia] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [activeMediaModal, setActiveMediaModal] = useState<MediaDocumentation | null>(null);

  // Student filter and search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Diterima'>('Diterima');

  // Attendance records map: studentId -> StudentAttendanceRecord
  const [attendanceMap, setAttendanceMap] = useState<Record<string, { status: AttendanceStatus; notes: string }>>({});

  // UI helpers
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [isSavingMedia, setIsSavingMedia] = useState(false);
  const [saveToast, setSaveToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [expandedNotesStudentId, setExpandedNotesStudentId] = useState<string | null>(null);
  const [viewingHistorySession, setViewingHistorySession] = useState<TrainingSession | null>(null);
  const [historyMediaMap, setHistoryMediaMap] = useState<Record<string, MediaDocumentation[]>>({});
  const [sessionToDelete, setSessionToDelete] = useState<TrainingSession | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reportModalSession, setReportModalSession] = useState<TrainingSession | null>(null);

  // Muat foto HD untuk sesi riwayat yang sedang dibuka
  useEffect(() => {
    if (!viewingHistorySession?.id) return;
    const sId = viewingHistorySession.id;
    if (!historyMediaMap[sId]) {
      getSessionMediaFromFirestore(sId).then(list => {
        if (list && list.length > 0) {
          setHistoryMediaMap(prev => ({ ...prev, [sId]: list }));
        }
      }).catch(() => {});
    }
  }, [viewingHistorySession?.id]);

  const handleRemoveHistoryMedia = async (e: React.MouseEvent, sessId: string, mediaId: string) => {
    e.stopPropagation();
    try {
      await deleteTrainingMediaFromFirestore(mediaId, sessId);
      setHistoryMediaMap(prev => ({
        ...prev,
        [sessId]: (prev[sessId] || []).filter(m => m.id !== mediaId)
      }));
      showNotification('Foto / video berhasil dihapus dari galeri & database Firebase', 'success');
    } catch (err: any) {
      showNotification('Gagal menghapus media dari database', 'error');
    }
  };

  // Fungsi untuk memastikan ukuran string base64 tidak melampaui batas 1.048.487 bytes properti Firestore
  const ensureSafeMediaSize = (media: MediaDocumentation): Promise<MediaDocumentation> => {
    if (media.type !== 'photo' || !media.url || media.url.length <= 920000 || typeof window === 'undefined') {
      return Promise.resolve(media);
    }

    return new Promise((resolve) => {
      try {
        const img = new Image();
        img.src = media.url;
        img.onload = () => {
          try {
            const MAX_DIM = 1350;
            let width = img.width;
            let height = img.height;

            if (width > height && width > MAX_DIM) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else if (height > MAX_DIM) {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(media);
              return;
            }

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            let quality = 0.80;
            let safeUrl = canvas.toDataURL('image/jpeg', quality);

            while (safeUrl.length > 920000 && quality > 0.45) {
              quality -= 0.08;
              safeUrl = canvas.toDataURL('image/jpeg', quality);
            }

            if (safeUrl.length > 920000) {
              const scale = 0.8;
              canvas.width = Math.round(width * scale);
              canvas.height = Math.round(height * scale);
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              safeUrl = canvas.toDataURL('image/jpeg', 0.75);
            }

            const byteLength = Math.round((safeUrl.length * 3) / 4);
            const sizeKb = Math.round(byteLength / 1024);

            resolve({
              ...media,
              url: safeUrl,
              sizeFormatted: `${sizeKb} KB (HD)`,
              sizeBytes: byteLength
            });
          } catch {
            resolve(media);
          }
        };
        img.onerror = () => resolve(media);
      } catch {
        resolve(media);
      }
    });
  };

  // Compress photo on client side via canvas (Resolusi tajam HD 1350px, kualitas 0.80 dengan safeguard mutlak batas 1MB Firestore)
  const compressImage = (file: File): Promise<MediaDocumentation> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          // Resolusi HD Tajam (1350px) agar jernih & tajam di layar smartphone retina, namun tetap aman di bawah batas 1MB properti Firestore
          const MAX_DIM = 1350;
          let width = img.width;
          let height = img.height;

          if (width > height && width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({
              id: `media_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              type: 'photo',
              url: img.src,
              name: file.name,
              sizeFormatted: `${Math.round(file.size / 1024)} KB`,
              sizeBytes: file.size,
              uploadedAt: new Date().toISOString()
            });
            return;
          }

          // Aktifkan smoothing berkualitas tinggi untuk mencegah aliasing/pecah
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Kualitas tinggi 0.80 dengan auto-step down untuk menjamin panjang base64 < 920.000 bytes (batas Firestore 1.048.487 bytes)
          let quality = 0.80;
          let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

          while (compressedDataUrl.length > 920000 && quality > 0.45) {
            quality -= 0.08;
            compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          }

          if (compressedDataUrl.length > 920000) {
            const scale = 0.8;
            canvas.width = Math.round(width * scale);
            canvas.height = Math.round(height * scale);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
          }

          const byteLength = Math.round((compressedDataUrl.length * 3) / 4);
          const sizeKb = Math.round(byteLength / 1024);

          resolve({
            id: `media_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            type: 'photo',
            url: compressedDataUrl,
            name: file.name,
            sizeFormatted: sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB (HD)`,
            sizeBytes: byteLength,
            uploadedAt: new Date().toISOString()
          });
        };
        img.onerror = () => reject(new Error('Gagal membaca gambar.'));
      };
      reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    });
  };

  // Video processing with size limit (max 350KB for cloud database storage)
  const processVideo = (file: File): Promise<MediaDocumentation> => {
    return new Promise((resolve, reject) => {
      const MAX_MB = 0.35;
      if (file.size > MAX_MB * 1024 * 1024) {
        const actualMb = (file.size / (1024 * 1024)).toFixed(1);
        reject(new Error(`Ukuran video (${actualMb} MB) melebihi batas database cloud (maksimal 350 KB). Disarankan menggunakan Foto Dokumentasi latihan yang otomatis tajam & ringan di galeri orang tua.`));
        return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        resolve({
          id: `media_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          type: 'video',
          url: reader.result as string,
          name: file.name,
          sizeFormatted: `${sizeMb} MB`,
          sizeBytes: file.size,
          uploadedAt: new Date().toISOString()
        });
      };
      reader.onerror = () => reject(new Error('Gagal membaca file video.'));
    });
  };

  const handlePhotoFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingMedia(true);
    setMediaError(null);
    try {
      const newItems: MediaDocumentation[] = [];
      for (let i = 0; i < files.length; i++) {
        const item = await compressImage(files[i]);
        newItems.push(item);
      }
      setSessionMedia(prev => [...prev, ...newItems]);
      showNotification(`${newItems.length} foto berhasil dikompresi & ditambahkan!`);
    } catch (err: any) {
      setMediaError(err.message || 'Gagal memproses foto.');
    } finally {
      setIsProcessingMedia(false);
      e.target.value = '';
    }
  };

  const handleVideoFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingMedia(true);
    setMediaError(null);
    try {
      const videoItem = await processVideo(files[0]);
      setSessionMedia(prev => [...prev, videoItem]);
      showNotification(`Video latihan berhasil ditambahkan (${videoItem.sizeFormatted})!`);
    } catch (err: any) {
      setMediaError(err.message || 'Gagal memproses video.');
    } finally {
      setIsProcessingMedia(false);
      e.target.value = '';
    }
  };

  const handleMediaFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingMedia(true);
    setMediaError(null);
    try {
      const newItems: MediaDocumentation[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('video/')) {
          const item = await processVideo(file);
          newItems.push(item);
        } else {
          const item = await compressImage(file);
          newItems.push(item);
        }
      }
      setSessionMedia(prev => [...prev, ...newItems]);
      showNotification(`${newItems.length} media berhasil ditambahkan!`);
    } catch (err: any) {
      setMediaError(err.message || 'Gagal memproses file media.');
    } finally {
      setIsProcessingMedia(false);
      e.target.value = '';
    }
  };

  const handleRemoveMedia = async (id: string) => {
    setSessionMedia(prev => prev.filter(m => m.id !== id));
    // Jika foto sudah pernah tersimpan di Firebase, hapus langsung dari database
    try {
      await deleteTrainingMediaFromFirestore(id, editingSessionId || undefined);
    } catch (e) {
      console.warn('Info hapus media cloud:', e);
    }
    showNotification('Foto / video berhasil dihapus dari galeri & database Firebase');
  };

  // Eligible students for attendance
  const eligibleStudents = useMemo(() => {
    return registrations.filter(r => {
      // Exclude cancelled memberships by default
      if (r.status === 'Pembatalan Keanggotaan') return false;
      if (statusFilter === 'Diterima') {
        return r.status === 'Diterima';
      }
      return true;
    });
  }, [registrations, statusFilter]);

  // Filtered by search
  const displayedStudents = useMemo(() => {
    return eligibleStudents.filter(r => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchName = r.studentName.toLowerCase().includes(q) || r.nickname.toLowerCase().includes(q);
      const matchReg = r.regNumber.toLowerCase().includes(q);
      const matchJersey = r.jerseyNumber ? r.jerseyNumber.toLowerCase().includes(q) : false;
      return matchName || matchReg || matchJersey;
    });
  }, [eligibleStudents, searchQuery]);

  // Synchronize attendanceMap when eligible students change or session loads
  useEffect(() => {
    setAttendanceMap(prev => {
      const updated = { ...prev };
      eligibleStudents.forEach(student => {
        if (!updated[student.id]) {
          updated[student.id] = {
            status: 'Hadir',
            notes: ''
          };
        }
      });
      return updated;
    });
  }, [eligibleStudents]);

  // Statistics calculation for the current input session
  const currentStats = useMemo(() => {
    let hadir = 0;
    let izin = 0;
    let tidakHadir = 0;

    eligibleStudents.forEach(student => {
      const rec = attendanceMap[student.id];
      const status = rec ? rec.status : 'Hadir';
      if (status === 'Hadir') hadir++;
      else if (status === 'Izin') izin++;
      else tidakHadir++;
    });

    const total = eligibleStudents.length;
    const rate = total > 0 ? Math.round((hadir / total) * 100) : 0;

    return { total, hadir, izin, tidakHadir, rate };
  }, [eligibleStudents, attendanceMap]);

  // Change individual student attendance status
  const handleSetStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendanceMap(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { notes: '' }),
        status
      }
    }));
  };

  // Change individual student training notes
  const handleSetNotes = (studentId: string, notes: string) => {
    setAttendanceMap(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { status: 'Hadir' }),
        notes
      }
    }));
  };

  // Bulk mark all present
  const handleMarkAllPresent = () => {
    setAttendanceMap(prev => {
      const updated = { ...prev };
      eligibleStudents.forEach(s => {
        updated[s.id] = {
          ...(updated[s.id] || { notes: '' }),
          status: 'Hadir'
        };
      });
      return updated;
    });
    showNotification('Seluruh siswa ditandai HADIR');
  };

  // Bulk mark all permitted
  const handleMarkAllPermitted = () => {
    setAttendanceMap(prev => {
      const updated = { ...prev };
      eligibleStudents.forEach(s => {
        updated[s.id] = {
          ...(updated[s.id] || { notes: '' }),
          status: 'Izin'
        };
      });
      return updated;
    });
    showNotification('Seluruh siswa ditandai IZIN');
  };

  const showNotification = (msg: string, type: 'success' | 'error' = 'success') => {
    setSaveToast({ message: msg, type });
    setTimeout(() => setSaveToast(null), 3500);
  };

  // 1. Simpan Presensi Kehadiran Siswa SAJA ke database 'training_sessions'
  const handleSaveAttendanceOnly = async () => {
    if (eligibleStudents.length === 0) {
      alert('Belum ada data siswa terdaftar yang bisa dicatat presensinya.');
      return;
    }

    setIsSavingAttendance(true);

    const records: StudentAttendanceRecord[] = eligibleStudents.map((student, idx) => {
      const entry = attendanceMap[student.id] || { status: 'Hadir', notes: '' };
      return {
        studentId: String(student.id || `student_${idx}`),
        regNumber: String(student.regNumber || ''),
        studentName: String(student.studentName || 'Siswa'),
        nickname: String(student.nickname || student.studentName || 'Siswa'),
        gender: (student.gender === 'P' ? 'P' : 'L') as 'L' | 'P',
        age: typeof student.age === 'number' && !isNaN(student.age) ? student.age : 0,
        jerseyNumber: String(student.jerseyNumber || ''),
        photoUrl: '', // Pas foto disimpan di registrasi siswa, tidak diduplikasi di sesi agar hemat dokumen
        status: String(entry.status || 'Hadir'),
        notes: String(entry.notes || '')
      };
    });

    const targetId = editingSessionId || `session_${Date.now()}`;
    const payload: Partial<TrainingSession> = {
      id: targetId,
      date: sessionDate,
      timeRange: sessionTime,
      sessionTitle,
      coachName: sessionCoach,
      location: sessionLocation,
      programName: "Volleyball Training for Kids",
      records,
      notes: sessionNotes || '',
      documentationMedia: [],
      photos: []
    };

    const res = await saveTrainingSession(payload);
    setIsSavingAttendance(false);

    if (res.success && res.session) {
      setEditingSessionId(res.session.id);
      showNotification(`✓ Presensi Kehadiran berhasil disimpan! (${currentStats.hadir} Hadir / ${currentStats.total} Siswa)`, 'success');
    } else {
      showNotification(res.error || 'Gagal menyimpan presensi', 'error');
    }
  };

  // 2. Simpan Foto & Video Dokumentasi SAJA ke database terpisah 'training_media'
  const handleSaveMediaOnly = async () => {
    if (sessionMedia.length === 0) {
      showNotification('Belum ada foto atau video yang dipilih untuk disimpan', 'error');
      return;
    }

    const targetSessionId = editingSessionId || `session_${Date.now()}`;
    if (!editingSessionId) {
      setEditingSessionId(targetSessionId);
    }

    setIsSavingMedia(true);

    // Auto-optimasi setiap foto di sessionMedia agar DIJAMIN tidak melebihi 920.000 bytes batas properti Firestore
    let safeMediaList: MediaDocumentation[] = sessionMedia;
    try {
      safeMediaList = await Promise.all(
        sessionMedia.map(m => ensureSafeMediaSize(m))
      );
      setSessionMedia(safeMediaList);
    } catch (e) {
      console.warn('Info optimasi ukuran media:', e);
    }

    const records: StudentAttendanceRecord[] = eligibleStudents.map((student, idx) => {
      const entry = attendanceMap[student.id] || { status: 'Hadir', notes: '' };
      return {
        studentId: String(student.id || `student_${idx}`),
        regNumber: String(student.regNumber || ''),
        studentName: String(student.studentName || 'Siswa'),
        nickname: String(student.nickname || student.studentName || 'Siswa'),
        gender: (student.gender === 'P' ? 'P' : 'L') as 'L' | 'P',
        age: typeof student.age === 'number' && !isNaN(student.age) ? student.age : 0,
        jerseyNumber: String(student.jerseyNumber || ''),
        photoUrl: '',
        status: String(entry.status || 'Hadir'),
        notes: String(entry.notes || '')
      };
    });

    const sessionMeta: Partial<TrainingSession> = {
      id: targetSessionId,
      date: sessionDate,
      timeRange: sessionTime,
      sessionTitle,
      coachName: sessionCoach,
      location: sessionLocation,
      programName: "Volleyball Training for Kids",
      records,
      notes: sessionNotes || ''
    };

    const res = await saveSessionMediaOnlyToFirestore(targetSessionId, safeMediaList, sessionMeta);
    setIsSavingMedia(false);

    if (res.success) {
      showNotification(`✓ ${res.count} Foto & Video Dokumentasi berhasil disimpan ke Galeri Firebase!`, 'success');
    } else {
      showNotification(res.error || 'Gagal menyimpan media', 'error');
    }
  };

  // Save session to backend (Keduanya sekaligus)
  const handleSaveSession = async () => {
    if (eligibleStudents.length === 0) {
      alert('Belum ada data siswa terdaftar yang bisa dicatat presensinya.');
      return;
    }

    setIsSaving(true);

    const records: StudentAttendanceRecord[] = eligibleStudents.map((student, idx) => {
      const entry = attendanceMap[student.id] || { status: 'Hadir', notes: '' };
      return {
        studentId: String(student.id || `student_${idx}`),
        regNumber: String(student.regNumber || ''),
        studentName: String(student.studentName || 'Siswa'),
        nickname: String(student.nickname || student.studentName || 'Siswa'),
        gender: (student.gender === 'P' ? 'P' : 'L') as 'L' | 'P',
        age: typeof student.age === 'number' && !isNaN(student.age) ? student.age : 0,
        jerseyNumber: String(student.jerseyNumber || ''),
        photoUrl: '', // Bersih dari base64
        status: String(entry.status || 'Hadir'),
        notes: String(entry.notes || '')
      };
    });

    const payload: Partial<TrainingSession> = {
      id: editingSessionId || undefined,
      date: sessionDate,
      timeRange: sessionTime,
      sessionTitle,
      coachName: sessionCoach,
      location: sessionLocation,
      programName: "Volleyball Training for Kids",
      records,
      notes: sessionNotes || '',
      documentationMedia: sessionMedia || [],
      photos: []
    };

    const res = await saveTrainingSession(payload);
    setIsSaving(false);

    if (res.success && res.session) {
      setEditingSessionId(res.session.id);
      showNotification(`Presensi sesi latihan berhasil disimpan! (${currentStats.hadir} Hadir / ${currentStats.total} Siswa)`, 'success');
      // Otomatis alihkan ke tab Riwayat Sesi agar pelatih dapat langsung melihat sesi yang baru tercatat
      setActiveTab('history');
      setViewingHistorySession(res.session);
    } else {
      showNotification(res.error || 'Gagal menyimpan presensi', 'error');
    }
  };

  // Load a session from history into the editor
  const handleLoadSessionForEdit = (session: TrainingSession) => {
    setEditingSessionId(session.id);
    setSessionDate(session.date);
    setSessionTime(session.timeRange || DEFAULT_TIME);
    setSessionLocation(session.location || DEFAULT_LOCATION);
    setSessionCoach(session.coachName || DEFAULT_COACH);
    setSessionTitle(session.sessionTitle);
    setSessionNotes(session.notes || '');

    // Load media documentation
    const existingMedia: MediaDocumentation[] = session.documentationMedia ? [...session.documentationMedia] : [];
    if (existingMedia.length === 0 && session.photos && session.photos.length > 0) {
      session.photos.forEach((photoUrl, idx) => {
        existingMedia.push({
          id: `media_legacy_${idx}_${Date.now()}`,
          type: 'photo',
          url: photoUrl,
          name: `Foto Latihan ${idx + 1}`,
          sizeFormatted: '~100 KB',
          uploadedAt: session.createdAt || new Date().toISOString()
        });
      });
    }
    setSessionMedia(existingMedia);

    // Muat foto Full HD lengkap dari subcollection Firestore jika tersedia
    getSessionMediaFromFirestore(session.id)
      .then((hdList) => {
        if (hdList && hdList.length > 0) {
          setSessionMedia(hdList);
        }
      })
      .catch((e) => console.warn('Info load session media for edit:', e));

    const newMap: Record<string, { status: AttendanceStatus; notes: string }> = {};
    session.records.forEach(rec => {
      const normalizedStatus: AttendanceStatus = 
        rec.status === 'Hadir' ? 'Hadir' : rec.status === 'Izin' ? 'Izin' : 'Tidak Hadir';
      newMap[rec.studentId] = {
        status: normalizedStatus,
        notes: rec.notes || ''
      };
    });
    setAttendanceMap(newMap);
    setActiveTab('input');
    setViewingHistorySession(null);
    showNotification(`Memuat sesi: ${session.sessionTitle} (${session.date})`);
  };

  // Create fresh new session
  const handleStartFreshSession = () => {
    setEditingSessionId(null);
    setSessionDate(todayStr);
    setSessionTitle(SESSION_CHOICES[0]);
    setSessionCoach(DEFAULT_COACH);
    setSessionLocation(DEFAULT_LOCATION);
    setSessionNotes('');
    setSessionMedia([]);
    setAttendanceMap(prev => {
      const resetMap: Record<string, { status: AttendanceStatus; notes: string }> = {};
      eligibleStudents.forEach(s => {
        resetMap[s.id] = { status: 'Hadir', notes: '' };
      });
      return resetMap;
    });
    setActiveTab('input');
    setViewingHistorySession(null);
    showNotification('Membuat formulir presensi sesi baru');
  };

  // Open delete confirmation modal
  const handleOpenDeleteModal = (session: TrainingSession) => {
    setSessionToDelete(session);
  };

  // Confirm delete session execution
  const handleConfirmDeleteSession = async () => {
    if (!sessionToDelete) return;
    setIsDeleting(true);
    try {
      const deletedTitle = sessionToDelete.sessionTitle;
      const targetId = sessionToDelete.id;
      const ok = await deleteTrainingSession(targetId);
      if (ok) {
        if (editingSessionId === targetId) {
          handleStartFreshSession();
        }
        if (viewingHistorySession?.id === targetId) {
          setViewingHistorySession(null);
        }
        showNotification(`Sesi "${deletedTitle}" berhasil dihapus dari database`);
        setSessionToDelete(null);
      } else {
        showNotification('Gagal menghapus sesi dari server. Silakan coba lagi.');
      }
    } catch (err) {
      console.error('Error deleting session:', err);
      showNotification('Terjadi kesalahan koneksi saat menghapus sesi.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Copy coach portal URL
  const handleCopyCoachLink = () => {
    const origin = window.location.origin;
    const url = `${origin}/?portal=coach`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Export current attendance or session to CSV
  const handleExportCSV = (session?: TrainingSession) => {
    const targetRecords = session ? session.records : eligibleStudents.map(student => {
      const entry = attendanceMap[student.id] || { status: 'Hadir', notes: '' };
      return {
        studentId: student.id,
        regNumber: student.regNumber,
        studentName: student.studentName,
        nickname: student.nickname,
        gender: student.gender,
        age: student.age,
        jerseyNumber: student.jerseyNumber || '',
        status: entry.status,
        notes: entry.notes || ''
      };
    });

    const dateStr = session ? session.date : sessionDate;
    const titleStr = session ? session.sessionTitle : sessionTitle;

    const headers = ['No', 'No Registrasi', 'No Jersey', 'Nama Siswa', 'Panggilan', 'Gender', 'Usia', 'Status Kehadiran', 'Catatan Latihan'];
    const rows = targetRecords.map((r, i) => [
      i + 1,
      r.regNumber,
      r.jerseyNumber || '-',
      `"${r.studentName}"`,
      `"${r.nickname || '-'}"`,
      r.gender,
      r.age,
      r.status,
      `"${r.notes || '-'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [
      `"REKAP PRESENSI LATIHAN ERA KIDS"`,
      `"Tanggal: ${dateStr}"`,
      `"Sesi: ${titleStr}"`,
      `"Pelatih: ${session ? session.coachName : sessionCoach}"`,
      '',
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `era_kids_presensi_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Open PDF Report preview modal
  const handleOpenReportModal = (session?: TrainingSession) => {
    if (session) {
      setReportModalSession(session);
      return;
    }

    // Construct current active session from input state
    const targetRecords: StudentAttendanceRecord[] = eligibleStudents.map(student => {
      const entry = attendanceMap[student.id] || { status: 'Hadir', notes: '' };
      return {
        studentId: student.id,
        regNumber: student.regNumber,
        studentName: student.studentName,
        nickname: student.nickname,
        gender: student.gender,
        age: student.age,
        jerseyNumber: student.jerseyNumber || '',
        photoUrl: student.photoUrl || '',
        status: entry.status,
        notes: entry.notes || ''
      };
    });

    const currentSummary = {
      total: targetRecords.length,
      hadir: targetRecords.filter(r => r.status === 'Hadir').length,
      izin: targetRecords.filter(r => r.status === 'Izin').length,
      tidakHadir: targetRecords.filter(r => r.status !== 'Hadir' && r.status !== 'Izin').length,
    };

    const virtualSession: TrainingSession = {
      id: editingSessionId || `session_${sessionDate.replace(/-/g, '')}`,
      date: sessionDate,
      timeRange: sessionTime,
      sessionTitle: sessionTitle,
      coachName: sessionCoach,
      location: sessionLocation,
      programName: 'Volleyball Training for Kids',
      records: targetRecords,
      summary: currentSummary,
      notes: sessionNotes,
      photos: sessionMedia.filter(m => m.type === 'photo').map(m => m.url),
      documentationMedia: sessionMedia,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setReportModalSession(virtualSession);
  };

  return (
    <div className={`space-y-3 sm:space-y-4 ${isEmbedded ? '' : 'w-full max-w-7xl mx-auto px-1 sm:px-6 py-2 sm:py-4 overflow-x-hidden'}`}>
      {/* Toast Notification */}
      <AnimatePresence>
        {saveToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-16 right-4 z-50 px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border text-xs sm:text-sm font-semibold max-w-sm ${
              saveToast.type === 'error'
                ? 'bg-rose-950 text-rose-100 border-rose-700 shadow-rose-950/50'
                : 'bg-slate-900 text-white border-slate-700 shadow-slate-950/50'
            }`}
          >
            {saveToast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span className="leading-tight">{saveToast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP BANNER / NAVIGATION HEADER */}
      <div className="bg-white rounded-2xl p-4 shadow-2xs border border-slate-200/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Title & Badge */}
          <div className="flex items-center gap-3">
            <EraKidsLogo className="w-10 h-10 sm:w-11 sm:h-11" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Presensi Sesi Latihan ERA Kids
                </h1>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                  <Award className="w-3 h-3" />
                  Portal Pelatih / Coach
                </span>
                <span className={`w-2 h-2 rounded-full ${isCloudConnected || isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} title={isCloudConnected ? 'Cloud Firestore & Live Sync Aktif' : 'Live Sync Terhubung'} />
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Cloud Realtime
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Input cepat kehadiran siswa di lapangan, pantau nomor punggung & foto, serta rekam catatan performa latihan.
              </p>
            </div>
          </div>

          {/* Quick Actions / Link Share / Tabs */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Tab Toggle: Input vs Riwayat */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => { setActiveTab('input'); setViewingHistorySession(null); }}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'input'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>Input Presensi</span>
                {editingSessionId && (
                  <span className="w-2 h-2 rounded-full bg-amber-500" title="Sedang mengedit sesi" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'history'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <History className="w-3.5 h-3.5 text-amber-600" />
                <span>Riwayat Sesi</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px]">
                  {trainingSessions.length}
                </span>
              </button>
            </div>

            {/* Coach Direct Link Copy Button */}
            <button
              onClick={handleCopyCoachLink}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1 transition-all"
              title="Salin Tautan Langsung Portal Pelatih (?portal=coach)"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-slate-500" />}
              <span className="hidden sm:inline">{copiedLink ? 'Tersalin!' : 'Link Pelatih'}</span>
            </button>

            {/* Preview PDF Training Report Button */}
            <button
              type="button"
              id="btn-coach-top-pdf-report"
              onClick={() => handleOpenReportModal()}
              className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
              title="Cetak atau Unduh PDF Laporan Sesi Latihan untuk WhatsApp"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Laporan PDF</span>
            </button>

            {/* Back to Admin if embedded or requested */}
            {onOpenAdmin && (
              <button
                onClick={onOpenAdmin}
                className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1 transition-all"
                title="Kembali ke Manajemen Siswa Admin"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Kembali ke Admin</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: INPUT PRESENSI SESI LATIHAN */}
      {/* ======================================================== */}
      {activeTab === 'input' && (
        <div className="space-y-4">
          {/* SESSION CONFIGURATION CARD */}
          <div className="bg-white rounded-2xl p-4 shadow-2xs border border-slate-200/80">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-bold text-slate-800">
                  {editingSessionId ? 'Edit Sesi Latihan' : 'Informasi Sesi Latihan Baru'}
                </h2>
                {editingSessionId && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                    Mode Edit
                  </span>
                )}
              </div>

              {editingSessionId && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const cur = trainingSessions.find(s => s.id === editingSessionId);
                      if (cur) handleOpenDeleteModal(cur);
                    }}
                    className="text-xs text-rose-600 hover:text-rose-800 font-bold hover:underline flex items-center gap-1 transition-colors"
                    title="Hapus sesi latihan yang sedang diedit ini"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Hapus Sesi</span>
                  </button>
                  <button
                    onClick={handleStartFreshSession}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Buat Sesi Baru</span>
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Tanggal Sesi */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Tanggal Latihan
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={sessionDate}
                    onChange={e => setSessionDate(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50/50"
                  />
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>

              {/* Waktu Latihan */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Jam Latihan
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={sessionTime}
                    onChange={e => setSessionTime(e.target.value)}
                    placeholder="18.45 - 21.00 WIB"
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50/50"
                  />
                  <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>

              {/* Nama Pelatih */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Pelatih / Coach
                </label>
                <input
                  type="text"
                  value={sessionCoach}
                  onChange={e => setSessionCoach(e.target.value)}
                  placeholder="Riviansyah"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50/50"
                />
              </div>

              {/* Lokasi */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Lokasi Lapangan
                </label>
                <input
                  type="text"
                  value={sessionLocation}
                  onChange={e => setSessionLocation(e.target.value)}
                  placeholder="GOR VOLI KUBA"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50/50"
                />
              </div>

              {/* Sesi (Pilihan: Reguler Jumat, Reguler Rabu, Latihan Tambahan, Kejuaraan) */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Sesi</span>
                  <span className="text-[10px] text-amber-600 font-semibold">Pilih jenis sesi</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {SESSION_CHOICES.map((choice) => {
                    const isSelected = sessionTitle === choice;
                    return (
                      <button
                        key={choice}
                        type="button"
                        onClick={() => setSessionTitle(choice)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center flex items-center justify-center gap-1.5 ${
                          isSelected
                            ? 'bg-amber-500 text-white border-amber-600 shadow-xs ring-2 ring-amber-200'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-white" />}
                        <span>{choice}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filter Status Siswa yang ditampilkan */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Daftar Siswa Roster
                </label>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as any)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50/50"
                >
                  <option value="Diterima">Siswa Aktif (Diterima Saja)</option>
                  <option value="ALL">Semua Siswa Terdaftar (Termasuk Register)</option>
                </select>
              </div>
            </div>
          </div>

          {/* LIVE SUMMARY STATS BAR */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Counter Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 border border-white/10">
                  <span className="text-xs text-slate-300 font-medium">Total Roster:</span>
                  <span className="text-sm font-black text-white">{currentStats.total}</span>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Hadir:</span>
                  <span className="text-sm font-black text-white">{currentStats.hadir}</span>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-300">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Izin:</span>
                  <span className="text-sm font-black text-white">{currentStats.izin}</span>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300">
                  <XCircle className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Tidak Hadir:</span>
                  <span className="text-sm font-black text-white">{currentStats.tidakHadir}</span>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300">
                  <span className="text-xs font-medium">Tingkat Hadir:</span>
                  <span className="text-sm font-black text-white">{currentStats.rate}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* SEARCH & LIST OF STUDENTS */}
          <div className="bg-white rounded-2xl p-4 shadow-2xs border border-slate-200/80">
            {/* Search and Filter Row */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari nama siswa, nomor jersey (#), no reg..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50/50"
                />
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-slate-500">
                <span>Menampilkan <strong>{displayedStudents.length}</strong> dari <strong>{eligibleStudents.length}</strong> siswa</span>
                <button
                  onClick={() => handleExportCSV()}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 border border-slate-200 transition-colors"
                  title="Unduh format tabel CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">CSV</span>
                </button>
              </div>
            </div>

            {/* Empty state */}
            {displayedStudents.length === 0 && (
              <div className="py-12 text-center text-slate-400">
                <UserCheck className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-sm text-slate-600">Tidak ada siswa yang sesuai kriteria pencarian</p>
                <p className="text-xs text-slate-400 mt-1">Coba periksa kata kunci pencarian atau ubah filter status siswa.</p>
              </div>
            )}

            {/* Grid of Student Cards for fast tap / touch input */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {displayedStudents.map((student, idx) => {
                const currentRecord = attendanceMap[student.id] || { status: 'Hadir', notes: '' };
                const currentStatus = currentRecord.status;
                const isNotesOpen = expandedNotesStudentId === student.id;

                return (
                  <div
                    key={student.id}
                    className={`rounded-2xl border p-3 transition-all relative overflow-hidden flex flex-col justify-between ${
                      currentStatus === 'Hadir'
                        ? 'bg-emerald-50/40 border-emerald-200/80 shadow-2xs'
                        : currentStatus === 'Izin'
                        ? 'bg-blue-50/40 border-blue-200/80 shadow-2xs'
                        : 'bg-rose-50/40 border-rose-200/80 shadow-2xs'
                    }`}
                  >
                    {/* Top Row: Photo, Jersey Number, Name, Info */}
                    <div className="flex items-start gap-3">
                      {/* Photo or Avatar */}
                      <div className="relative shrink-0">
                        {student.photoUrl ? (
                          <img
                            src={student.photoUrl}
                            alt={student.studentName}
                            className="w-12 h-14 object-cover rounded-xl border border-slate-200 shadow-2xs bg-white"
                          />
                        ) : (
                          <div className="w-12 h-14 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-900 text-white flex flex-col items-center justify-center font-bold shadow-2xs border border-slate-300">
                            <span className="text-sm">
                              {student.studentName.charAt(0).toUpperCase()}
                            </span>
                            <span className="text-[9px] opacity-70">ERA</span>
                          </div>
                        )}

                        {/* Jersey Number Tag Overlay */}
                        {student.jerseyNumber && (
                          <span className="absolute -bottom-1.5 -right-1.5 px-1.5 py-0.2 rounded-md bg-amber-500 text-slate-950 font-black text-[10px] shadow-xs border border-amber-300">
                            #{student.jerseyNumber}
                          </span>
                        )}
                      </div>

                      {/* Student Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h3 className="font-extrabold text-sm text-slate-900 truncate" title={student.studentName}>
                            {student.studentName}
                          </h3>
                          <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0">
                            {student.regNumber}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-0.5 flex-wrap">
                          {student.nickname && (
                            <span className="font-semibold text-indigo-700">
                              &ldquo;{student.nickname}&rdquo;
                            </span>
                          )}
                          <span className="text-slate-300">•</span>
                          <span>{student.age} thn ({student.gender})</span>
                        </div>

                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {student.currentSchool || 'Siswa ERA Kids'}
                        </p>
                      </div>
                    </div>

                    {/* Middle: 3 Big Touch-Friendly Buttons for Coach */}
                    <div className="mt-3 pt-2.5 border-t border-slate-200/60">
                      <div className="grid grid-cols-3 gap-1.5">
                        {/* HADIR */}
                        <button
                          type="button"
                          onClick={() => handleSetStatus(student.id, 'Hadir')}
                          className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 active:scale-95 ${
                            currentStatus === 'Hadir'
                              ? 'bg-emerald-600 text-white shadow-xs font-black ring-2 ring-emerald-400'
                              : 'bg-white text-slate-600 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-[11px]">Hadir</span>
                        </button>

                        {/* IZIN */}
                        <button
                          type="button"
                          onClick={() => handleSetStatus(student.id, 'Izin')}
                          className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 active:scale-95 ${
                            currentStatus === 'Izin'
                              ? 'bg-blue-600 text-white shadow-xs font-black ring-2 ring-blue-400'
                              : 'bg-white text-slate-600 hover:bg-blue-50 border border-slate-200 hover:border-blue-300'
                          }`}
                        >
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-[11px]">Izin</span>
                        </button>

                        {/* TIDAK HADIR */}
                        <button
                          type="button"
                          onClick={() => handleSetStatus(student.id, 'Tidak Hadir')}
                          className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 active:scale-95 ${
                            currentStatus === 'Tidak Hadir' || currentStatus === 'Alpa' || currentStatus === 'Sakit'
                              ? 'bg-rose-600 text-white shadow-xs font-black ring-2 ring-rose-400'
                              : 'bg-white text-slate-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-300'
                          }`}
                        >
                          <XCircle className="w-4 h-4" />
                          <span className="text-[11px]">Tidak Hadir</span>
                        </button>
                      </div>

                      {/* Coach Quick Training Notes for this Student */}
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => setExpandedNotesStudentId(isNotesOpen ? null : student.id)}
                          className="text-[10.5px] font-semibold text-slate-500 hover:text-slate-800 flex items-center justify-between w-full pt-1"
                        >
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3 text-slate-400" />
                            {currentRecord.notes ? (
                              <span className="text-amber-700 font-bold truncate max-w-[200px]">
                                Catatan: &ldquo;{currentRecord.notes}&rdquo;
                              </span>
                            ) : (
                              <span>+ Tambah Catatan Pelatih</span>
                            )}
                          </span>
                          {isNotesOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>

                        {isNotesOpen && (
                          <div className="mt-2 p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-2 animate-fadeIn">
                            <div>
                              <label className="text-[10px] font-bold text-amber-950 flex items-center gap-1 mb-1">
                                <FileText className="w-3 h-3 text-amber-700" />
                                <span>Catatan Sesi Latihan Hari Ini:</span>
                              </label>
                              <input
                                type="text"
                                value={currentRecord.notes}
                                onChange={e => handleSetNotes(student.id, e.target.value)}
                                placeholder="Misal: Servis tajam, passing bawah sangat stabil..."
                                className="w-full px-2.5 py-1 text-xs rounded-lg border border-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                                autoFocus
                              />
                            </div>

                            <div className="pt-1.5 border-t border-amber-200/70">
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <label className="text-[10px] font-bold text-slate-800 flex items-center gap-1">
                                  <span>Catatan Khusus Siswa (Permanen Pelatih/Admin):</span>
                                </label>
                                {student.specialNotes && (
                                  <span className="text-[9px] text-amber-800 font-semibold bg-amber-100 px-1.5 py-0.2 rounded">Tercatat</span>
                                )}
                              </div>
                              <input
                                type="text"
                                defaultValue={student.specialNotes || ''}
                                onBlur={e => {
                                  const val = e.target.value.trim();
                                  if (val !== (student.specialNotes || '')) {
                                    updateRegistration(student.id, { specialNotes: val });
                                  }
                                }}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.currentTarget.blur();
                                  }
                                }}
                                placeholder="Catatan evaluasi fisik, teknik, kedisiplinan atau catatan khusus..."
                                className="w-full px-2.5 py-1 text-[11px] rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                              />
                              <span className="text-[9px] text-slate-400 block mt-0.5">
                                Terhubung langsung ke data siswa admin, ekspor Excel, dan cetak HTML.
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* TOMBOL SIMPAN 1: KHUSUS PRESENSI KEHADIRAN SISWA */}
            <div className="mt-5 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 border border-emerald-500/40 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <h3 className="font-black text-sm sm:text-base text-white flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    <span>Simpan Presensi Kehadiran Siswa</span>
                  </h3>
                </div>
                <p className="text-xs text-emerald-200/90 mt-1">
                  Merekam status kehadiran: <strong>{currentStats.hadir} Hadir</strong>, {currentStats.izin} Izin, {currentStats.tidakHadir} Tidak Hadir dari total {currentStats.total} siswa.
                </p>
                <p className="text-[10.5px] text-emerald-300/70 mt-0.5">
                  Tersimpan mandiri ke database presensi (super cepat & aman). Foto & video disimpan terpisah pada tombol di bawah.
                </p>
              </div>

              <button
                type="button"
                id="btn-save-attendance-only"
                onClick={handleSaveAttendanceOnly}
                disabled={isSavingAttendance}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 text-sm font-black transition-all shadow-md shadow-emerald-950/30 flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
              >
                <CheckCircle2 className="w-5 h-5 text-slate-950" />
                <span>{isSavingAttendance ? 'Menyimpan Presensi...' : 'Simpan Presensi Kehadiran'}</span>
              </button>
            </div>
          </div>

          {/* DOKUMENTASI SESI (FOTO & VIDEO) - DIPINDAHKAN KE BAGIAN AKHIR */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-amber-600" />
                    <span>Dokumentasi Sesi (Foto & Video)</span>
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800">
                    {sessionMedia.length} Media
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Foto otomatis dikompresi agar hemat ukuran file. Video klip dibatasi maks 15MB agar ringan dan cepat dimuat.
                </p>
                <div className="mt-1.5 flex items-center gap-1.5 text-[10.5px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/80 w-fit">
                  <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Auto-Hapus 3 Minggu: Foto & video galeri otomatis dibersihkan dari database setiap 3 minggu (21 hari) dari tanggal sesi.</span>
                </div>
              </div>

              {/* Action Upload Buttons */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                {/* Ambil Foto Langsung dari Kamera HP */}
                <label
                  className={`cursor-pointer px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs ${
                    isProcessingMedia
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                  }`}
                  title="Buka kamera HP langsung untuk jepret foto sesi latihan"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Ambil Foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    disabled={isProcessingMedia}
                    onChange={handlePhotoFilesSelected}
                    className="hidden"
                  />
                </label>

                {/* Rekam Video Langsung dari Kamera HP */}
                <label
                  className={`cursor-pointer px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs ${
                    isProcessingMedia
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95'
                  }`}
                  title="Buka kamera HP langsung untuk merekam klip video latihan (maks 15MB)"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Rekam Video</span>
                  <input
                    type="file"
                    accept="video/*"
                    capture="environment"
                    disabled={isProcessingMedia}
                    onChange={handleVideoFileSelected}
                    className="hidden"
                  />
                </label>

                {/* Pilih dari Galeri / File HP */}
                <label
                  className={`cursor-pointer px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-200 shadow-2xs ${
                    isProcessingMedia
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95'
                  }`}
                  title="Pilih foto atau video yang sudah ada dari galeri HP"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                  <span>Galeri HP</span>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    disabled={isProcessingMedia}
                    onChange={handleMediaFilesSelected}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Processing Spinner / Loading */}
            {isProcessingMedia && (
              <div className="py-2.5 px-3 mt-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2 text-xs text-amber-800 font-semibold animate-pulse">
                <div className="w-3.5 h-3.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                <span>Memproses dan mengompresi media agar ukuran file tetap ringan...</span>
              </div>
            )}

            {/* Error message */}
            {mediaError && (
              <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-xs text-rose-700 font-medium">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{mediaError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMediaError(null)}
                  className="text-rose-500 hover:text-rose-800 font-bold ml-2 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Media Gallery / Thumbnails Grid */}
            {sessionMedia.length === 0 ? (
              <div className="mt-3 py-6 px-4 border-2 border-dashed border-slate-200 rounded-xl text-center bg-slate-50/50">
                <div className="flex items-center justify-center gap-2 text-slate-400 mb-1.5">
                  <Camera className="w-5 h-5 text-emerald-600" />
                  <Video className="w-5 h-5 text-indigo-600" />
                  <ImageIcon className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-xs font-bold text-slate-700">Belum ada foto atau video dokumentasi</p>
                <p className="text-[11px] text-slate-500 mt-0.5 max-w-md mx-auto">
                  Pelatih dapat langsung menjepret foto atau merekam video dari kamera HP, atau memilih file dari galeri.
                </p>

                {/* Quick Touch Buttons inside Empty State */}
                <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                  <label className="cursor-pointer px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Jepret Kamera</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      disabled={isProcessingMedia}
                      onChange={handlePhotoFilesSelected}
                      className="hidden"
                    />
                  </label>

                  <label className="cursor-pointer px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all">
                    <Video className="w-3.5 h-3.5" />
                    <span>Rekam Video</span>
                    <input
                      type="file"
                      accept="video/*"
                      capture="environment"
                      disabled={isProcessingMedia}
                      onChange={handleVideoFileSelected}
                      className="hidden"
                    />
                  </label>

                  <label className="cursor-pointer px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all">
                    <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                    <span>Buka Galeri</span>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      disabled={isProcessingMedia}
                      onChange={handleMediaFilesSelected}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-3">
                {sessionMedia.map((item) => (
                  <div
                    key={item.id}
                    className="group relative rounded-xl border border-slate-200 overflow-hidden bg-slate-900 shadow-2xs aspect-square flex flex-col justify-end"
                  >
                    {item.type === 'photo' ? (
                      <img
                        src={item.url}
                        alt={item.name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
                        <video
                          src={item.url}
                          className="w-full h-full object-cover opacity-70"
                          muted
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-9 h-9 rounded-full bg-white/30 backdrop-blur-xs flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                            <Play className="w-4 h-4 fill-white ml-0.5" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Gradient Overlay & Size Details */}
                    <div className="relative z-10 p-1.5 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent flex items-center justify-between text-[10px] text-white">
                      <span className={`px-1 rounded font-extrabold text-[9px] ${
                        item.type === 'photo' ? 'bg-emerald-500 text-white' : 'bg-indigo-500 text-white'
                      }`}>
                        {item.type === 'photo' ? 'FOTO' : 'VIDEO'}
                      </span>
                      <span className="font-mono text-[9px] opacity-90">{item.sizeFormatted}</span>
                    </div>

                    {/* Top Action Buttons (Preview & Delete) */}
                    <div className="absolute top-1.5 right-1.5 z-20 flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => setActiveMediaModal(item)}
                        className="w-6 h-6 rounded-lg bg-black/60 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-xs"
                        title="Lihat / Putar Media"
                      >
                        <Maximize2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveMedia(item.id)}
                        className="w-6 h-6 rounded-lg bg-rose-600/90 hover:bg-rose-700 text-white flex items-center justify-center shadow-xs"
                        title="Hapus Media"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TOMBOL SIMPAN 2: KHUSUS FOTO & VIDEO DOKUMENTASI */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 p-4 sm:p-5 rounded-2xl border border-indigo-500/40 text-white shadow-sm">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse" />
                  <h4 className="font-black text-sm sm:text-base text-white flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-indigo-400" />
                    <span>Simpan Dokumentasi Foto & Video</span>
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/30 text-indigo-300 border border-indigo-400/40 font-mono">
                    {sessionMedia.length} Media
                  </span>
                </div>
                <p className="text-xs text-indigo-200/90 mt-1 max-w-xl leading-relaxed">
                  Menyimpan berkas foto & video ke database galeri cloud. <strong>Jika foto dihapus dari tampilan di atas, otomatis langsung dihapus bersih dari database Firebase</strong> dan galeri portal orang tua.
                </p>
              </div>

              <button
                type="button"
                id="btn-save-media-only"
                onClick={handleSaveMediaOnly}
                disabled={isSavingMedia || isProcessingMedia || sessionMedia.length === 0}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 active:scale-95 text-white text-xs sm:text-sm font-black transition-all shadow-md shadow-indigo-950/40 flex items-center justify-center gap-2 shrink-0 disabled:opacity-40"
              >
                <Upload className="w-4 h-4 text-white" />
                <span>
                  {isSavingMedia
                    ? 'Menyimpan Media...'
                    : `Simpan Foto & Video (${sessionMedia.length} Media)`}
                </span>
              </button>
            </div>

            {/* Bottom Actions Bar at the very end of Input Portal */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-slate-500 text-center sm:text-left">
                Gunakan tombol <strong>Simpan Presensi</strong> dan <strong>Simpan Foto & Video</strong> di atas untuk menyimpan ke database. Anda juga dapat langsung membuat <strong>PDF Laporan WA</strong>.
              </p>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  id="btn-bottom-pdf-report"
                  onClick={() => handleOpenReportModal()}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs sm:text-sm font-bold transition-all border border-indigo-200 flex items-center justify-center gap-1.5 shadow-2xs"
                  title="Pratinjau Laporan PDF dan Teks WhatsApp dengan Link Download Foto Anak"
                >
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>PDF Laporan WA</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-bold transition-all border border-slate-200 flex items-center justify-center gap-1.5"
                >
                  <History className="w-4 h-4 text-slate-600" />
                  <span>Lihat Riwayat Sesi</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: RIWAYAT SESI LATIHAN & REKAP KEHADIRAN */}
      {/* ======================================================== */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 shadow-2xs border border-slate-200/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900">
                  Daftar Rekap Sesi Latihan Sebelumnya
                </h2>
                <p className="text-xs text-slate-500">
                  Riwayat presensi latihan siswa yang tersimpan di server pusat ERA Kids.
                </p>
              </div>

              <button
                onClick={handleStartFreshSession}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>+ Buat Sesi Baru</span>
              </button>
            </div>

            {trainingSessions.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <History className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-sm text-slate-600">Belum ada sesi latihan yang tersimpan</p>
                <p className="text-xs text-slate-400 mt-1">Silakan lakukan input presensi pada tab &ldquo;Input Presensi&rdquo; terlebih dahulu.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {trainingSessions.map(session => {
                  const isViewing = viewingHistorySession?.id === session.id;

                  return (
                    <div
                      key={session.id}
                      className={`rounded-2xl border transition-all p-3.5 ${
                        isViewing
                          ? 'border-indigo-500 bg-indigo-50/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
                      }`}
                    >
                      {/* Session Top Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-extrabold flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-amber-600" />
                              {session.date}
                            </span>
                            <h3 className="font-black text-sm text-slate-900">
                              {session.sessionTitle}
                            </h3>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                            <span>Pelatih: <strong>{session.coachName}</strong></span>
                            <span>•</span>
                            <span>{session.timeRange}</span>
                            <span>•</span>
                            <span>{session.location}</span>
                          </div>
                        </div>

                        {/* Summary Badges & Action Buttons */}
                        <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-auto">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                            {session.summary?.hadir || 0} Hadir
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold">
                            {session.summary?.izin || 0} Izin
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold">
                            {session.summary?.tidakHadir ?? ((session.summary?.alpa || 0) + (session.summary?.sakit || 0))} Tidak Hadir
                          </span>

                          {(session.mediaCount || session.documentationMedia?.length || session.photos?.length || 0) > 0 ? (
                            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1" title={`Foto & video tersimpan (sisa ${getMediaRemainingDays(undefined, session.date, session.createdAt)} hari sebelum auto-hapus 3 minggu)`}>
                              <Camera className="w-3 h-3 text-amber-600" />
                              <span>{session.mediaCount || session.documentationMedia?.length || session.photos?.length || 0} Media</span>
                              <span className="text-[10px] font-semibold text-amber-700 font-mono">({getMediaRemainingDays(undefined, session.date, session.createdAt)}h)</span>
                            </span>
                          ) : isMediaExpired(undefined, session.date, session.createdAt) ? (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200 text-xs font-medium flex items-center gap-1" title="Foto & video telah dihapus otomatis dari database setelah melewati 3 minggu (21 hari)">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span className="text-[11px]">Media Dihapus (3 Mggu)</span>
                            </span>
                          ) : null}

                          <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

                          {/* Cetak PDF Laporan Sesi */}
                          <button
                            type="button"
                            id={`btn-pdf-session-${session.id}`}
                            onClick={() => handleOpenReportModal(session)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
                            title="Buka Pratinjau & Unduh PDF Laporan sesi ini untuk grup WhatsApp orang tua"
                          >
                            <FileText className="w-3.5 h-3.5 text-emerald-700" />
                            <span>PDF Laporan</span>
                          </button>

                          <button
                            onClick={() => handleLoadSessionForEdit(session)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors flex items-center gap-1"
                            title="Buka dan edit sesi ini di formulir presensi"
                          >
                            <span>Edit Sesi</span>
                          </button>

                          <button
                            onClick={() => handleExportCSV(session)}
                            className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                            title="Unduh Rekap CSV sesi ini"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setViewingHistorySession(isViewing ? null : session)}
                            className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                            title="Tampilkan daftar siswa di sesi ini"
                          >
                            {isViewing ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>

                          <button
                            id={`btn-delete-session-${session.id}`}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDeleteModal(session);
                            }}
                            className="p-1 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                            title="Hapus riwayat sesi ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Collapsible Student Detail Roster */}
                      {isViewing && (
                        <div className="mt-3 pt-3 border-t border-slate-100 animate-fadeIn">
                          <h4 className="text-xs font-bold text-slate-700 mb-2">
                            Daftar Kehadiran Siswa ({session.records.length} Siswa):
                          </h4>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {session.records.map((rec, i) => (
                              <div
                                key={i}
                                className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2 text-xs"
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1">
                                    {rec.jerseyNumber && (
                                      <span className="font-mono font-black text-slate-700">
                                        #{rec.jerseyNumber}
                                      </span>
                                    )}
                                    <span className="font-bold text-slate-900 truncate">
                                      {rec.studentName}
                                    </span>
                                  </div>
                                  {rec.notes && (
                                    <p className="text-[10px] text-amber-800 italic truncate">
                                      &ldquo;{rec.notes}&rdquo;
                                    </p>
                                  )}
                                </div>

                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10.5px] font-extrabold shrink-0 ${
                                    rec.status === 'Hadir'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : rec.status === 'Izin'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {rec.status === 'Alpa' || rec.status === 'Sakit' ? 'Tidak Hadir' : rec.status}
                                </span>
                              </div>
                            ))}
                          </div>

                          {session.notes && (
                            <div className="mt-2.5 p-2 rounded-lg bg-amber-50/60 border border-amber-200 text-xs text-amber-900">
                              <strong>Catatan Sesi Pelatih:</strong> {session.notes}
                            </div>
                          )}

                          {/* Media Dokumentasi Sesi */}
                          {((session.documentationMedia && session.documentationMedia.length > 0) || (session.photos && session.photos.length > 0)) ? (
                            <div className="mt-3 pt-3 border-t border-slate-200">
                              <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                  <Camera className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Dokumentasi Foto & Video Latihan</span>
                                </h4>
                                <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  <span>Sisa masa simpan: {getMediaRemainingDays(undefined, session.date, session.createdAt)} hari (Auto-hapus 3 minggu)</span>
                                </span>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                {(() => {
                                  const historyMediaList = (historyMediaMap[session.id] && historyMediaMap[session.id].length > 0)
                                    ? historyMediaMap[session.id]
                                    : (session.documentationMedia || []);
                                  
                                  if (historyMediaList.length > 0) {
                                    return historyMediaList.map((media) => (
                                      <div
                                        key={media.id}
                                        onClick={() => setActiveMediaModal(media)}
                                        className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-900 group hover:ring-2 hover:ring-amber-500 transition-all text-left cursor-pointer"
                                      >
                                        {media.type === 'photo' ? (
                                          <img
                                            src={media.url}
                                            alt={media.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                            referrerPolicy="no-referrer"
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center bg-slate-950">
                                            <video src={media.url} className="w-full h-full object-cover opacity-70" muted />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                              <div className="w-7 h-7 rounded-full bg-white/30 backdrop-blur-xs flex items-center justify-center text-white">
                                                <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                                              </div>
                                            </div>
                                          </div>
                                        )}

                                        {/* Tombol Hapus Langsung dari Database Firebase */}
                                        <button
                                          type="button"
                                          title="Hapus foto dari galeri & Firebase"
                                          onClick={(e) => handleRemoveHistoryMedia(e, session.id, media.id)}
                                          className="absolute top-1.5 right-1.5 z-20 w-6 h-6 rounded-lg bg-rose-600/90 hover:bg-rose-700 text-white flex items-center justify-center shadow-xs opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>

                                        <div className="absolute bottom-0 inset-x-0 p-1 bg-gradient-to-t from-slate-950/80 to-transparent flex items-center justify-between text-[9px] text-white">
                                          <span className={`px-1 rounded font-bold ${media.type === 'photo' ? 'bg-emerald-500' : 'bg-indigo-500'}`}>
                                            {media.type === 'photo' ? 'FOTO' : 'VIDEO'}
                                          </span>
                                          <span className="font-mono">{media.sizeFormatted || ''}</span>
                                        </div>
                                      </div>
                                    ));
                                  }

                                  return session.photos?.map((photoUrl, pIdx) => (
                                    <button
                                      key={pIdx}
                                      type="button"
                                      onClick={() => setActiveMediaModal({
                                        id: `p_${pIdx}`,
                                        type: 'photo',
                                        url: photoUrl,
                                        name: `Foto Latihan ${pIdx + 1}`
                                      })}
                                      className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-900 group hover:ring-2 hover:ring-amber-500 transition-all text-left"
                                    >
                                      <img
                                        src={photoUrl}
                                        alt={`Dokumentasi ${pIdx + 1}`}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                        referrerPolicy="no-referrer"
                                      />
                                      <div className="absolute bottom-0 inset-x-0 p-1 bg-gradient-to-t from-slate-950/80 to-transparent text-[9px] text-white font-bold">
                                        FOTO {pIdx + 1}
                                      </div>
                                    </button>
                                  ));
                                })()}
                              </div>
                            </div>
                          ) : isMediaExpired(undefined, session.date, session.createdAt) ? (
                            <div className="mt-3 pt-3 border-t border-slate-200">
                              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                                <span>Dokumentasi foto & video sesi ini telah otomatis dihapus dari database karena melewati masa simpan 3 minggu (21 hari). Data presensi siswa tetap tersimpan permanen.</span>
                              </div>
                            </div>
                          ) : null}

                          {/* Footer Action Bar for WhatsApp Report */}
                          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[11px] text-slate-500">
                              Format laporan presensi, foto latihan, dan tautan galeri untuk grup WhatsApp orang tua:
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenReportModal(session)}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Buka PDF Laporan & Format WA</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DELETE CONFIRMATION MODAL (Safe for iframe, no prompt block) */}
      {/* ======================================================== */}
      <AnimatePresence>
        {sessionToDelete && (
          <div
            id="modal-delete-session-backdrop"
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-x-hidden"
            onClick={() => !isDeleting && setSessionToDelete(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ duration: 0.18 }}
              className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-full sm:max-w-md shadow-2xl border-0 sm:border border-slate-200 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5">
                {/* Icon & Title */}
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-black text-slate-900">
                      Hapus Riwayat Sesi Latihan?
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Data sesi ini beserta rekap kehadiran siswa akan dihapus permanen dari server database ERA Kids.
                    </p>
                  </div>
                </div>

                {/* Session Details Box */}
                <div className="mt-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">Topik Sesi:</span>
                    <span className="font-bold text-slate-900 text-right truncate">
                      {sessionToDelete.sessionTitle}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">Tanggal & Jam:</span>
                    <span className="font-semibold text-slate-800 text-right">
                      {sessionToDelete.date} ({sessionToDelete.timeRange})
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">Pelatih:</span>
                    <span className="font-semibold text-slate-800 text-right">
                      {sessionToDelete.coachName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200">
                    <span className="text-slate-500">Rekap Siswa:</span>
                    <span className="font-extrabold text-emerald-700">
                      {sessionToDelete.summary?.hadir || 0} Hadir • {sessionToDelete.summary?.izin || 0} Izin • {sessionToDelete.summary?.tidakHadir ?? ((sessionToDelete.summary?.alpa || 0) + (sessionToDelete.summary?.sakit || 0))} Tidak Hadir
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-rose-600 bg-rose-50/60 p-2 rounded-lg border border-rose-100">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Tindakan ini tidak dapat dibatalkan.</span>
                </div>

                {/* Actions */}
                <div className="mt-5 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    id="btn-cancel-delete-session"
                    disabled={isDeleting}
                    onClick={() => setSessionToDelete(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
                  >
                    Batal
                  </button>

                  <button
                    type="button"
                    id="btn-confirm-delete-session"
                    disabled={isDeleting}
                    onClick={handleConfirmDeleteSession}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-black transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Menghapus...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Ya, Hapus Sesi</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MEDIA PREVIEW / LIGHTBOX MODAL */}
      {/* ======================================================== */}
      <AnimatePresence>
        {activeMediaModal && (
          <div
            id="modal-media-preview-backdrop"
            className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn overflow-x-hidden"
            onClick={() => setActiveMediaModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="relative max-w-full sm:max-w-3xl w-full h-full sm:h-auto max-h-screen sm:max-h-[90vh] bg-slate-950 rounded-none sm:rounded-2xl overflow-hidden shadow-2xl border-0 sm:border border-white/10 flex flex-col"
            >
              {/* Top bar */}
              <div className="p-3 bg-slate-900/90 border-b border-white/10 flex items-center justify-between text-white">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                    activeMediaModal.type === 'photo' ? 'bg-emerald-500 text-white' : 'bg-indigo-500 text-white'
                  }`}>
                    {activeMediaModal.type === 'photo' ? 'FOTO' : 'VIDEO'}
                  </span>
                  <span className="text-xs font-bold truncate text-slate-200">{activeMediaModal.name}</span>
                  {activeMediaModal.sizeFormatted && (
                    <span className="text-[10px] font-mono text-slate-400">({activeMediaModal.sizeFormatted})</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveMediaModal(null)}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Media Content */}
              <div className="flex-1 overflow-auto flex items-center justify-center p-2 bg-black min-h-[250px] max-h-[75vh]">
                {activeMediaModal.type === 'photo' ? (
                  <img
                    src={activeMediaModal.url}
                    alt={activeMediaModal.name}
                    className="max-h-[70vh] w-auto max-w-full object-contain rounded-lg shadow-lg"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <video
                    src={activeMediaModal.url}
                    controls
                    autoPlay
                    className="max-h-[70vh] w-auto max-w-full rounded-lg shadow-lg"
                  />
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Laporan Pelatihan PDF & Format WhatsApp */}
      <TrainingReportModal
        session={reportModalSession}
        isOpen={Boolean(reportModalSession)}
        onClose={() => setReportModalSession(null)}
      />
    </div>
  );
};
