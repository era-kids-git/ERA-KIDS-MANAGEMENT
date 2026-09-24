import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { StudentRegistration, RegistrationStats, WhatsAppNotificationType, WhatsAppNotification, TrainingSession } from '../types.ts';
import { filterExpiredMediaFromSessions } from '../utils/mediaRetention';
import { getNextAvailableRegNumber, calculateAgeFromBirthDate } from '../utils/regNumber';
import {
  bootstrapFirestoreIfEmpty,
  subscribeToRegistrations,
  subscribeToTrainingSessions,
  saveRegistrationToFirestore,
  updateRegistrationInFirestore,
  deleteRegistrationFromFirestore,
  saveTrainingSessionToFirestore,
  deleteTrainingSessionFromFirestore,
  addWhatsAppNotificationInFirestore,
  resetDemoDataInFirestore
} from '../lib/firestoreService';

interface RealtimeContextType {
  registrations: StudentRegistration[];
  trainingSessions: TrainingSession[];
  stats: RegistrationStats | null;
  isConnected: boolean;
  isConnecting: boolean;
  isCloudConnected: boolean;
  cloudStatus: 'connecting' | 'connected' | 'offline';
  latestAlert: {
    id: string;
    studentName: string;
    timestamp: string;
  } | null;
  clearLatestAlert: () => void;
  fetchRegistrations: () => Promise<void>;
  fetchTrainingSessions: () => Promise<void>;
  submitRegistration: (data: Partial<StudentRegistration>) => Promise<{ success: boolean; registration?: StudentRegistration; error?: string }>;
  updateRegistration: (id: string, updates: Partial<StudentRegistration>) => Promise<boolean>;
  deleteRegistration: (id: string) => Promise<boolean>;
  saveTrainingSession: (sessionData: Partial<TrainingSession>) => Promise<{ success: boolean; session?: TrainingSession; error?: string }>;
  deleteTrainingSession: (id: string) => Promise<boolean>;
  sendWhatsAppNotification: (
    id: string,
    notificationData: {
      type: WhatsAppNotificationType;
      title: string;
      message: string;
      targetNumber: string;
      sentBy: string;
    }
  ) => Promise<WhatsAppNotification | null>;
  resetDemoData: () => Promise<void>;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

// Web Audio API chime for live incoming registration
function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Pleasant double chime: 587.33 Hz (D5) -> 880 Hz (A5)
    const now = ctx.currentTime;
    
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.15);
    gain2.gain.setValueAtTime(0.2, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.6);
  } catch (e) {
    console.warn('Audio chime notice:', e);
  }
}

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [registrations, setRegistrations] = useState<StudentRegistration[]>([]);
  const [trainingSessions, setTrainingSessions] = useState<TrainingSession[]>([]);
  const [stats, setStats] = useState<RegistrationStats | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<'connecting' | 'connected' | 'offline'>('connecting');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [latestAlert, setLatestAlert] = useState<{
    id: string;
    studentName: string;
    timestamp: string;
  } | null>(null);

  const calculateStats = useCallback((items: StudentRegistration[]) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayCount = items.filter(r => r.createdAt.startsWith(todayStr)).length;

    let register = 0;
    let diterima = 0;
    let pembatalan = 0;

    for (const r of items) {
      if (r.status === 'Register') register++;
      else if (r.status === 'Diterima') diterima++;
      else if (r.status === 'Pembatalan Keanggotaan') pembatalan++;
    }

    setStats({
      total: items.length,
      today: todayCount,
      register,
      diterima,
      pembatalan
    });
  }, []);

  const fetchRegistrations = useCallback(async () => {
    try {
      const res = await fetch('/api/registrations');
      if (res.ok) {
        const data: StudentRegistration[] = await res.json();
        setRegistrations(data);
        calculateStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch registrations:', err);
    }
  }, [calculateStats]);

  const fetchTrainingSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/attendance/sessions');
      if (res.ok) {
        const data: TrainingSession[] = await res.json();
        const { cleanedSessions } = filterExpiredMediaFromSessions(data);
        setTrainingSessions(cleanedSessions);
      }
    } catch (err) {
      console.error('Failed to fetch training sessions:', err);
    }
  }, []);

  // 1. Inisialisasi & Listener Real-time Cloud Firestore (Persistent Cloud Database)
  useEffect(() => {
    let unsubscribeReg: (() => void) | null = null;
    let unsubscribeSess: (() => void) | null = null;

    async function initCloudFirestore() {
      try {
        setCloudStatus('connecting');
        // Pastikan seed awal ada di Firestore jika database masih kosong
        await bootstrapFirestoreIfEmpty();

        // Subscribe real-time snapshot pendaftaran siswa
        unsubscribeReg = subscribeToRegistrations(
          (items) => {
            setRegistrations((prev) => {
              // Jika ada pendaftaran baru dari client lain, bunyikan bel & tampilkan alert
              if (prev.length > 0 && items.length > prev.length) {
                const newItems = items.filter((it) => !prev.some((p) => p.id === it.id));
                if (newItems.length > 0) {
                  const newest = newItems[0];
                  if (soundEnabled) {
                    playNotificationChime();
                  }
                  setLatestAlert({
                    id: newest.id,
                    studentName: newest.studentName,
                    timestamp: new Date().toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })
                  });
                }
              }
              return items;
            });
            calculateStats(items);
            setIsCloudConnected(true);
            setCloudStatus('connected');

            // Sinkronisasi data Firestore ke memory server secara pasif
            fetch('/api/registrations/sync-from-cloud', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ registrations: items })
            }).catch(() => {});
          },
          (err) => {
            console.warn('[Firestore] Info listener registrations, fallback ke server SSE:', err);
            setCloudStatus('offline');
          }
        );

        // Subscribe real-time snapshot sesi latihan & presensi
        unsubscribeSess = subscribeToTrainingSessions(
          (sessions) => {
            setTrainingSessions(sessions);
          },
          (err) => {
            console.warn('[Firestore] Info listener trainingSessions:', err);
          }
        );
      } catch (err) {
        console.warn('[Firestore] Setup Firestore error:', err);
        setCloudStatus('offline');
      }
    }

    initCloudFirestore();

    return () => {
      if (unsubscribeReg) unsubscribeReg();
      if (unsubscribeSess) unsubscribeSess();
    };
  }, [calculateStats, soundEnabled]);

  // 2. Establish SSE Connection sebagai channel pendukung notifikasi instan server-side
  useEffect(() => {
    fetchRegistrations();
    fetchTrainingSessions();

    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    function connectSSE() {
      setIsConnecting(true);
      eventSource = new EventSource('/api/events');

      eventSource.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
      };

      // Listener for NEW_REGISTRATION broadcast
      eventSource.addEventListener('NEW_REGISTRATION', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          const newReg: StudentRegistration = payload.registration;
          
          setRegistrations(prev => {
            if (prev.some(r => r.id === newReg.id)) return prev;
            const updated = [newReg, ...prev];
            calculateStats(updated);
            return updated;
          });

          // Play pleasant chime
          if (soundEnabled) {
            playNotificationChime();
          }

          // Trigger visual alert
          setLatestAlert({
            id: newReg.id,
            studentName: newReg.studentName,
            timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          });
        } catch (err) {
          console.error('Error parsing SSE NEW_REGISTRATION:', err);
        }
      });

      // Listener for REGISTRATION_UPDATED broadcast
      eventSource.addEventListener('REGISTRATION_UPDATED', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          const updatedReg: StudentRegistration = payload.registration;
          
          setRegistrations(prev => {
            const updated = prev.map(r => r.id === updatedReg.id ? updatedReg : r);
            calculateStats(updated);
            return updated;
          });
        } catch (err) {
          console.error('Error parsing SSE REGISTRATION_UPDATED:', err);
        }
      });

      // Listener for NOTIFICATION_SENT broadcast
      eventSource.addEventListener('NOTIFICATION_SENT', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          const { registrationId, notification } = payload;
          
          setRegistrations(prev => {
            return prev.map(r => {
              if (r.id === registrationId) {
                return {
                  ...r,
                  whatsappNotifications: [notification, ...r.whatsappNotifications]
                };
              }
              return r;
            });
          });
        } catch (err) {
          console.error('Error parsing SSE NOTIFICATION_SENT:', err);
        }
      });

      // Listener for REGISTRATION_DELETED broadcast
      eventSource.addEventListener('REGISTRATION_DELETED', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          const { id } = payload;
          setRegistrations(prev => {
            const updated = prev.filter(r => r.id !== id);
            calculateStats(updated);
            return updated;
          });
        } catch (err) {
          console.error('Error parsing SSE REGISTRATION_DELETED:', err);
        }
      });

      // Listener for ATTENDANCE_SESSION_SAVED
      eventSource.addEventListener('ATTENDANCE_SESSION_SAVED', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          const savedSession: TrainingSession = payload.session;
          setTrainingSessions(prev => {
            const exists = prev.some(s => s.id === savedSession.id);
            if (exists) {
              return prev.map(s => s.id === savedSession.id ? savedSession : s);
            }
            return [savedSession, ...prev];
          });
        } catch (err) {
          console.error('Error parsing SSE ATTENDANCE_SESSION_SAVED:', err);
        }
      });

      // Listener for ATTENDANCE_SESSION_DELETED
      eventSource.addEventListener('ATTENDANCE_SESSION_DELETED', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          const { id } = payload;
          setTrainingSessions(prev => prev.filter(s => s.id !== id));
        } catch (err) {
          console.error('Error parsing SSE ATTENDANCE_SESSION_DELETED:', err);
        }
      });

      // Listener for ATTENDANCE_SESSIONS_PURGED (Automatic 3-week media deletion)
      eventSource.addEventListener('ATTENDANCE_SESSIONS_PURGED', () => {
        fetchTrainingSessions();
      });

      // Listener for DATA_RESET
      eventSource.addEventListener('DATA_RESET', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          setRegistrations(payload.registrations);
          calculateStats(payload.registrations);
          fetchTrainingSessions();
        } catch (err) {
          console.error('Error parsing SSE DATA_RESET:', err);
        }
      });

      eventSource.onerror = () => {
        setIsConnected(false);
        setIsConnecting(false);
        if (eventSource) {
          eventSource.close();
        }
        // Auto reconnect after 3 seconds
        reconnectTimeout = setTimeout(connectSSE, 3000);
      };
    }

    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [calculateStats, soundEnabled, fetchRegistrations, fetchTrainingSessions]);

  const clearLatestAlert = () => setLatestAlert(null);

  const submitRegistration = async (data: Partial<StudentRegistration>) => {
    try {
      // 1. Generate ID unik dan Nomor Registrasi gap-filling otomatis
      // Jika di data ada anggota yang dihapus (misal ERA-2026-001 atau ERA-2026-003 dihapus),
      // getNextAvailableRegNumber membaca data aktif dan mengisi no member tersebut terlebih dahulu.
      const canonicalId = data.id || `reg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const canonicalRegNumber = data.regNumber || getNextAvailableRegNumber(registrations);
      const computedAge = data.age || calculateAgeFromBirthDate(data.birthDate);
      const nowIso = new Date().toISOString();

      const fullRecord: StudentRegistration = {
        ...data,
        id: canonicalId,
        regNumber: canonicalRegNumber,
        studentName: data.studentName || '',
        nickname: data.nickname || data.studentName?.split(' ')[0] || '',
        gender: data.gender || 'L',
        birthPlace: data.birthPlace || 'Bekasi',
        birthDate: data.birthDate || '',
        age: computedAge,
        height: data.height || '',
        weight: data.weight || '',
        jerseyNumber: data.jerseyNumber || '',
        currentSchool: data.currentSchool || '',
        parentName: data.parentName || '',
        parentRole: (data.parentRole as 'Ayah' | 'Ibu' | 'Wali') || 'Ayah',
        whatsapp: data.whatsapp || '',
        email: data.email || '',
        address: data.address || '',
        subdistrict: data.subdistrict || '',
        district: data.district || '',
        city: data.city || 'BEKASI',
        programId: 'volleyball-kids',
        programName: 'Volleyball Training for Kids',
        branch: 'Kelas Utama',
        preferredSchedule: "Rabu & Jum'at (18.45 - 21.00 WIB)",
        specialNotes: data.specialNotes || '',
        photoUrl: data.photoUrl || '',
        status: data.status || 'Register',
        adminNotes: 'Pendaftaran mandiri baru masuk via formulir online orang tua. Sistem otomatis membaca nomor anggota terkecil.',
        whatsappNotifications: [
          {
            id: `wa_${Date.now()}`,
            type: 'REGISTRATION_CONFIRMATION',
            title: 'Notifikasi Otomatis Registrasi Baru',
            sentAt: nowIso,
            sentBy: 'System Auto-Engine',
            message: `Pendaftaran ${data.studentName} (No. Reg: ${canonicalRegNumber}, Jersey: #${data.jerseyNumber}) untuk kelas Volleyball Training for Kids berhasil dicatat di ERA Kids Management.`,
            status: 'TERKIRIM',
            targetNumber: data.whatsapp || ''
          }
        ],
        createdAt: nowIso,
        updatedAt: nowIso
      };

      // 2. Simpan ke Cloud Firestore untuk persistensi permanen
      let firestoreSaved: StudentRegistration | null = null;
      try {
        firestoreSaved = await saveRegistrationToFirestore(fullRecord);
      } catch (fsErr) {
        console.warn('[Firestore] Gagal menyimpan ke Firestore langsung, sinkronisasi server:', fsErr);
      }

      // 3. Simpan juga ke Server API dengan data yang SAMA PERSIS (ID & regNumber sama)
      let serverResult: any = null;
      try {
        const res = await fetch('/api/registrations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(firestoreSaved || fullRecord)
        });
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          serverResult = await res.json();
        }
      } catch (srvErr) {
        console.warn('[Server] Sinkronisasi server API:', srvErr);
      }

      const finalReg = firestoreSaved || serverResult?.registration || fullRecord;

      // 4. Update state lokal dengan proteksi deduplikasi ketat
      setRegistrations(prev => {
        // Jika sudah ada record dengan ID ini atau regNumber ini, jangan duplikasi
        if (prev.some(r => r.id === finalReg.id || (r.regNumber === finalReg.regNumber && r.studentName.toUpperCase() === finalReg.studentName.toUpperCase()))) {
          return prev;
        }
        const updated = [finalReg, ...prev];
        calculateStats(updated);
        return updated;
      });

      return { success: true, registration: finalReg };
    } catch (err: any) {
      console.error('Error submitting registration:', err);
      return { success: false, error: err.message || 'Koneksi jaringan terganggu' };
    }
  };

  const updateRegistration = async (id: string, updates: Partial<StudentRegistration>) => {
    try {
      // 1. Simpan ke Cloud Firestore
      updateRegistrationInFirestore(id, updates).catch(e => console.warn('[Firestore] update error:', e));

      // 2. Sinkron ke Server API
      const res = await fetch(`/api/registrations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      // Optimistic local state update
      setRegistrations(prev => {
        const updated = prev.map(r => r.id === id ? { ...r, ...updates } : r);
        calculateStats(updated);
        return updated;
      });

      return res.ok;
    } catch (err) {
      console.error('Error updating registration:', err);
      return false;
    }
  };

  const deleteRegistration = async (id: string) => {
    try {
      // 1. Optimistic update state lokal
      setRegistrations(prev => {
        const updated = prev.filter(r => r.id !== id);
        calculateStats(updated);
        return updated;
      });

      // 2. Hapus dari Cloud Firestore
      try {
        await deleteRegistrationFromFirestore(id);
      } catch (e) {
        console.warn('[Firestore] delete error:', e);
      }

      // 3. Hapus dari Server API (SSE & express memory)
      await fetch(`/api/registrations/${id}`, {
        method: 'DELETE'
      }).catch(e => console.warn('[Server] delete error:', e));

      return true;
    } catch (err) {
      console.error('Error deleting registration:', err);
      return true;
    }
  };

  const sendWhatsAppNotification = async (
    id: string,
    notificationData: {
      type: WhatsAppNotificationType;
      title: string;
      message: string;
      targetNumber: string;
      sentBy: string;
    }
  ) => {
    try {
      addWhatsAppNotificationInFirestore(id, notificationData).catch(e => console.warn('[Firestore] wa notify error:', e));
      const res = await fetch(`/api/registrations/${id}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationData)
      });
      if (res.ok) {
        const result = await res.json();
        return result.notification;
      }
      return null;
    } catch (err) {
      console.error('Error recording WhatsApp notification:', err);
      return null;
    }
  };

  const saveTrainingSession = async (sessionData: Partial<TrainingSession>) => {
    try {
      // 1. Simpan ke Cloud Firestore (Permanen)
      let fsSession: TrainingSession | null = null;
      try {
        fsSession = await saveTrainingSessionToFirestore(sessionData);
      } catch (fsErr) {
        console.warn('[Firestore] Gagal simpan sesi ke Firestore langsung:', fsErr);
      }

      // 2. Sinkron ke Server API
      const res = await fetch('/api/attendance/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fsSession || sessionData)
      });

      const finalSession = fsSession || (res.ok ? (await res.json()).session : null);
      if (finalSession) {
        setTrainingSessions(prev => {
          const exists = prev.some(s => s.id === finalSession.id);
          if (exists) {
            return prev.map(s => s.id === finalSession.id ? finalSession : s);
          }
          return [finalSession, ...prev];
        });
        return { success: true, session: finalSession };
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Gagal menyimpan sesi presensi' }));
        return { success: false, error: errorData.error || 'Terjadi kesalahan sistem' };
      }

      return { success: true, session: fsSession };
    } catch (err: any) {
      console.error('Error saving training session:', err);
      return { success: false, error: err.message || 'Gagal menyimpan sesi presensi' };
    }
  };

  const deleteTrainingSession = async (id: string) => {
    try {
      deleteTrainingSessionFromFirestore(id).catch(e => console.warn('[Firestore] delete session error:', e));
      const res = await fetch(`/api/attendance/sessions/${id}`, { method: 'DELETE' });
      setTrainingSessions(prev => prev.filter(s => s.id !== id));
      return res.ok || res.status === 404;
    } catch (err) {
      console.error('Network error deleting training session:', err);
      setTrainingSessions(prev => prev.filter(s => s.id !== id));
      return true;
    }
  };

  const resetDemoData = async () => {
    try {
      await resetDemoDataInFirestore();
      await fetch('/api/reset-demo', { method: 'POST' });
    } catch (err) {
      console.error('Error resetting demo:', err);
    }
  };

  return (
    <RealtimeContext.Provider
      value={{
        registrations,
        trainingSessions,
        stats,
        isConnected,
        isConnecting,
        isCloudConnected,
        cloudStatus,
        latestAlert,
        clearLatestAlert,
        fetchRegistrations,
        fetchTrainingSessions,
        submitRegistration,
        updateRegistration,
        deleteRegistration,
        saveTrainingSession,
        deleteTrainingSession,
        sendWhatsAppNotification,
        resetDemoData,
        soundEnabled,
        setSoundEnabled
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};
