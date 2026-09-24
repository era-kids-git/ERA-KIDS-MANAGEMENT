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
import { StudentRegistration, TrainingSession, WhatsAppNotification } from '../types';
import { INITIAL_SEED_REGISTRATIONS, INITIAL_SEED_TRAINING_SESSIONS } from '../data/initialData';
import { filterExpiredMediaFromSessions, isMediaExpired } from '../utils/mediaRetention';
import { getNextAvailableRegNumber, calculateAgeFromBirthDate } from '../utils/regNumber';

export const REGISTRATIONS_COLLECTION = 'registrations';
export const TRAINING_SESSIONS_COLLECTION = 'training_sessions';

/**
 * Inisialisasi data awal di Firestore jika koleksi masih kosong
 */
export async function bootstrapFirestoreIfEmpty(): Promise<void> {
  try {
    const regRef = collection(db, REGISTRATIONS_COLLECTION);
    const regSnapshot = await getDocs(regRef);

    if (regSnapshot.empty) {
      console.log('[Firestore] Koleksi registrations kosong. Mengisi data awal ke Cloud Firestore...');
      const batch = writeBatch(db);
      for (const item of INITIAL_SEED_REGISTRATIONS) {
        const itemDoc = doc(db, REGISTRATIONS_COLLECTION, item.id);
        batch.set(itemDoc, item);
      }
      await batch.commit();
      console.log('[Firestore] Data awal pendaftaran berhasil di-bootstrap ke Firestore!');
    }

    const sessRef = collection(db, TRAINING_SESSIONS_COLLECTION);
    const sessSnapshot = await getDocs(sessRef);

    if (sessSnapshot.empty) {
      console.log('[Firestore] Koleksi training_sessions kosong. Mengisi sesi awal ke Cloud Firestore...');
      const batch = writeBatch(db);
      for (const item of INITIAL_SEED_TRAINING_SESSIONS) {
        const itemDoc = doc(db, TRAINING_SESSIONS_COLLECTION, item.id);
        batch.set(itemDoc, item);
      }
      await batch.commit();
      console.log('[Firestore] Data awal sesi presensi berhasil di-bootstrap ke Firestore!');
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
 */
export async function saveTrainingSessionToFirestore(sessionData: Partial<TrainingSession>): Promise<TrainingSession> {
  const id = sessionData.id || `session_${Date.now()}`;
  const nowIso = new Date().toISOString();

  // Hitung ringkasan statistik kehadiran
  const records = sessionData.records || [];
  let hadir = 0;
  let izin = 0;
  let sakit = 0;
  let alpa = 0;

  for (const r of records) {
    if (r.status === 'Hadir') hadir++;
    else if (r.status === 'Izin') izin++;
    else if (r.status === 'Sakit') sakit++;
    else if (r.status === 'Alpa' || r.status === 'Tidak Hadir') alpa++;
  }

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
      tidakHadir: sakit + alpa,
      sakit,
      alpa
    },
    notes: sessionData.notes || '',
    photos: sessionData.photos || [],
    documentationMedia: sessionData.documentationMedia || [],
    createdAt: sessionData.createdAt || nowIso,
    updatedAt: nowIso
  };

  const docRef = doc(db, TRAINING_SESSIONS_COLLECTION, id);
  await setDoc(docRef, payload, { merge: true });
  return payload;
}

/**
 * Hapus sesi latihan dari Firestore
 */
export async function deleteTrainingSessionFromFirestore(id: string): Promise<void> {
  const docRef = doc(db, TRAINING_SESSIONS_COLLECTION, id);
  await deleteDoc(docRef);
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
 * Reset demo data di Firestore
 */
export async function resetDemoDataInFirestore(): Promise<void> {
  // Hapus semua dokumen registrations
  const regSnap = await getDocs(collection(db, REGISTRATIONS_COLLECTION));
  const batch1 = writeBatch(db);
  regSnap.docs.forEach((d) => batch1.delete(d.ref));
  await batch1.commit();

  // Isi ulang dengan initial seed
  const batch2 = writeBatch(db);
  for (const item of INITIAL_SEED_REGISTRATIONS) {
    batch2.set(doc(db, REGISTRATIONS_COLLECTION, item.id), item);
  }
  await batch2.commit();

  // Sesi
  const sessSnap = await getDocs(collection(db, TRAINING_SESSIONS_COLLECTION));
  const batch3 = writeBatch(db);
  sessSnap.docs.forEach((d) => batch3.delete(d.ref));
  await batch3.commit();

  const batch4 = writeBatch(db);
  for (const item of INITIAL_SEED_TRAINING_SESSIONS) {
    batch4.set(doc(db, TRAINING_SESSIONS_COLLECTION, item.id), item);
  }
  await batch4.commit();
}
