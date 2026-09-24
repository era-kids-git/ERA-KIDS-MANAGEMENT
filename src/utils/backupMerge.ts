import { StudentRegistration, WhatsAppNotification } from '../types.ts';
import { calculateAgeFromBirthDate } from './regNumber';

export interface FileParseSummary {
  fileName: string;
  fileSizeBytes: number;
  extractedCount: number;
}

export interface MergeDeduplicateResult {
  mergedStudents: StudentRegistration[];
  totalRawFound: number;
  duplicatesResolved: number;
  newStudentsCount: number;
  updatedStudentsCount: number;
}

/**
 * Normalisasi string teks untuk perbandingan (lowercase, hilangkan spasi ganda, trim)
 */
export function normalizeText(text?: string | null): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalisasi nomor WhatsApp/Telepon untuk perbandingan anti-duplikat
 * contoh: "0812-3456-7890" -> "81234567890", "+62 812-3456" -> "8123456"
 */
export function normalizePhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.startsWith('62')) {
    return digitsOnly.substring(2).replace(/^0+/, '');
  }
  return digitsOnly.replace(/^0+/, '');
}

/**
 * Cek apakah dua record siswa merupakan orang yang sama (Duplikat)
 */
export function isSameStudent(
  a: Partial<StudentRegistration>,
  b: Partial<StudentRegistration>
): boolean {
  if (!a || !b) return false;

  // 1. ID dokumen Firestore/Server sama persis
  if (a.id && b.id && a.id.trim() === b.id.trim()) {
    return true;
  }

  // 2. Nomor Registrasi resmi sama persis (misal: "ERA-2026-001")
  if (
    a.regNumber &&
    b.regNumber &&
    a.regNumber.trim().toUpperCase() === b.regNumber.trim().toUpperCase()
  ) {
    return true;
  }

  const nameA = normalizeText(a.studentName);
  const nameB = normalizeText(b.studentName);

  if (nameA && nameB && nameA === nameB) {
    // Nama sama persis & Tanggal lahir sama
    if (a.birthDate && b.birthDate && a.birthDate.trim() === b.birthDate.trim()) {
      return true;
    }

    // Nama sama persis & No WhatsApp wali sama (minimal 6 digit)
    const phoneA = normalizePhoneNumber(a.whatsapp);
    const phoneB = normalizePhoneNumber(b.whatsapp);
    if (phoneA && phoneB && phoneA === phoneB && phoneA.length >= 6) {
      return true;
    }

    // Nama sama persis & Nama Orang Tua/Wali sama
    const parentA = normalizeText(a.parentName);
    const parentB = normalizeText(b.parentName);
    if (parentA && parentB && parentA === parentB && parentA.length >= 3) {
      return true;
    }

    // Nama sama persis & Tempat lahir sama
    const placeA = normalizeText(a.birthPlace);
    const placeB = normalizeText(b.birthPlace);
    if (placeA && placeB && placeA === placeB && placeA.length >= 3) {
      return true;
    }
  }

  return false;
}

/**
 * Menggabungkan dua record siswa yang duplikat menjadi satu record terbaik (paling lengkap)
 */
