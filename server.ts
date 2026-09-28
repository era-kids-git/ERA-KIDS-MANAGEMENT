import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Handle body-parser errors (like PayloadTooLargeError or malformed JSON) cleanly with JSON response
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err?.type === 'entity.too.large' || err?.status === 413) {
    return res.status(413).json({
      error: 'Ukuran foto atau data terlalu besar. Maksimal 25MB.'
    });
  }
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      error: 'Format data JSON tidak valid.'
    });
  }
  if (err) {
    return res.status(err.status || 500).json({
      error: err.message || 'Terjadi kesalahan pada server.'
    });
  }
  next();
});

// Type definition for internal server storage
interface WhatsAppNotificationRecord {
  id: string;
  type: 'REGISTRATION_CONFIRMATION' | 'TRIAL_INVITATION' | 'ACCEPTANCE_WELCOME' | 'CUSTOM';
  title: string;
  sentAt: string;
  sentBy: string;
  message: string;
  status: 'TERKIRIM' | 'TERBACA' | 'PENDING';
  targetNumber: string;
}

interface StudentRegistrationRecord {
  id: string;
  regNumber: string;
  studentName: string;
  nickname: string;
  gender: 'L' | 'P';
  birthPlace?: string;
  birthDate: string;
  age: number;
  height?: string;
  weight?: string;
  jerseyNumber: string;
  nisn?: string;
  photoUrl?: string;
  currentSchool: string;
  parentName: string;
  parentRole: 'Ayah' | 'Ibu' | 'Wali';
  whatsapp: string;
  email: string;
  address: string;
  subdistrict?: string;
  district?: string;
  city: string;
  programId: string;
  programName: string;
  branch: string;
  preferredSchedule: string;
  hasExperience: boolean;
  specialNotes?: string;
  status: 'Register' | 'Diterima' | 'Pembatalan Keanggotaan';
  adminNotes?: string;
  whatsappNotifications: WhatsAppNotificationRecord[];
  createdAt: string;
  updatedAt: string;
}

// Normalize jersey number: numbers only, strip leading zeros (e.g., '07' -> '7', '09' -> '9')
export function normalizeJerseyNumber(val: any): string {
  if (val === undefined || val === null) return '';
  const digitsOnly = val.toString().trim().replace(/\D/g, '');
  return digitsOnly.replace(/^0+/, '');
}

// Sequential registration number generator with gap-filling (reuse deleted numbers first)
export function getNextRegNumber(list: StudentRegistrationRecord[]): string {
  const usedNumbers = new Set<number>();
  if (Array.isArray(list)) {
    for (const item of list) {
      if (!item || !item.regNumber) continue;
      const match = String(item.regNumber).match(/(\d+)$/);
      if (match && match[1]) {
        const parsed = parseInt(match[1], 10);
        if (!isNaN(parsed) && parsed > 0) {
          usedNumbers.add(parsed);
        }
      }
    }
  }

  // Mulai dari 1, cari nomor terkecil yang belum terpakai / pernah dihapus
  let candidate = 1;
  while (usedNumbers.has(candidate)) {
    candidate++;
  }

  const currentYear = new Date().getFullYear();
  return `ERA-${currentYear}-${String(candidate).padStart(3, '0')}`;
}

// Empty seed dataset for clean production environment
const INITIAL_REGISTRATIONS: StudentRegistrationRecord[] = [];

// Persistent state holder
let registrations: StudentRegistrationRecord[] = [];

