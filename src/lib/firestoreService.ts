import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDoc,
  writeBatch,
  query,
  where
} from 'firebase/firestore';
import { db } from './firebase';
import { StudentRegistration, TrainingSession, WhatsAppNotification, MediaDocumentation } from '../types';
import { INITIAL_SEED_REGISTRATIONS, INITIAL_SEED_TRAINING_SESSIONS } from '../data/initialData';
import { filterExpiredMediaFromSessions, isMediaExpired } from '../utils/mediaRetention';
import { getNextAvailableRegNumber, calculateAgeFromBirthDate } from '../utils/regNumber';

export const REGISTRATIONS_COLLECTION = 'registrations';
export const TRAINING_SESSIONS_COLLECTION = 'training_sessions';
export const TRAINING_MEDIA_COLLECTION = 'training_media';

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
 * PENYIMPANAN DIPISAHKAN SECARA TOTAL:
 * 1. Data teks presensi siswa disimpan di database koleksi 'training_sessions' (sangat ringan ~4-8KB, 100% aman dan permanen).
 * 2. Berkas foto & video dokumentasi disimpan di database koleksi terpisah 'training_media'.
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
      photoUrl: '', // CRITICAL: Pas foto tersimpan di registrasi siswa, tidak diduplikasi ke sesi agar ukuran dokumen sangat kecil (~5KB) dan tidak pernah melebihi batas 1MB
      status: status,
      notes: String(r.notes || '')
    };
  });

  // Sanitasi berkas media dokumentasi foto & video
  const rawMedia = sessionData.documentationMedia || [];
  const validMediaList: MediaDocumentation[] = rawMedia
    .filter(m => m && m.url && typeof m.url === 'string' && m.url.trim().length > 0)
    .map((m, idx) => ({
      id: String(m.id || `media_${Date.now()}_${idx}`),
      sessionId: id,
      type: m.type === 'video' ? ('video' as const) : ('photo' as const),
      url: String(m.url),
      name: String(m.name || `Media ${idx + 1}`),
      sizeFormatted: String(m.sizeFormatted || ''),
      sizeBytes: typeof m.sizeBytes === 'number' ? m.sizeBytes : 0,
      uploadedAt: String(m.uploadedAt || nowIso),
      caption: String(m.caption || '')
    }));

  // 1. SIMPAN DATA PRESENSI HANYA KE DATABASE 'training_sessions'
  // Bersih dari data Base64 gambar agar dokumen sangat ringan (~4-8 KB) dan 100% tidak akan pernah hilang atau gagal
  const sessionPayload: TrainingSession = {
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
    photos: [],
    documentationMedia: validMediaList.map(m => ({
      id: m.id,
      sessionId: id,
      type: m.type,
      name: m.name,
      sizeFormatted: m.sizeFormatted,
      sizeBytes: m.sizeBytes,
      uploadedAt: m.uploadedAt,
      caption: m.caption,
      url: '' // Tidak menyimpan base64 di training_sessions!
    })),
    mediaCount: validMediaList.length,
    createdAt: sessionData.createdAt || nowIso,
    updatedAt: nowIso
  };

  // Simpan dokumen presensi secara bersih ke Firestore training_sessions (tanpa merge: true agar bersih 100%)
  const docRef = doc(db, TRAINING_SESSIONS_COLLECTION, id);
  await setDoc(docRef, sessionPayload);
  console.log(`[Firestore] Sesi presensi '${id}' berhasil disimpan secara permanen di database 'training_sessions'.`);

  // 2. SIMPAN BERKAS FOTO & VIDEO KE DATABASE TERPISAH 'training_media'
  try {
    // Cari media yang sudah tersimpan di training_media untuk sesi ini
    const mediaQ = query(collection(db, TRAINING_MEDIA_COLLECTION), where('sessionId', '==', id));
    const existingSnap = await getDocs(mediaQ);
    const newMediaIds = new Set(validMediaList.map(m => m.id));

    // A. Hapus foto yang dibuang oleh pelatih dari database training_media
    const deletePromises: Promise<any>[] = [];
    existingSnap.forEach(d => {
      if (!newMediaIds.has(d.id)) {
        deletePromises.push(deleteDoc(d.ref));
      }
    });
    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
      console.log(`[Firestore] ${deletePromises.length} foto lama dibersihkan dari database 'training_media'.`);
    }

    // B. Simpan berkas foto & video aktif ke dokumen tersendiri di training_media
    for (const m of validMediaList) {
      const mediaItemDoc = {
        id: m.id,
        sessionId: id,
        type: m.type,
        url: m.url, // Base64 foto Full HD
        name: m.name,
        sizeFormatted: m.sizeFormatted,
        sizeBytes: m.sizeBytes || 0,
        caption: m.caption || '',
        uploadedAt: m.uploadedAt
      };
      await setDoc(doc(db, TRAINING_MEDIA_COLLECTION, m.id), mediaItemDoc);
    }
    console.log(`[Firestore] ${validMediaList.length} media berhasil disimpan di database terpisah 'training_media'.`);
  } catch (mediaErr) {
    console.warn('[Firestore] Gagal menyimpan ke training_media:', mediaErr);
  }

  // Kembalikan objek sesi dengan media lengkap untuk state lokal aplikasi
  return {
    ...sessionPayload,
    documentationMedia: validMediaList
  };
}

