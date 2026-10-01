import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { StudentRegistration, TrainingSession, WhatsAppNotification, MediaDocumentation } from '../types';
import { INITIAL_SEED_REGISTRATIONS, INITIAL_SEED_TRAINING_SESSIONS } from '../data/initialData';
import { filterExpiredMediaFromSessions, isMediaExpired } from '../utils/mediaRetention';
import { getNextAvailableRegNumber, calculateAgeFromBirthDate } from '../utils/regNumber';

export const REGISTRATIONS_COLLECTION = 'registrations';
export const TRAINING_SESSIONS_COLLECTION = 'training_sessions';

/**
 * Inisialisasi Firestore: bersihkan data dummy jika ada, jangan isi dummy baru
 */
export async function bootstrapFirestoreIfEmpty(): Promise<void> {
  try {
    const regRef = collection(db, REGISTRATIONS_COLLECTION);
    const regSnapshot = await getDocs(regRef);

    // Jika ada data dummy sebelumnya, bersihkan agar database bersih untuk produksi
    if (!regSnapshot.empty) {
      const batch = writeBatch(db);
      let dummyFound = false;

      regSnapshot.docs.forEach((docSnap) => {
        const d = docSnap.data();
        if (
          docSnap.id.startsWith('reg_100') ||
          docSnap.id.startsWith('reg_dummy') ||
          d.studentName === 'Muhammad Rayhan Al-Fatih' ||
          d.studentName === 'Alya Shakila Putri' ||
          d.studentName === 'Kenzo Alvaro Dinata' ||
          d.studentName === 'Kenzo Pratama Wijaya' ||
          d.studentName === 'Zahra Naura Khairunnisa' ||
          d.studentName === 'Nadine Aurelia Siregar' ||
          d.studentName === 'Bima Sakti Yudhistira'
        ) {
          batch.delete(docSnap.ref);
          dummyFound = true;
        }
      });

      if (dummyFound) {
        await batch.commit();
        console.log('[Firestore] Data dummy pendaftaran berhasil dibersihkan.');
      }
    }

    const sessRef = collection(db, TRAINING_SESSIONS_COLLECTION);
    const sessSnapshot = await getDocs(sessRef);

    if (!sessSnapshot.empty) {
      const batch = writeBatch(db);
      let dummySessFound = false;

      sessSnapshot.docs.forEach((docSnap) => {
        if (docSnap.id === 'session_demo_prev' || docSnap.id.startsWith('demo_')) {
          batch.delete(docSnap.ref);
          dummySessFound = true;
        }
      });

      if (dummySessFound) {
        await batch.commit();
        console.log('[Firestore] Data dummy sesi latihan berhasil dibersihkan.');
      }
    }
  } catch (err) {
    console.warn('[Firestore] Info bootstrap Firestore:', err);
  }
}

/**
 * Real-time listener untuk data Pendaftaran (Registrations)
 */
