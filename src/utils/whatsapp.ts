import { StudentRegistration, WhatsAppNotificationType } from '../types.ts';
import { formatBirthDate } from './dateUtils.ts';

/**
 * Normalizes Indonesian phone number to international format without + (e.g. 628123456789)
 */
export function normalizeWhatsAppNumber(rawNumber: string): string {
  let cleaned = rawNumber.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

export type WhatsAppTemplateKey = 'REGISTRATION_CONFIRMATION' | 'ACCEPTANCE_WELCOME' | 'MEMBERSHIP_CANCELLATION' | 'CUSTOM';

export interface WhatsAppTemplatesMap {
  REGISTRATION_CONFIRMATION: string;
  ACCEPTANCE_WELCOME: string;
  MEMBERSHIP_CANCELLATION: string;
  CUSTOM: string;
}

export const DEFAULT_WHATSAPP_TEMPLATES: WhatsAppTemplatesMap = {
  REGISTRATION_CONFIRMATION:
    `Halo Bapak/Ibu {parentName} 👋,\n\n` +
    `Terima kasih telah mendaftarkan ananda *{studentName}* di kelas *ERA Kids*! 🏐✨\n\n` +
    `Data registrasi telah tersimpan di sistem manajemen ERA Kids:\n` +
    `📋 *No. Registrasi:* {regNumber}\n` +
    `🎽 *No. Jersey:* #{jerseyNumber} ({gender})\n` +
    `👶 *Nama Siswa:* {studentName} ({nickname})\n` +
    `🏐 *Kelas:* ERA Kids\n` +
    `⏰ *Jadwal Latihan:* Setiap Rabu & Jum'at (18.45 - 21.00 WIB)\n` +
    `📍 *Status Saat Ini:* {status}\n\n` +
    `Tim pelatih kami akan memverifikasi berkas pendaftaran ananda. Ayah/Bunda juga dapat mengecek status pendaftaran mandiri kapan saja di Portal Orang Tua dengan memasukkan No. Registrasi: *{regNumber}*.\n\n` +
    `Salam olahraga & semangat juara,\n` +
    `*Manajemen ERA Kids* 🏐`,

  ACCEPTANCE_WELCOME:
    `Selamat Bapak/Ibu {parentName}! 🎉🏐\n\n` +
    `Kami dengan bangga mengumumkan bahwa ananda:\n\n` +
    `⭐ *{studentName}* (*{nickname}*)\n` +
    `No. Registrasi: *{regNumber}*\n` +
    `No. Jersey: *#{jerseyNumber}* ({gender})\n\n` +
    `Telah resmi *DITERIMA* sebagai siswa di kelas *ERA Kids*! 🏆\n\n` +
    `📅 *Jadwal Latihan Rutin:*\n` +
    `Setiap hari *Rabu & Jum'at*, pukul *18.45 sd. 21.00 WIB*.\n\n` +
    `Perlengkapan latihan (jersey seragam resmi) dapat diambil saat kehadiran perdana. Siswa diharapkan hadir 15 menit sebelum latihan dimulai dengan memakai sepatu olahraga dan membawa botol minum.\n\n` +
    `Selamat bergabung dan mari berlatih bersama untuk membentuk sportivitas dan teknik voli terbaik! 🏐✨\n\n` +
    `Salam hormat,\n` +
    `*Tim Pelatih & Manajemen ERA Kids*`,

  MEMBERSHIP_CANCELLATION:
    `Halo Bapak/Ibu {parentName},\n\n` +
    `Kami mengonfirmasi bahwa status keanggotaan untuk ananda *{studentName}* (No. Registrasi: *{regNumber}*) pada kelas *ERA Kids* telah diubah menjadi:\n\n` +
    `❌ *Pembatalan Keanggotaan*\n\n` +
    `No. Jersey #{jerseyNumber} telah dinonaktifkan dari sistem. Apabila Ayah/Bunda ingin mengaktifkan kembali keanggotaan ananda di kemudian hari, silakan hubungi tim manajemen kami.\n\n` +
    `Terima kasih atas kepercayaan yang telah diberikan kepada kami selama ini.\n\n` +
    `Salam hormat,\n` +
    `*Manajemen ERA Kids* 🏐`,

  CUSTOM:
    `Halo Bapak/Ibu {parentName}, ini informasi resmi dari ERA Kids mengenai ananda {studentName} (No. Reg: {regNumber}, No. Jersey: #{jerseyNumber}). Jadwal latihan: Rabu & Jum'at (18.45 - 21.00 WIB). Silakan hubungi kami untuk informasi lebih lanjut.`
};

const STORAGE_KEY_WA_TEMPLATES = 'era_kids_custom_wa_templates_v1';

export function getStoredWhatsAppTemplates(): WhatsAppTemplatesMap {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_WA_TEMPLATES) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_WHATSAPP_TEMPLATES, ...parsed };
    }
  } catch (e) {
    console.error('Gagal membaca template WhatsApp custom:', e);
  }
  return { ...DEFAULT_WHATSAPP_TEMPLATES };
}