export interface TrainingSessionRecord {
  id: string;
  date: string;
  timeRange: string;
  sessionTitle: string;
  coachName: string;
  location: string;
  programName: string;
  records: Array<{
    studentId: string;
    regNumber: string;
    studentName: string;
    nickname: string;
    gender: 'L' | 'P';
    age: number;
    jerseyNumber?: string;
    photoUrl?: string;
    status: 'Hadir' | 'Izin' | 'Tidak Hadir' | 'Sakit' | 'Alpa';
    notes?: string;
  }>;
  summary: {
    total: number;
    hadir: number;
    izin: number;
    tidakHadir: number;
    sakit?: number;
    alpa?: number;
  };
  notes?: string;
  photos?: string[];
  documentationMedia?: Array<{
    id: string;
    type: 'photo' | 'video';
    url: string;
    name: string;
    sizeFormatted: string;
    sizeBytes?: number;
    uploadedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

// Empty training sessions for clean production environment
let trainingSessions: TrainingSessionRecord[] = [];

// Auto-deletion policy for gallery media: 3 weeks (21 days) from capture/upload date
const MEDIA_RETENTION_DAYS = 21; // 3 minggu
const MEDIA_RETENTION_MS = MEDIA_RETENTION_DAYS * 24 * 60 * 60 * 1000;

function isMediaExpired(mediaUploadedAt?: string, sessionDate?: string, sessionCreatedAt?: string, now = Date.now()): boolean {
  let captureTime: number | null = null;
  if (mediaUploadedAt) {
    const t = new Date(mediaUploadedAt).getTime();
    if (!isNaN(t)) captureTime = t;
  }
  if (!captureTime && sessionDate) {
    // Gunakan akhir hari tanggal sesi latihan (23:59:59) agar 21 hari dihitung penuh
    const t = new Date(`${sessionDate}T23:59:59`).getTime();
    if (!isNaN(t)) captureTime = t;
  }
  if (!captureTime && sessionCreatedAt) {
    const t = new Date(sessionCreatedAt).getTime();
    if (!isNaN(t)) captureTime = t;
  }
  if (!captureTime) return false;
  return (now - captureTime) > MEDIA_RETENTION_MS;
}

function purgeExpiredSessionMedia(sessions: TrainingSessionRecord[]): number {
  const now = Date.now();
  let purgedCount = 0;

  for (const session of sessions) {
    // 1. Purge modern documentationMedia
    if (session.documentationMedia && session.documentationMedia.length > 0) {
      const initialCount = session.documentationMedia.length;
      session.documentationMedia = session.documentationMedia.filter(media => {
        const expired = isMediaExpired(media.uploadedAt, session.date, session.createdAt, now);
        return !expired;
      });
      purgedCount += (initialCount - session.documentationMedia.length);
    }

    // 2. Purge legacy photos
    if (session.photos && session.photos.length > 0) {
      const expired = isMediaExpired(undefined, session.date, session.createdAt, now);
      if (expired) {
        purgedCount += session.photos.length;
        session.photos = [];
      }
    }
  }

  return purgedCount;
}

// Initial purge run on server startup
purgeExpiredSessionMedia(trainingSessions);

// Periodic background interval: check and auto-delete expired media every 30 minutes
setInterval(() => {
  const purged = purgeExpiredSessionMedia(trainingSessions);
  if (purged > 0) {
    console.log(`[Auto-Purge 3-Minggu] Sebanyak ${purged} foto/video galeri yang melebihi batas 3 minggu (21 hari) berhasil dihapus otomatis dari database.`);
    broadcastSSE('ATTENDANCE_SESSIONS_PURGED', {
      purgedCount: purged,
      timestamp: new Date().toISOString()
    });
  }
}, 30 * 60 * 1000);

// Real-Time Server-Sent Events (SSE) Client Pool
const sseClients = new Set<express.Response>();

function broadcastSSE(eventType: string, payload: any) {
  const dataString = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(dataString);
    } catch {
      sseClients.delete(client);
    }
  }
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// SSE Endpoint for real-time automatic synchronization
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Send initial connected ping
  res.write(`event: connected\ndata: ${JSON.stringify({ message: 'Connected to ERA Kids Real-time Sync Bus' })}\n\n`);

  sseClients.add(res);

  // Heartbeat ping every 20 seconds to keep connection lively
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    system: 'ERA Kids Management Real-time Backend',
    connectedClients: sseClients.size,
    totalRegistrations: registrations.length
  });
});

// GET all registrations
app.get('/api/registrations', (_req, res) => {
  // Return sorted by creation date descending (newest first)
  const sorted = [...registrations].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json(sorted);
});