export function subscribeToRegistrations(
  onData: (registrations: StudentRegistration[]) => void,
  onError?: (error: Error) => void
) {
  const regRef = collection(db, REGISTRATIONS_COLLECTION);
  return onSnapshot(
    regRef,
    (snapshot) => {
      const items: StudentRegistration[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ ...(docSnap.data() as StudentRegistration), id: docSnap.id });
      });

      // Urutkan berdasarkan waktu pendaftaran terbaru
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onData(items);
    },
    (err) => {
      console.error('[Firestore] Error pada subscribeToRegistrations:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Real-time listener untuk data Sesi Latihan & Presensi (Training Sessions)
 */
export function subscribeToTrainingSessions(
  onData: (sessions: TrainingSession[]) => void,
  onError?: (error: Error) => void
) {
  const sessRef = collection(db, TRAINING_SESSIONS_COLLECTION);
  return onSnapshot(
    sessRef,
    (snapshot) => {
      const items: TrainingSession[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ ...(docSnap.data() as TrainingSession), id: docSnap.id });
      });

      // Bersihkan media yang telah melewati retensi 3 minggu (21 hari)
      const { cleanedSessions, totalPurged } = filterExpiredMediaFromSessions(items);

      // Jika ada media yang baru kedaluwarsa, bersihkan juga di dokumen Firestore secara background
      if (totalPurged > 0) {
        cleanedSessions.forEach((cleanSession) => {
          const original = items.find((s) => s.id === cleanSession.id);
          if (
            original &&
            (original.documentationMedia?.length !== cleanSession.documentationMedia?.length ||
              original.photos?.length !== cleanSession.photos?.length)
          ) {
            updateDoc(doc(db, TRAINING_SESSIONS_COLLECTION, cleanSession.id), {
              documentationMedia: cleanSession.documentationMedia || [],
              photos: cleanSession.photos || []
            }).catch((e) => console.warn('[Firestore] Background media purge update error:', e));
          }
        });
      }

      // Urutkan sesi berdasarkan tanggal terbaru
      cleanedSessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      onData(cleanedSessions);
    },
    (err) => {
      console.error('[Firestore] Error pada subscribeToTrainingSessions:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Simpan atau perbarui data Pendaftaran ke Firestore
 */
export async function saveRegistrationToFirestore(data: Partial<StudentRegistration>): Promise<StudentRegistration> {
  const id = data.id || `reg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const nowIso = new Date().toISOString();

  let regNumber = data.regNumber;
  if (!regNumber) {
    try {
      const snap = await getDocs(collection(db, REGISTRATIONS_COLLECTION));
      const existingItems: StudentRegistration[] = [];
      snap.forEach(d => existingItems.push(d.data() as StudentRegistration));
      regNumber = getNextAvailableRegNumber(existingItems);
    } catch {
      regNumber = getNextAvailableRegNumber([]);
    }
  }

  const computedAge = data.age || calculateAgeFromBirthDate(data.birthDate);

  const payload: StudentRegistration = {
    ...data,
    id,
    regNumber,
    studentName: data.studentName || 'Calon Siswa',
    nickname: data.nickname || data.studentName?.split(' ')[0] || 'Siswa',
    gender: data.gender || 'L',
    birthPlace: data.birthPlace || 'Bekasi',
    birthDate: data.birthDate || '2018-01-01',
    age: computedAge,
    height: data.height || '',
    weight: data.weight || '',
    jerseyNumber: data.jerseyNumber || '',
    currentSchool: data.currentSchool || '',
    parentName: data.parentName || 'Orang Tua',
    parentRole: (data.parentRole as 'Ayah' | 'Ibu' | 'Wali') || 'Ayah',
    whatsapp: data.whatsapp || '',
    email: data.email || '',
    address: data.address || '',
    subdistrict: data.subdistrict || '',
    district: data.district || '',
    city: data.city || 'BEKASI',
    programId: data.programId || 'volleyball-kids',
    programName: data.programName || 'Volleyball Training for Kids',
    branch: data.branch || 'Kelas Utama',
    preferredSchedule: data.preferredSchedule || "Rabu & Jum'at (18.45 - 21.00 WIB)",
    specialNotes: data.specialNotes || '',
    photoUrl: data.photoUrl || '',
    status: data.status || 'Register',
    adminNotes: data.adminNotes || '',
    whatsappNotifications: data.whatsappNotifications || [],
    createdAt: data.createdAt || nowIso,
    updatedAt: nowIso
  };

  const docRef = doc(db, REGISTRATIONS_COLLECTION, id);
  await setDoc(docRef, payload, { merge: true });
  return payload;
}

/**
 * Perbarui dokumen pendaftaran
 */
export async function updateRegistrationInFirestore(id: string, updates: Partial<StudentRegistration>): Promise<void> {
  const docRef = doc(db, REGISTRATIONS_COLLECTION, id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date().toISOString()
  });
}

/**
 * Hapus dokumen pendaftaran dari Firestore
 */
export async function deleteRegistrationFromFirestore(id: string): Promise<void> {
  const docRef = doc(db, REGISTRATIONS_COLLECTION, id);
  await deleteDoc(docRef);
}

/**
 * Pulihkan atau sinkronisasi banyak data siswa sekaligus ke Cloud Firestore
 * dengan proteksi batch (maks 300 item per batch)
 */
export async function batchRestoreRegistrationsToFirestore(
  students: StudentRegistration[],
  replaceAll: boolean = false
): Promise<void> {
  if (!Array.isArray(students) || students.length === 0) return;

  if (replaceAll) {
    try {
      const snap = await getDocs(collection(db, REGISTRATIONS_COLLECTION));
      const targetIds = new Set(students.map(s => s.id));
      const deleteBatch = writeBatch(db);
      let count = 0;
      for (const d of snap.docs) {
        if (!targetIds.has(d.id)) {
          deleteBatch.delete(d.ref);
          count++;
          if (count >= 200) {
            await deleteBatch.commit();
            count = 0;
          }
        }
      }
      if (count > 0) {
        await deleteBatch.commit();
      }
    } catch (e) {
      console.warn('[Firestore] Info pembersihan data usang saat replaceAll:', e);
    }
  }

  // Simpan/perbarui data siswa dengan writeBatch bertahap
  const chunkSize = 200;
  for (let i = 0; i < students.length; i += chunkSize) {
    const chunk = students.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    for (const item of chunk) {
      const docRef = doc(db, REGISTRATIONS_COLLECTION, item.id);
      batch.set(docRef, item, { merge: true });
    }
    await batch.commit();
  }
}

/**
 * Simpan atau perbarui sesi presensi dan media dokumentasi di Firestore
 * Dilengkapi sanitasi ketat agar tidak ada nilai `undefined` yang menyebabkan
 * kegagalan simpan pada Firestore JS SDK serta proteksi ukuran dokumen.
 */
export async function saveTrainingSessionToFirestore(sessionData: Partial<TrainingSession>): Promise<TrainingSession> {
  const id = sessionData.id && sessionData.id.trim() ? sessionData.id.trim() : `session_${Date.now()}`;
  const nowIso = new Date().toISOString();

  // Hitung ringkasan statistik kehadiran & sanitasi seluruh record peserta
  const rawRecords = sessionData.records || [];
  let hadir = 0;
  let izin = 0;
  let tidakHadir = 0;
  let sakit = 0;
  let alpa = 0;

  const records = rawRecords.map((r, idx) => {
    const status = String(r.status || 'Hadir');
    if (status === 'Hadir') hadir++;
    else if (status === 'Izin') izin++;
    else if (status === 'Sakit') {
      sakit++;
      tidakHadir++;
    } else if (status === 'Alpa' || status === 'Tidak Hadir') {
      alpa++;
      tidakHadir++;
    } else {
      tidakHadir++;
    }

    return {
      studentId: String(r.studentId || `student_${idx}`),
      regNumber: String(r.regNumber || ''),
      studentName: String(r.studentName || 'Siswa'),
      nickname: String(r.nickname || r.studentName || 'Siswa'),
      gender: (r.gender === 'P' ? 'P' : 'L') as 'L' | 'P',
      age: typeof r.age === 'number' && !isNaN(r.age) ? r.age : 0,
      jerseyNumber: String(r.jerseyNumber || ''),
      photoUrl: String(r.photoUrl || ''),
      status: status,
      notes: String(r.notes || '')
    };
  });

  // Sanitasi media dokumentasi (pastikan tidak ada field undefined)
  const rawMedia = sessionData.documentationMedia || [];
  const documentationMedia: MediaDocumentation[] = rawMedia
    .filter(m => m && m.url && typeof m.url === 'string' && m.url.trim().length > 0)
    .map((m, idx) => ({
      id: String(m.id || `media_${Date.now()}_${idx}`),
      type: m.type === 'video' ? ('video' as const) : ('photo' as const),
      url: String(m.url),
      name: String(m.name || `Media ${idx + 1}`),
      sizeFormatted: String(m.sizeFormatted || ''),
      sizeBytes: typeof m.sizeBytes === 'number' ? m.sizeBytes : 0,
      uploadedAt: String(m.uploadedAt || nowIso)
    }));

  // Jika documentationMedia sudah ada, jangan duplikasi data gambar base64 di field photos
  // agar ukuran dokumen Firestore tetap sangat hemat dan tidak melebihi 1MB
  const rawPhotos = sessionData.photos || [];
  const photos = documentationMedia.length > 0
    ? []
    : rawPhotos
        .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
        .map(p => String(p));

  const payload: TrainingSession = {
    id,
    date: sessionData.date || nowIso.split('T')[0],
    timeRange: sessionData.timeRange || '18.45 - 21.00 WIB',
    sessionTitle: sessionData.sessionTitle || 'Latihan Reguler',
    coachName: sessionData.coachName || 'Pelatih Utama',
    location: sessionData.location || 'GOR VOLI KUBA',
    programName: sessionData.programName || 'Volleyball Training for Kids',
    records,
    summary: {
      total: records.length,
      hadir,
      izin,
      tidakHadir: tidakHadir > 0 ? tidakHadir : (sakit + alpa),
      sakit,
      alpa
    },
    notes: String(sessionData.notes || ''),
    photos,
    documentationMedia,
    createdAt: sessionData.createdAt || nowIso,
    updatedAt: nowIso
  };

  // Proteksi ukuran dokumen Firestore (Firestore hard limit adalah 1 MiB / 1,048,576 bytes)
  // 1. Jangan pernah duplikasi data base64 di payload.photos jika sudah ada di documentationMedia
  payload.photos = [];

  const baseSize = JSON.stringify({ ...payload, documentationMedia: [] }).length;
  const MAX_SAFE_FIRESTORE_BYTES = 850000; // 850 KB batas aman
  const MAX_SINGLE_MEDIA_BYTES = 350000;   // 350 KB per media item

  const safeMedia: MediaDocumentation[] = [];
  let currentBytes = baseSize;

  for (const m of documentationMedia) {
    const itemBytes = JSON.stringify(m).length;

    // Jika ada satu media individu yang berukuran terlalu besar (misal video 1-2MB),
    // simpan informasinya di dokumen tanpa string base64 raksasanya agar dokumen Firestore TIDAK JEBOL
    if (itemBytes > MAX_SINGLE_MEDIA_BYTES) {
      console.warn(`[Firestore] Media "${m.name}" (${Math.round(itemBytes / 1024)} KB) melebihi batas per-item Firestore (350 KB). Menyimpan metadata file.`);
      safeMedia.push({
        ...m,
        url: '', // kosongkan data base64 raksasa
        caption: (m.caption ? m.caption + ' ' : '') + '(File terlalu besar untuk database cloud, gunakan foto di bawah 300KB)'
      });
      continue;
    }

    if (currentBytes + itemBytes < MAX_SAFE_FIRESTORE_BYTES) {
      safeMedia.push(m);
      currentBytes += itemBytes;
    } else {
      console.warn(`[Firestore] Batas total dokumen 850KB tercapai. Media "${m.name}" disimpan sebagai info.`);
      safeMedia.push({
        ...m,
        url: '',
        caption: (m.caption ? m.caption + ' ' : '') + '(Melebihi kuota aman dokumen 850KB)'
      });
    }
  }

  payload.documentationMedia = safeMedia;

  // Sinkronisasi subcollection media Full HD secara presisi:
  // Hapus foto yang dibuang oleh pelatih, dan simpan/perbarui foto baru atau yang diedit
  try {
    const mediaColRef = collection(db, TRAINING_SESSIONS_COLLECTION, id, 'media');
    const existingSnap = await getDocs(mediaColRef);
    const newMediaIds = new Set(documentationMedia.map(m => m.id));

    // 1. Hapus berkas foto yang telah dihapus oleh pelatih dari Firestore subcollection
    const deletePromises: Promise<any>[] = [];
    existingSnap.forEach(d => {
      if (!newMediaIds.has(d.id)) {
        deletePromises.push(deleteDoc(d.ref));
      }
    });
    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
      console.log(`[Firestore] ${deletePromises.length} foto yang dihapus pelatih berhasil dibersihkan dari subcollection.`);
    }

    // 2. Simpan atau perbarui berkas foto aktif (resolusi Full HD)
    if (documentationMedia.length > 0) {
      await Promise.all(
        documentationMedia.map(async (m) => {
          if (m.url && m.url.trim().length > 0) {
            await setDoc(doc(mediaColRef, m.id), m, { merge: true });
          }
        })
      );
      console.log(`[Firestore] ${documentationMedia.length} foto HD aktif disinkronkan ke subcollection.`);
    }
  } catch (subErr) {
    console.warn('[Firestore] Info sinkronisasi media subcollection:', subErr);
  }

  // Verifikasi final mutlak: jika ukuran serialisasi JSON masih mendekati 950,000 bytes,
  // pangkas media secara darurat sehingga setDoc() DIJAMIN 100% TIDAK PERNAH DITOLAK FIRESTORE!
  let finalJsonLen = JSON.stringify(payload).length;
  if (finalJsonLen > 950000) {
    console.warn(`[Firestore] Dokumen akhir (${finalJsonLen} bytes) masih melebihi batas aman. Mengamankan data presensi.`);
    while (payload.documentationMedia.length > 0 && JSON.stringify(payload).length > 950000) {
      payload.documentationMedia.pop();
    }
  }

  const docRef = doc(db, TRAINING_SESSIONS_COLLECTION, id);
  await setDoc(docRef, payload, { merge: true });
  return payload;
}

/**
 * Listener real-time untuk subcollection media sesi latihan
 * Otomatis memperbarui foto saat pelatih menambah, mengedit, atau menghapus foto
 */
export function subscribeToSessionMedia(
  sessionId: string,
  onData: (media: MediaDocumentation[]) => void,
  onError?: (err: Error) => void
) {
  const mediaColRef = collection(db, TRAINING_SESSIONS_COLLECTION, sessionId, 'media');
  return onSnapshot(
    mediaColRef,
    (snapshot) => {
      const list: MediaDocumentation[] = [];
      snapshot.forEach((docSnap) => {
        const item = docSnap.data() as MediaDocumentation;
        if (item && item.url && item.url.trim().length > 0) {
          list.push(item);
        }
      });
      list.sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime());
      onData(list);
    },
    (err) => {
      console.warn(`[Firestore] Error subscribeToSessionMedia for ${sessionId}:`, err);
      if (onError) onError(err);
    }
  );
}

/**
 * Ambil daftar media dokumentasi HD lengkap dari subcollection sesi
 */
export async function getSessionMediaFromFirestore(sessionId: string): Promise<MediaDocumentation[]> {
  try {
    const mediaColRef = collection(db, TRAINING_SESSIONS_COLLECTION, sessionId, 'media');
    const snap = await getDocs(mediaColRef);
    const list: MediaDocumentation[] = [];
    snap.forEach((docSnap) => {
      const item = docSnap.data() as MediaDocumentation;
      if (item && item.url && item.url.trim().length > 0) {
        list.push(item);
      }
    });
    return list;
  } catch (err) {
    console.warn('[Firestore] Gagal memuat media HD dari subcollection:', err);
    return [];
  }
}

/**
 * Hapus sesi latihan dari Firestore
 */
export async function deleteTrainingSessionFromFirestore(id: string): Promise<void> {
  try {
    const mediaColRef = collection(db, TRAINING_SESSIONS_COLLECTION, id, 'media');
    const mediaSnap = await getDocs(mediaColRef);
    const batch = writeBatch(db);
    mediaSnap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(db, TRAINING_SESSIONS_COLLECTION, id));
    await batch.commit();
  } catch {
    const docRef = doc(db, TRAINING_SESSIONS_COLLECTION, id);
    await deleteDoc(docRef);
  }
}

/**
 * Catat riwayat notifikasi WhatsApp pada dokumen pendaftaran
 */
export async function addWhatsAppNotificationInFirestore(
  regId: string,
  notification: {
    type: string;
    title: string;
    message: string;
    targetNumber: string;
    sentBy: string;
  }
): Promise<WhatsAppNotification> {
  const newNotification: WhatsAppNotification = {
    id: `wa_${Date.now()}`,
    type: notification.type as any,
    title: notification.title,
    sentAt: new Date().toISOString(),
    sentBy: notification.sentBy,
    message: notification.message,
    status: 'TERKIRIM',
    targetNumber: notification.targetNumber
  };

  const docRef = doc(db, REGISTRATIONS_COLLECTION, regId);
  // Ambil data lama atau append
  const snap = await getDocs(collection(db, REGISTRATIONS_COLLECTION));
  const found = snap.docs.find((d) => d.id === regId);
  if (found) {
    const existing = found.data().whatsappNotifications || [];
    await updateDoc(docRef, {
      whatsappNotifications: [newNotification, ...existing],
      updatedAt: new Date().toISOString()
    });
  }

  return newNotification;
}

/**
 * Kosongkan semua data di Cloud Firestore untuk lingkungan produksi
 */
export async function clearAllDataFromFirestore(): Promise<void> {
  try {
    const regSnap = await getDocs(collection(db, REGISTRATIONS_COLLECTION));
    if (!regSnap.empty) {
      const batch1 = writeBatch(db);
      regSnap.docs.forEach((d) => batch1.delete(d.ref));
      await batch1.commit();
    }

    const sessSnap = await getDocs(collection(db, TRAINING_SESSIONS_COLLECTION));
    if (!sessSnap.empty) {
      const batch2 = writeBatch(db);
      sessSnap.docs.forEach((d) => batch2.delete(d.ref));
      await batch2.commit();
    }
    console.log('[Firestore] Semua data Firestore berhasil dikosongkan.');
  } catch (err) {
    console.warn('[Firestore] Error saat mengosongkan data Firestore:', err);
  }
}

/**
 * Reset / kosongkan data di Firestore
 */
export async function resetDemoDataInFirestore(): Promise<void> {
  await clearAllDataFromFirestore();
}