export function saveStoredWhatsAppTemplates(templates: Partial<WhatsAppTemplatesMap>): void {
  try {
    const current = getStoredWhatsAppTemplates();
    const updated = { ...current, ...templates };
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_WA_TEMPLATES, JSON.stringify(updated));
    }
  } catch (e) {
    console.error('Gagal menyimpan template WhatsApp:', e);
  }
}

export function resetStoredWhatsAppTemplates(): WhatsAppTemplatesMap {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_WA_TEMPLATES);
    }
  } catch (e) {
    console.error('Gagal me-reset template WhatsApp:', e);
  }
  return { ...DEFAULT_WHATSAPP_TEMPLATES };
}

export function interpolateTemplate(template: string, student: StudentRegistration): string {
  const nickname = student.nickname || student.studentName.split(' ')[0] || 'Siswa';
  const genderText = student.gender === 'L' ? 'Laki-laki' : 'Perempuan';
  const jersey = student.jerseyNumber || '-';

  return template
    .replace(/{parentName}/g, student.parentName || 'Orang Tua')
    .replace(/{studentName}/g, student.studentName)
    .replace(/{nickname}/g, nickname)
    .replace(/{regNumber}/g, student.regNumber)
    .replace(/{jerseyNumber}/g, jersey)
    .replace(/{gender}/g, genderText)
    .replace(/{birthDate}/g, formatBirthDate(student.birthDate))
    .replace(/{ttl}/g, `${student.birthPlace ? student.birthPlace + ', ' : ''}${formatBirthDate(student.birthDate)}`)
    .replace(/{status}/g, student.status)
    .replace(/{branch}/g, student.branch || 'Kelas Utama')
    .replace(/{preferredSchedule}/g, student.preferredSchedule || "Rabu & Jum'at (18.45 - 21.00 WIB)")
    .replace(/{adminWhatsApp}/g, '081519660119');
}

/**
 * Generates official Indonesian WhatsApp notification message based on notification type
 */
export function generateWhatsAppMessage(
  student: StudentRegistration,
  type: WhatsAppNotificationType,
  extraParams?: { trialDate?: string; trialTime?: string; mentor?: string; customText?: string }
): { title: string; message: string; waLink: string } {
  const cleanPhone = normalizeWhatsAppNumber(student.whatsapp);
  const templates = getStoredWhatsAppTemplates();
  let message = '';
  let title = '';

  switch (type) {
    case 'REGISTRATION_CONFIRMATION':
      title = 'Konfirmasi Pendaftaran ERA Kids';
      message = interpolateTemplate(templates.REGISTRATION_CONFIRMATION, student);
      break;

    case 'ACCEPTANCE_WELCOME':
      title = 'Pemberitahuan Penerimaan Siswa ERA Kids';
      message = interpolateTemplate(templates.ACCEPTANCE_WELCOME, student);
      break;

    case 'MEMBERSHIP_CANCELLATION':
      title = 'Konfirmasi Pembatalan Keanggotaan';
      message = interpolateTemplate(templates.MEMBERSHIP_CANCELLATION, student);
      break;

    case 'CUSTOM':
      title = 'Pesan Khusus ERA Kids';
      if (extraParams?.customText && extraParams.customText.trim()) {
        message = extraParams.customText;
      } else {
        message = interpolateTemplate(templates.CUSTOM, student);
      }
      break;
  }

  const encodedMessage = encodeURIComponent(message);
  const waLink = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`;

  return {
    title,
    message,
    waLink
  };
}

export function formatIndonesianDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
}

export const ERA_KIDS_ADMIN_WHATSAPP = '6281519660119';

/**
 * Generates WhatsApp message representing the student's parent contacting the admin
 * to inform that they have registered the student via ERA Kids form.
 */
export function generateParentRegistrationInquiryMessage(
  student: StudentRegistration,
  adminPhone: string = ERA_KIDS_ADMIN_WHATSAPP
): { message: string; waLink: string } {
  const cleanPhone = normalizeWhatsAppNumber(adminPhone);

  const message =
    `Halo Admin ERA Kids 👋,\n\n` +
    `Saya *${student.parentName}*, orang tua/wali dari ananda *${student.studentName}*.\n\n` +
    `Saya ingin menginformasikan bahwa kami telah mengisi formulir registrasi pendaftaran siswa baru di sistem ERA Kids dengan data sebagai berikut:\n\n` +
    `📋 *No. Registrasi:* ${student.regNumber}\n` +
    `👶 *Nama Calon Siswa:* ${student.studentName}${student.nickname ? ` (${student.nickname})` : ''}\n` +
    `🎽 *No. Jersey Pilihan:* #${student.jerseyNumber || '-'}\n` +
    `📍 *Kota/Domisili:* ${student.city || '-'}\n` +
    `📱 *No. WhatsApp:* ${student.whatsapp}\n` +
    `📌 *Status Pendaftaran:* ${student.status}\n\n` +
    `Mohon bantuan Admin untuk verifikasi data pendaftaran ananda serta petunjuk langkah selanjutnya. Terima kasih banyak! 🙏✨`;

  const encodedMessage = encodeURIComponent(message);
  const waLink = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`;

  return {
    message,
    waLink
  };
}