// GET single registration by ID or Registration Number
app.get('/api/registrations/:query', (req, res) => {
  const query = req.params.query.trim().toLowerCase();
  const found = registrations.find(
    r => r.id.toLowerCase() === query || 
         r.regNumber.toLowerCase() === query || 
         r.whatsapp.replace(/\D/g, '').endsWith(query.replace(/\D/g, ''))
  );

  if (!found) {
    res.status(404).json({ error: 'Data registrasi tidak ditemukan' });
    return;
  }

  res.json(found);
});

// POST new student registration (From Parent Self-Registration Portal)
app.post('/api/registrations', (req, res) => {
  try {
    const {
      studentName,
      nickname,
      gender,
      birthPlace,
      birthDate,
      height,
      weight,
      jerseyNumber,
      nisn,
      photoUrl,
      currentSchool,
      parentName,
      parentRole,
      whatsapp,
      email,
      address,
      subdistrict,
      district,
      city,
      programId,
      programName,
      branch,
      preferredSchedule,
      hasExperience,
      specialNotes
    } = req.body;

    if (!studentName || !parentName || !whatsapp || !photoUrl) {
      res.status(400).json({ error: 'Semua permohonan harus melengkapi pas foto 3x4 calon siswa dahulu sebelum bisa submit.' });
      return;
    }

    const assignedGender: 'L' | 'P' = gender === 'P' ? 'P' : 'L';
    const cleanJerseyNumber = normalizeJerseyNumber(jerseyNumber);

    if (!cleanJerseyNumber) {
      res.status(400).json({ error: 'No. Jersey wajib diisi angka tanpa angka 0 di depan (contoh: 7, 10, 99).' });
      return;
    }

    // Check jersey number uniqueness separated by gender (Laki-laki / Perempuan)
    // Exclude cancelled memberships so numbers can be reused if membership is cancelled
    const jerseyConflict = registrations.find(r => {
      if (r.status === 'Pembatalan Keanggotaan') return false;
      const sameGender = r.gender === assignedGender;
      const sameNumber = normalizeJerseyNumber(r.jerseyNumber) === cleanJerseyNumber;
      return sameGender && sameNumber;
    });

    if (jerseyConflict) {
      const genderLabel = assignedGender === 'L' ? 'Laki-laki' : 'Perempuan';
      res.status(400).json({
        error: `No. Jersey ${cleanJerseyNumber} untuk kategori ${genderLabel} sudah terdaftar (${jerseyConflict.studentName}). Silakan gunakan nomor jersey lain yang masih tersedia.`
      });
      return;
    }

    // Calculate age
    let calculatedAge = 6;
    if (birthDate) {
      const birth = new Date(birthDate);
      const today = new Date();
      calculatedAge = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        calculatedAge--;
      }
    }

    // Use provided ID or generate unique ID
    const targetId = (req.body.id && String(req.body.id).trim()) || `reg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    // Use provided sequential Registration Number or calculate next available (gap-filling)
    const regNumber = (req.body.regNumber && String(req.body.regNumber).trim()) || getNextRegNumber(registrations);
    const now = req.body.createdAt || new Date().toISOString();

    // Anti-duplicate protection:
    // 1. Check if record with targetId or exact regNumber already exists
    const existingIndex = registrations.findIndex(r => r.id === targetId || (r.regNumber === regNumber && r.studentName.toUpperCase() === studentName.trim().toUpperCase()));
    if (existingIndex >= 0) {
      res.json({
        success: true,
        message: 'Registrasi sudah tercatat sebelumnya',
        registration: registrations[existingIndex]
      });
      return;
    }

    // 2. Check if identical student name and whatsapp was submitted within the last 60 seconds
    const recentDuplicate = registrations.find(r => 
      r.studentName.toUpperCase() === studentName.trim().toUpperCase() &&
      r.whatsapp === whatsapp.trim() &&
      (Date.now() - new Date(r.createdAt).getTime() < 60000)
    );
    if (recentDuplicate) {
      res.json({
        success: true,
        message: 'Registrasi sudah tercatat sebelumnya',
        registration: recentDuplicate
      });
      return;
    }

    const newRecord: StudentRegistrationRecord = {
      id: targetId,
      regNumber,
      studentName: studentName.trim(),
      nickname: (nickname || studentName.split(' ')[0] || '').trim(),
      gender: assignedGender,
      birthPlace: (birthPlace || '').trim(),
      birthDate: birthDate || '',
      age: Math.max(calculatedAge, 3),
      height: height ? height.toString().trim() : '',
      weight: weight ? weight.toString().trim() : '',
      jerseyNumber: cleanJerseyNumber,
      nisn: (nisn || '').trim(),
      photoUrl: photoUrl || '',
      currentSchool: (currentSchool || 'Belum Sekolah').trim(),
      parentName: parentName.trim(),
      parentRole: parentRole || 'Orang Tua',
      whatsapp: whatsapp.trim(),
      email: (email || '').trim(),
      address: (address || '').trim(),
      subdistrict: (subdistrict || '').trim(),
      district: (district || '').trim(),
      city: (city || 'BEKASI').trim(),
      programId: 'volleyball-kids',
      programName: 'Volleyball Training for Kids',
      branch: 'Kelas Utama',
      preferredSchedule: "Rabu & Jum'at (18.45 - 21.00 WIB)",
      hasExperience: Boolean(hasExperience),
      specialNotes: (specialNotes || '').trim(),
      status: 'Register',
      adminNotes: 'Pendaftaran mandiri baru masuk via formulir online orang tua. Sistem otomatis mengirim notifikasi data.',
      whatsappNotifications: req.body.whatsappNotifications && req.body.whatsappNotifications.length > 0 ? req.body.whatsappNotifications : [
        {
          id: `wa_${Date.now()}`,
          type: 'REGISTRATION_CONFIRMATION',
          title: 'Notifikasi Otomatis Registrasi Baru',
          sentAt: now,
          sentBy: 'System Auto-Engine',
          message: `Pendaftaran ${studentName} (No. Reg: ${regNumber}, Jersey: #${cleanJerseyNumber}) untuk kelas Volleyball Training for Kids berhasil disinkronisasi ke sistem pusat ERA Kids Management.`,
          status: 'TERKIRIM',
          targetNumber: whatsapp.trim()
        }
      ],
      createdAt: now,
      updatedAt: now
    };

    // Prepend to registrations array
    registrations.unshift(newRecord);

    // CRITICAL: BROADCAST EVENT REAL-TIME to all connected ERA Kids Management admin sessions!
    broadcastSSE('NEW_REGISTRATION', {
      registration: newRecord,
      timestamp: now,
      message: `Pendaftar baru: ${newRecord.studentName} (No. Jersey #${newRecord.jerseyNumber}, ${newRecord.gender === 'L' ? 'Laki-laki' : 'Perempuan'}) telah masuk!`
    });

    res.status(201).json({
      success: true,
      message: 'Registrasi berhasil masuk secara otomatis ke ERA Kids Management',
      registration: newRecord
    });
  } catch (error: any) {
    console.error('Error adding registration:', error);
    res.status(500).json({ error: 'Gagal memproses pendaftaran: ' + error.message });
  }
});