export function mergeTwoStudentRecords(
  base: StudentRegistration,
  incoming: Partial<StudentRegistration>
): StudentRegistration {
  const mergedNotifications: WhatsAppNotification[] = [
    ...(base.whatsappNotifications || [])
  ];

  if (Array.isArray(incoming.whatsappNotifications)) {
    for (const notif of incoming.whatsappNotifications) {
      if (!notif) continue;
      const exists = mergedNotifications.some(
        (n) => (n.id && n.id === notif.id) || (n.sentAt === notif.sentAt && n.type === notif.type)
      );
      if (!exists) {
        mergedNotifications.push(notif);
      }
    }
  }

  // Pilih foto terbaik: pertahankan foto Base64 asli jika incoming tidak punya atau rusak
  const photoUrl =
    (incoming.photoUrl && incoming.photoUrl.trim().length > 30)
      ? incoming.photoUrl
      : base.photoUrl;

  const birthDate = incoming.birthDate || base.birthDate || '2018-01-01';
  const age = incoming.age || base.age || calculateAgeFromBirthDate(birthDate);

  const merged: StudentRegistration = {
    ...base,
    ...incoming,
    id: base.id || incoming.id || `reg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    regNumber: base.regNumber || incoming.regNumber || '',
    studentName: incoming.studentName || base.studentName || 'Siswa',
    nickname: incoming.nickname || base.nickname || '',
    gender: (incoming.gender as 'L' | 'P') || base.gender || 'L',
    birthPlace: incoming.birthPlace || base.birthPlace || 'Bekasi',
    birthDate,
    age,
    height: incoming.height || base.height || '',
    weight: incoming.weight || base.weight || '',
    jerseyNumber: incoming.jerseyNumber || base.jerseyNumber || '',
    currentSchool: incoming.currentSchool || base.currentSchool || '',
    parentName: incoming.parentName || base.parentName || 'Orang Tua',
    parentRole: incoming.parentRole || base.parentRole || 'Ayah',
    whatsapp: incoming.whatsapp || base.whatsapp || '',
    email: incoming.email || base.email || '',
    address: incoming.address || base.address || '',
    subdistrict: incoming.subdistrict || base.subdistrict || '',
    district: incoming.district || base.district || '',
    city: incoming.city || base.city || 'BEKASI',
    programId: base.programId || incoming.programId || 'volleyball-kids',
    programName: base.programName || incoming.programName || 'Volleyball Training for Kids',
    branch: base.branch || incoming.branch || 'Kelas Utama',
    preferredSchedule: base.preferredSchedule || incoming.preferredSchedule || "Rabu & Jum'at (18.45 - 21.00 WIB)",
    specialNotes: incoming.specialNotes || base.specialNotes || '',
    photoUrl,
    status: incoming.status || base.status || 'Register',
    adminNotes: incoming.adminNotes || base.adminNotes || '',
    whatsappNotifications: mergedNotifications,
    createdAt: base.createdAt || incoming.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return merged;
}

/**
 * Parsing banyak file JSON sekaligus dari input pengguna
 */
export async function parseMultipleJsonFiles(
  files: File[]
): Promise<{
  allExtractedStudents: StudentRegistration[];
  fileSummaries: FileParseSummary[];
  parseErrors: string[];
}> {
  const allExtractedStudents: StudentRegistration[] = [];
  const fileSummaries: FileParseSummary[] = [];
  const parseErrors: string[] = [];

  for (const file of files) {
    try {
      const text = await file.text();
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch (jsonErr) {
        parseErrors.push(`File "${file.name}" bukan format JSON yang valid.`);
        continue;
      }

      let fileStudents: any[] = [];
      if (Array.isArray(parsed)) {
        fileStudents = parsed;
      } else if (parsed && Array.isArray(parsed.students)) {
        fileStudents = parsed.students;
      } else if (parsed && Array.isArray(parsed.registrations)) {
        fileStudents = parsed.registrations;
      } else if (parsed && Array.isArray(parsed.data)) {
        fileStudents = parsed.data;
      } else if (parsed && typeof parsed === 'object' && (parsed.studentName || parsed.regNumber)) {
        fileStudents = [parsed];
      }

      // Validasi record minimal
      const validItems: StudentRegistration[] = [];
      for (const item of fileStudents) {
        if (!item || typeof item !== 'object') continue;
        if (!item.studentName && !item.regNumber && !item.id) continue;

        const normalizedItem: StudentRegistration = {
          id: item.id || `reg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          regNumber: item.regNumber || '',
          studentName: item.studentName || 'Siswa',
          nickname: item.nickname || item.studentName?.split(' ')[0] || '',
          gender: (item.gender as 'L' | 'P') || 'L',
          birthPlace: item.birthPlace || 'Bekasi',
          birthDate: item.birthDate || '2018-01-01',
          age: item.age || calculateAgeFromBirthDate(item.birthDate),
          height: item.height || '',
          weight: item.weight || '',
          jerseyNumber: item.jerseyNumber || '',
          currentSchool: item.currentSchool || '',
          parentName: item.parentName || 'Orang Tua',
          parentRole: (item.parentRole as 'Ayah' | 'Ibu' | 'Wali') || 'Ayah',
          whatsapp: item.whatsapp || '',
          email: item.email || '',
          address: item.address || '',
          subdistrict: item.subdistrict || '',
          district: item.district || '',
          city: item.city || 'BEKASI',
          programId: 'volleyball-kids',
          programName: 'Volleyball Training for Kids',
          branch: 'Kelas Utama',
          preferredSchedule: "Rabu & Jum'at (18.45 - 21.00 WIB)",
          specialNotes: item.specialNotes || '',
          photoUrl: item.photoUrl || '',
          status: item.status || 'Register',
          adminNotes: item.adminNotes || '',
          whatsappNotifications: item.whatsappNotifications || [],
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: item.updatedAt || new Date().toISOString(),
          ...item
        };

        validItems.push(normalizedItem);
      }

      allExtractedStudents.push(...validItems);
      fileSummaries.push({
        fileName: file.name,
        fileSizeBytes: file.size,
        extractedCount: validItems.length
      });
    } catch (err: any) {
      parseErrors.push(`Gagal membaca file "${file.name}": ${err?.message || 'Error tidak diketahui'}`);
    }
  }

  return {
    allExtractedStudents,
    fileSummaries,
    parseErrors
  };
}