/**
 * Listener real-time untuk media foto & video sesi latihan dari koleksi terpisah 'training_media'
 * Otomatis sinkron seketika saat pelatih menambah, mengedit, atau menghapus foto
 */
export function subscribeToSessionMedia(
  sessionId: string,
  onData: (media: MediaDocumentation[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(collection(db, TRAINING_MEDIA_COLLECTION), where('sessionId', '==', sessionId));
  return onSnapshot(
    q,
    async (snapshot) => {
      const list: MediaDocumentation[] = [];
      snapshot.forEach((docSnap) => {
        const item = docSnap.data() as MediaDocumentation;
        if (item && item.url && item.url.trim().length > 0) {
          list.push(item);
        }
      });

      // Fallback: Jika di training_media masih kosong, periksa apakah ada di subcollection lama
      if (list.length === 0) {
        try {
          const oldSubSnap = await getDocs(collection(db, TRAINING_SESSIONS_COLLECTION, sessionId, 'media'));
          oldSubSnap.forEach(d => {
            const item = d.data() as MediaDocumentation;
            if (item && item.url && item.url.trim().length > 0) {
              list.push(item);
            }
          });
        } catch {}
      }

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
 * Ambil daftar media dokumentasi HD lengkap dari koleksi terpisah 'training_media'
 */
export async function getSessionMediaFromFirestore(sessionId: string): Promise<MediaDocumentation[]> {
  try {
    const q = query(collection(db, TRAINING_MEDIA_COLLECTION), where('sessionId', '==', sessionId));
    const snap = await getDocs(q);
    const list: MediaDocumentation[] = [];
    snap.forEach((docSnap) => {
      const item = docSnap.data() as MediaDocumentation;
      if (item && item.url && item.url.trim().length > 0) {
        list.push(item);
      }
    });

    // Fallback: jika belum ada di training_media, cek subcollection lama
    if (list.length === 0) {
      try {
        const oldSubSnap = await getDocs(collection(db, TRAINING_SESSIONS_COLLECTION, sessionId, 'media'));
        oldSubSnap.forEach(d => {
          const item = d.data() as MediaDocumentation;
          if (item && item.url && item.url.trim().length > 0) {
            list.push(item);
          }
        });
      } catch {}
    }

    list.sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime());
    return list;
  } catch (err) {
    console.warn('[Firestore] Gagal memuat media dari training_media:', err);
    return [];
  }
}

/**
 * Hapus sesi latihan dari database 'training_sessions' dan bersihkan media dari 'training_media'
 */
export async function deleteTrainingSessionFromFirestore(id: string): Promise<void> {
  try {
    // 1. Hapus dokumen presensi dari training_sessions
    await deleteDoc(doc(db, TRAINING_SESSIONS_COLLECTION, id));

    // 2. Hapus semua foto/video terkait dari database training_media
    try {
      const mediaQ = query(collection(db, TRAINING_MEDIA_COLLECTION), where('sessionId', '==', id));
      const mediaSnap = await getDocs(mediaQ);
      const batch = writeBatch(db);
      mediaSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    } catch {}

    // 3. Bersihkan subcollection lama jika ada
    try {
      const oldSubSnap = await getDocs(collection(db, TRAINING_SESSIONS_COLLECTION, id, 'media'));
      const batchOld = writeBatch(db);
      oldSubSnap.docs.forEach((d) => batchOld.delete(d.ref));
      await batchOld.commit();
    } catch {}

    console.log(`[Firestore] Sesi '${id}' dan seluruh medianya berhasil dihapus bersih.`);
  } catch (err) {
    console.error('[Firestore] Gagal menghapus sesi presensi:', err);
    throw err;
  }
}

/**
 * Hapus berkas foto/video tertentu dari database 'training_media' (dan subcollection lama jika ada)
 * Memastikan jika foto hilang/dihapus dari galeri, data di Firebase langsung terhapus bersih seketika.
 */
export async function deleteTrainingMediaFromFirestore(mediaId: string, sessionId?: string): Promise<void> {
  try {
    // 1. Hapus dari database training_media
    await deleteDoc(doc(db, TRAINING_MEDIA_COLLECTION, mediaId));
    console.log(`[Firestore] Media '${mediaId}' berhasil dihapus dari database 'training_media'.`);

    // 2. Jika sessionId disediakan, perbarui juga subcollection lama dan kurangi mediaCount sesi
    if (sessionId) {
      try {
        await deleteDoc(doc(db, TRAINING_SESSIONS_COLLECTION, sessionId, 'media', mediaId));
      } catch {}

      try {
        const sessionRef = doc(db, TRAINING_SESSIONS_COLLECTION, sessionId);
        const sessionSnap = await getDoc(sessionRef);
        if (sessionSnap.exists()) {
          const currentCount = sessionSnap.data()?.mediaCount || 0;
          await updateDoc(sessionRef, {
            mediaCount: Math.max(0, currentCount - 1),
            updatedAt: new Date().toISOString()
          });
        }
      } catch {}
    }
  } catch (err) {
    console.warn(`[Firestore] Gagal menghapus media '${mediaId}':`, err);
  }
}

/**
 * Khusus menyimpan dan menyinkronkan berkas foto & video ke database terpisah 'training_media'
 * Foto yang dibuang/hilang dari galeri otomatis dihapus bersih dari database Firebase.
 */
export async function saveSessionMediaOnlyToFirestore(
  sessionId: string,
  mediaList: MediaDocumentation[],
  sessionMeta?: Partial<TrainingSession>
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const nowIso = new Date().toISOString();
    const validMediaList = mediaList.filter(m => m && m.url && typeof m.url === 'string' && m.url.trim().length > 0);
    const newMediaIds = new Set(validMediaList.map(m => m.id));

    // 1. Cari media yang sudah ada di database training_media untuk sesi ini
    const mediaQ = query(collection(db, TRAINING_MEDIA_COLLECTION), where('sessionId', '==', sessionId));
    const existingSnap = await getDocs(mediaQ);

    // 2. HAPUS dari Firebase setiap foto yang sudah tidak ada / dihilangkan dari galeri
    const deletePromises: Promise<any>[] = [];
    existingSnap.forEach(d => {
      if (!newMediaIds.has(d.id)) {
        deletePromises.push(deleteDoc(d.ref));
      }
    });
    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
      console.log(`[Firestore] ${deletePromises.length} foto/video yang dibuang dari galeri berhasil dihapus dari database Firebase.`);
    }

    // 3. Simpan atau perbarui foto & video aktif ke training_media
    for (const m of validMediaList) {
      let safeUrl = m.url;
      // Safeguard mutlak Firestore: batasan panjang properti string maksimal 1.048.487 bytes
      if (safeUrl.length > 950000 && typeof window !== 'undefined' && safeUrl.startsWith('data:image/')) {
        try {
          safeUrl = await new Promise<string>((resolve) => {
            const img = new Image();
            img.src = safeUrl;
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const scale = 0.85;
              canvas.width = Math.round(img.width * scale);
              canvas.height = Math.round(img.height * scale);
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                let q = 0.78;
                let resUrl = canvas.toDataURL('image/jpeg', q);
                while (resUrl.length > 920000 && q > 0.45) {
                  q -= 0.08;
                  resUrl = canvas.toDataURL('image/jpeg', q);
                }
                resolve(resUrl);
                return;
              }
              resolve(safeUrl);
            };
            img.onerror = () => resolve(safeUrl);
          });
        } catch {
          // fallback
        }
      }

      const mediaItemDoc = {
        id: m.id,
        sessionId: sessionId,
        type: m.type,
        url: safeUrl,
        name: m.name,
        sizeFormatted: m.sizeFormatted || 'HD',
        sizeBytes: Math.round((safeUrl.length * 3) / 4),
        caption: m.caption || '',
        uploadedAt: m.uploadedAt || nowIso
      };
      await setDoc(doc(db, TRAINING_MEDIA_COLLECTION, m.id), mediaItemDoc);
    }

    // 4. Perbarui mediaCount di dokumen training_sessions atau buat dokumen sesi jika belum ada
    const lightweightMediaMeta = validMediaList.map(m => ({
      id: m.id,
      sessionId: sessionId,
      type: m.type,
      name: m.name,
      sizeFormatted: m.sizeFormatted || 'HD',
      sizeBytes: m.sizeBytes || 0,
      uploadedAt: m.uploadedAt || nowIso,
      caption: m.caption || '',
      url: '' // Clean metadata
    }));

    try {
      const sessionDocRef = doc(db, TRAINING_SESSIONS_COLLECTION, sessionId);
      const sessionSnap = await getDoc(sessionDocRef);
      if (sessionSnap.exists()) {
        await updateDoc(sessionDocRef, {
          mediaCount: validMediaList.length,
          documentationMedia: lightweightMediaMeta,
          updatedAt: nowIso
        });
      } else {
        // Jika sesi belum pernah disimpan via tombol presensi, buat dokumen header sesi otomatis
        const fallbackSession: TrainingSession = {
          id: sessionId,
          date: sessionMeta?.date || nowIso.split('T')[0],
          timeRange: sessionMeta?.timeRange || '18.45 - 21.00 WIB',
          sessionTitle: sessionMeta?.sessionTitle || 'Latihan Reguler',
          coachName: sessionMeta?.coachName || 'Pelatih Utama',
          location: sessionMeta?.location || 'GOR VOLI KUBA',
          programName: sessionMeta?.programName || 'Volleyball Training for Kids',
          records: (sessionMeta?.records || []).map(r => ({ ...r, photoUrl: '' })),
          summary: sessionMeta?.summary || {
            total: sessionMeta?.records?.length || 0,
            hadir: sessionMeta?.records?.length || 0,
            izin: 0,
            tidakHadir: 0
          },
          notes: sessionMeta?.notes || '',
          photos: [],
          documentationMedia: lightweightMediaMeta,
          mediaCount: validMediaList.length,
          createdAt: sessionMeta?.createdAt || nowIso,
          updatedAt: nowIso
        };
        await setDoc(sessionDocRef, fallbackSession);
      }
    } catch (e) {
      console.warn('[Firestore] Info update/create header pada sesi:', e);
    }

    console.log(`[Firestore] Berhasil menyimpan ${validMediaList.length} media untuk sesi '${sessionId}'.`);
    return { success: true, count: validMediaList.length };
  } catch (err: any) {
    console.error('[Firestore] Gagal menyimpan foto/video ke training_media:', err);
    return { success: false, count: 0, error: err.message || 'Gagal menyimpan media' };
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