// POST /api/registrations/sync-from-cloud - Sync in-memory registrations with Cloud Firestore
app.post('/api/registrations/sync-from-cloud', (req, res) => {
  try {
    const { registrations: cloudList } = req.body;
    if (Array.isArray(cloudList)) {
      registrations = cloudList.map(item => ({
        ...item,
        whatsappNotifications: item.whatsappNotifications || []
      }));
    }
    res.json({ success: true, count: registrations.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH update student status or details
app.patch('/api/registrations/:id', (req, res) => {
  const { id } = req.params;
  const index = registrations.findIndex(r => r.id === id || r.regNumber === id);

  if (index === -1) {
    res.status(404).json({ error: 'Registrasi tidak ditemukan' });
    return;
  }

  const existing = registrations[index];
  const updates = req.body;

  // If jerseyNumber or gender is being updated, enforce uniqueness separated by gender
  if (updates.jerseyNumber !== undefined || updates.gender !== undefined) {
    const rawTargetJersey = updates.jerseyNumber !== undefined ? updates.jerseyNumber : existing.jerseyNumber;
    const targetJersey = normalizeJerseyNumber(rawTargetJersey);
    const targetGender = (updates.gender !== undefined ? updates.gender : existing.gender);

    if (updates.jerseyNumber !== undefined) {
      updates.jerseyNumber = targetJersey;
    }

    if (targetJersey) {
      const conflict = registrations.find(r => {
        if (r.id === existing.id) return false;
        if (r.status === 'Pembatalan Keanggotaan') return false;
        return r.gender === targetGender && normalizeJerseyNumber(r.jerseyNumber) === targetJersey;
      });

      if (conflict) {
        const genderLabel = targetGender === 'L' ? 'Laki-laki' : 'Perempuan';
        res.status(400).json({
          error: `No. Jersey ${targetJersey} untuk kategori ${genderLabel} sudah terdaftar (${conflict.studentName}).`
        });
        return;
      }
    }
  }

  const now = new Date().toISOString();

  const updated: StudentRegistrationRecord = {
    ...existing,
    ...updates,
    updatedAt: now
  };

  registrations[index] = updated;

  // Broadcast update to all clients
  broadcastSSE('REGISTRATION_UPDATED', {
    registration: updated,
    timestamp: now
  });

  res.json({
    success: true,
    registration: updated
  });
});

// POST add WhatsApp notification record (when admin sends WhatsApp)
app.post('/api/registrations/:id/notifications', (req, res) => {
  const { id } = req.params;
  const index = registrations.findIndex(r => r.id === id || r.regNumber === id);

  if (index === -1) {
    res.status(404).json({ error: 'Registrasi tidak ditemukan' });
    return;
  }

  const { type, title, message, targetNumber, sentBy } = req.body;
  const now = new Date().toISOString();

  const newNotification: WhatsAppNotificationRecord = {
    id: `wa_log_${Date.now()}`,
    type: type || 'CUSTOM',
    title: title || 'Notifikasi WhatsApp ERA Kids',
    sentAt: now,
    sentBy: sentBy || 'Admin Pusat ERA Kids',
    message: message || '',
    status: 'TERKIRIM',
    targetNumber: targetNumber || registrations[index].whatsapp
  };

  registrations[index].whatsappNotifications.unshift(newNotification);
  registrations[index].updatedAt = now;

  broadcastSSE('NOTIFICATION_SENT', {
    registrationId: registrations[index].id,
    notification: newNotification,
    timestamp: now
  });

  res.json({
    success: true,
    notification: newNotification
  });
});

// DELETE registration
app.delete('/api/registrations/:id', (req, res) => {
  const { id } = req.params;
  const index = registrations.findIndex(r => r.id === id);

  if (index !== -1) {
    const deleted = registrations.splice(index, 1)[0];
    broadcastSSE('REGISTRATION_DELETED', {
      id: deleted.id,
      regNumber: deleted.regNumber
    });
  } else {
    broadcastSSE('REGISTRATION_DELETED', {
      id,
      regNumber: ''
    });
  }

  res.json({
    success: true,
    deletedId: id
  });
});

// GET statistics summary
app.get('/api/stats', (_req, res) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCount = registrations.filter(r => r.createdAt.startsWith(todayStr)).length;

  let register = 0;
  let diterima = 0;
  let pembatalan = 0;

  for (const r of registrations) {
    if (r.status === 'Register') register++;
    else if (r.status === 'Diterima') diterima++;
    else if (r.status === 'Pembatalan Keanggotaan') pembatalan++;
  }

  res.json({
    total: registrations.length,
    today: todayCount,
    register,
    diterima,
    pembatalan
  });
});

// ----------------------------------------------------
// DATABASE BACKUP & ATTENDANCE APP INTEGRATION API
// ----------------------------------------------------

// GET /api/database/backup - Full database backup including all photos
app.get('/api/database/backup', (req, res) => {
  const timestamp = new Date().toISOString();
  const fileTimestamp = timestamp.replace(/[:.]/g, '-').slice(0, 19);

  const payload = {
    metadata: {
      application: 'ERA Kids Management System',
      academy: 'ERA Kids',
      program: 'Volleyball Training for Kids',
      exportedAt: timestamp,
      version: '1.0.0',
      totalRecords: registrations.length,
      hasPhotosIncluded: true,
      schema: 'era_kids_full_database_backup'
    },
    summary: {
      total: registrations.length,
      diterima: registrations.filter(r => r.status === 'Diterima').length,
      register: registrations.filter(r => r.status === 'Register').length,
      batal: registrations.filter(r => r.status === 'Pembatalan Keanggotaan').length
    },
    students: registrations
  };

  if (req.query.download === 'true') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="era_kids_database_backup_${fileTimestamp}.json"`);
  }

  res.json(payload);
});

// GET /api/attendance/roster - Specifically structured for the Attendance Tracking App ("app daftar kehadiran latihan siswa")
app.get('/api/attendance/roster', (req, res) => {
  const statusFilter = req.query.status as string;
  let targetList = [...registrations];

  if (statusFilter) {
    targetList = targetList.filter(r => r.status === statusFilter);
  }

  const payload = {
    academy: 'ERA Kids',
    program: 'Volleyball Training for Kids',
    defaultSchedule: "Rabu & Jum'at (18.45 - 21.00 WIB)",
    exportDate: new Date().toISOString(),
    totalActiveStudents: targetList.length,
    integrationProtocol: {
      targetApp: 'Aplikasi Daftar Kehadiran Latihan Siswa',
      matchIdentifier: 'regNumber',
      alternateIdentifier: 'jerseyNumber',
      attendanceStatuses: ['Hadir', 'Izin', 'Tidak Hadir']
    },
    roster: targetList.map(student => ({
      studentId: student.id,
      regNumber: student.regNumber,
      jerseyNumber: student.jerseyNumber || '',
      studentName: student.studentName,
      nickname: student.nickname || '',
      gender: student.gender,
      age: student.age,
      currentSchool: student.currentSchool,
      photoUrl: student.photoUrl || '', // Base64 or URL
      parentName: student.parentName,
      parentRole: student.parentRole,
      whatsapp: student.whatsapp,
      preferredSchedule: student.preferredSchedule || "Rabu & Jum'at (18.45 - 21.00 WIB)",
      status: student.status,
      attendanceDefault: 'Hadir'
    }))
  };

  if (req.query.download === 'true') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="era_kids_attendance_roster_${new Date().toISOString().slice(0, 10)}.json"`);
  }

  res.json(payload);
});

// GET /api/attendance/sessions - List all training attendance sessions
app.get('/api/attendance/sessions', (_req, res) => {
  // Purge any media older than 3 weeks before serving
  purgeExpiredSessionMedia(trainingSessions);
  const sorted = [...trainingSessions].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
  res.json(sorted);
});

// GET /api/attendance/sessions/:id - Get specific session
app.get('/api/attendance/sessions/:id', (req, res) => {
  // Purge any media older than 3 weeks before serving
  purgeExpiredSessionMedia(trainingSessions);
  const found = trainingSessions.find(s => s.id === req.params.id);
  if (!found) {
    res.status(404).json({ error: 'Sesi latihan tidak ditemukan' });
    return;
  }
  res.json(found);
});

// POST /api/attendance/purge-expired-media - On-demand purge check for media > 3 weeks old
app.post('/api/attendance/purge-expired-media', (_req, res) => {
  const purgedCount = purgeExpiredSessionMedia(trainingSessions);
  if (purgedCount > 0) {
    broadcastSSE('ATTENDANCE_SESSIONS_PURGED', {
      purgedCount,
      timestamp: new Date().toISOString()
    });
  }
  res.json({
    success: true,
    purgedCount,
    retentionDays: MEDIA_RETENTION_DAYS,
    message: `${purgedCount} foto/video yang melebihi batas simpan 3 minggu (21 hari) berhasil dihapus dari database.`
  });
});

// POST /api/attendance/sessions - Save new attendance session or update existing
app.post('/api/attendance/sessions', (req, res) => {
  try {
    // Purge expired media
    purgeExpiredSessionMedia(trainingSessions);
    const {
      id,
      date,
      timeRange,
      sessionTitle,
      coachName,
      location,
      programName,
      records,
      notes
    } = req.body;

    if (!date || !records || !Array.isArray(records)) {
      res.status(400).json({ error: 'Data sesi atau daftar kehadiran siswa tidak valid.' });
      return;
    }

    // Compute summary
    let hadir = 0;
    let izin = 0;
    let tidakHadir = 0;

    for (const r of records) {
      if (r.status === 'Hadir') hadir++;
      else if (r.status === 'Izin') izin++;
      else tidakHadir++;
    }

    const summary = {
      total: records.length,
      hadir,
      izin,
      tidakHadir
    };

    const sessionId = id || `session_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    const existingIndex = trainingSessions.findIndex(s => s.id === sessionId || (s.date === date && s.sessionTitle === sessionTitle));

    const sessionPayload: TrainingSessionRecord = {
      id: existingIndex >= 0 ? trainingSessions[existingIndex].id : sessionId,
      date,
      timeRange: timeRange || "18.45 - 21.00 WIB",
      sessionTitle: sessionTitle || "Reguler Jumat",
      coachName: coachName || "Riviansyah",
      location: location || "GOR VOLI KUBA",
      programName: programName || "Volleyball Training for Kids",
      records,
      summary,
      notes: notes || '',
      photos: req.body.photos || [],
      documentationMedia: req.body.documentationMedia || [],
      createdAt: existingIndex >= 0 ? trainingSessions[existingIndex].createdAt : nowIso,
      updatedAt: nowIso
    };

    if (existingIndex >= 0) {
      trainingSessions[existingIndex] = sessionPayload;
    } else {
      trainingSessions.unshift(sessionPayload);
    }

    // Real-time broadcast to all connected clients (Admin & Coaches)
    broadcastSSE('ATTENDANCE_SESSION_SAVED', {
      session: sessionPayload,
      timestamp: nowIso
    });

    res.json({
      success: true,
      session: sessionPayload
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Gagal menyimpan sesi presensi' });
  }
});

// DELETE /api/attendance/sessions/:id - Delete attendance session
app.delete('/api/attendance/sessions/:id', (req, res) => {
  const index = trainingSessions.findIndex(s => s.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: 'Sesi latihan tidak ditemukan' });
    return;
  }

  const [deleted] = trainingSessions.splice(index, 1);
  broadcastSSE('ATTENDANCE_SESSION_DELETED', {
    id: req.params.id,
    timestamp: new Date().toISOString()
  });

  res.json({ success: true, deletedId: deleted.id });
});

function isSameStudentRecord(a: any, b: any): boolean {
  if (!a || !b) return false;
  if (a.id && b.id && String(a.id).trim() === String(b.id).trim()) return true;
  if (a.regNumber && b.regNumber && String(a.regNumber).trim().toUpperCase() === String(b.regNumber).trim().toUpperCase()) return true;

  const nameA = String(a.studentName || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
  const nameB = String(b.studentName || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
  if (nameA && nameB && nameA === nameB) {
    if (a.birthDate && b.birthDate && String(a.birthDate).trim() === String(b.birthDate).trim()) return true;
    const phoneA = String(a.whatsapp || '').replace(/\D/g, '').replace(/^62/, '').replace(/^0+/, '');
    const phoneB = String(b.whatsapp || '').replace(/\D/g, '').replace(/^62/, '').replace(/^0+/, '');
    if (phoneA && phoneB && phoneA === phoneB && phoneA.length >= 6) return true;
  }
  return false;
}

function mergeStudentRecords(base: StudentRegistrationRecord, inc: any): StudentRegistrationRecord {
  return {
    ...base,
    ...inc,
    id: base.id || inc.id,
    regNumber: base.regNumber || inc.regNumber,
    photoUrl: (inc.photoUrl && String(inc.photoUrl).length > 30) ? inc.photoUrl : base.photoUrl,
    whatsappNotifications: [
      ...(base.whatsappNotifications || []),
      ...(inc.whatsappNotifications || []).filter((n: any) => !base.whatsappNotifications?.some((b: any) => b.id === n.id))
    ],
    updatedAt: new Date().toISOString()
  };
}

// POST /api/database/restore - Restore/import student database with anti-duplicate multi-json merge
app.post('/api/database/restore', (req, res) => {
  try {
    const { students, mode = 'merge_with_current' } = req.body;
    if (!Array.isArray(students) || students.length === 0) {
      res.status(400).json({ error: 'Data siswa tidak valid atau kosong.' });
      return;
    }

    // 1. Deduplikasi data masuk (antar file atau dalam array)
    const intraDeduplicated: StudentRegistrationRecord[] = [];
    let duplicatesPrevented = 0;
    for (const item of students) {
      const existingIdx = intraDeduplicated.findIndex(t => isSameStudentRecord(t, item));
      if (existingIdx >= 0) {
        intraDeduplicated[existingIdx] = mergeStudentRecords(intraDeduplicated[existingIdx], item);
        duplicatesPrevented++;
      } else {
        intraDeduplicated.push({
          ...item,
          id: item.id || `reg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          whatsappNotifications: item.whatsappNotifications || []
        });
      }
    }

    if (mode === 'replace_current') {
      registrations = intraDeduplicated;
    } else {
      // Gabungkan dengan data database saat ini tanpa membuat data ganda
      const resultList = [...registrations];
      for (const item of intraDeduplicated) {
        const currIdx = resultList.findIndex(t => isSameStudentRecord(t, item));
        if (currIdx >= 0) {
          resultList[currIdx] = mergeStudentRecords(resultList[currIdx], item);
          duplicatesPrevented++;
        } else {
          resultList.push(item);
        }
      }
      registrations = resultList;
    }

    broadcastSSE('DATA_RESET', {
      registrations: registrations,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      restoredCount: registrations.length,
      duplicatesPrevented,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Gagal memulihkan database' });
  }
});