/**
 * Menggabungkan seluruh data dari beberapa file JSON dan menghapus/menggabungkan duplikat.
 * Jika `mode === 'merge_with_current'`, data juga digabungkan dengan database yang sedang aktif saat ini.
 */
export function mergeAndDeduplicateStudents(
  incomingStudents: StudentRegistration[],
  currentDatabase: StudentRegistration[] = [],
  mode: 'merge_with_current' | 'replace_current' = 'merge_with_current'
): MergeDeduplicateResult {
  const totalRawFound = incomingStudents.length;
  let duplicatesResolved = 0;
  let newStudentsCount = 0;
  let updatedStudentsCount = 0;

  // 1. Deduplikasi antar file incoming itu sendiri
  const intraDeduplicated: StudentRegistration[] = [];
  for (const inc of incomingStudents) {
    const existingIndex = intraDeduplicated.findIndex((target) => isSameStudent(target, inc));
    if (existingIndex >= 0) {
      // Duplikat ditemukan antar file JSON, gabungkan informasi terlengkap
      intraDeduplicated[existingIndex] = mergeTwoStudentRecords(intraDeduplicated[existingIndex], inc);
      duplicatesResolved++;
    } else {
      intraDeduplicated.push(inc);
    }
  }

  // 2. Jika mode replace_current: hasil hanya dari file-file JSON yang diunggah
  if (mode === 'replace_current') {
    return {
      mergedStudents: intraDeduplicated,
      totalRawFound,
      duplicatesResolved,
      newStudentsCount: intraDeduplicated.length,
      updatedStudentsCount: 0
    };
  }

  // 3. Mode merge_with_current: gabungkan dengan database yang sedang ada di sistem
  const finalMerged: StudentRegistration[] = [...currentDatabase];

  for (const inc of intraDeduplicated) {
    const currentIdx = finalMerged.findIndex((curr) => isSameStudent(curr, inc));
    if (currentIdx >= 0) {
      // Siswa sudah ada di database sistem: perbarui & lengkapi data, jangan buat duplikat baru!
      finalMerged[currentIdx] = mergeTwoStudentRecords(finalMerged[currentIdx], inc);
      duplicatesResolved++;
      updatedStudentsCount++;
    } else {
      // Siswa benar-benar baru, tambahkan ke database
      finalMerged.push(inc);
      newStudentsCount++;
    }
  }

  return {
    mergedStudents: finalMerged,
    totalRawFound,
    duplicatesResolved,
    newStudentsCount,
    updatedStudentsCount
  };
}