// POST reset demo dataset
// POST reset / clear all data
app.post('/api/reset-demo', (_req, res) => {
  registrations = [];
  trainingSessions = [];
  broadcastSSE('DATA_RESET', {
    registrations: [],
    timestamp: new Date().toISOString()
  });
  broadcastSSE('ATTENDANCE_UPDATE', []);
  res.json({ success: true, count: 0 });
});

app.post('/api/admin/clear-all', (_req, res) => {
  registrations = [];
  trainingSessions = [];
  broadcastSSE('DATA_RESET', {
    registrations: [],
    timestamp: new Date().toISOString()
  });
  broadcastSSE('ATTENDANCE_UPDATE', []);
  res.json({ success: true, message: 'Semua data telah berhasil dikosongkan.' });
});

// ----------------------------------------------------
// VITE MIDDLEWARE / STATIC ASSETS
// ----------------------------------------------------
app.use(express.static(path.join(process.cwd(), 'public')));

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Fallback handler to guarantee index.html is always returned for all SPA navigation routes
    app.get('*', async (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      try {
        const indexPath = path.join(process.cwd(), 'index.html');
        if (fs.existsSync(indexPath)) {
          let html = fs.readFileSync(indexPath, 'utf-8');
          html = await vite.transformIndexHtml(req.originalUrl, html);
          return res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
        }
        next();
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    // Robust detection of dist folder regardless of working directory
    const candidates = [
      path.join(process.cwd(), 'dist'),
      __dirname,
      path.join(__dirname, 'dist'),
      process.cwd()
    ];
    const distPath = candidates.find(p => fs.existsSync(path.join(p, 'index.html'))) || path.join(process.cwd(), 'dist');
    
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        next();
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ERA Kids Real-time Management Server running on port ${PORT}`);
  });
}

startServer();
