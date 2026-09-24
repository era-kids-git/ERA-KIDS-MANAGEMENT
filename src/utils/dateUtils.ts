/**
 * Indonesian Date & Birth Date Utilities
 * Ensures dates and birth dates consistently display in Hari Bulan Tahun (e.g. "14 Mei 2018")
 * with complete immunity to UTC/local timezone shifts.
 */

const MONTH_NAMES_INDONESIA = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember'
];

const DAY_NAMES_INDONESIA = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu'
];

/**
 * Format tanggal lahir mengikuti format Hari Bulan Tahun (contoh: "14 Mei 2018").
 * Aman terhadap perbedaan zona waktu (tidak bergeser satu hari ke belakang).
 */
export function formatBirthDate(dateStr?: string | null): string {
  if (!dateStr || !dateStr.trim()) return '-';
  const clean = dateStr.trim();

  // Jika sudah dalam format Hari Bulan Tahun (misal: "14 Mei 2018"), kembalikan langsung
  for (const m of MONTH_NAMES_INDONESIA) {
    if (clean.includes(m)) return clean;
  }

  // Pola YYYY-MM-DD (format standar input date HTML & database)
  const ymdMatch = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    if (month >= 0 && month < 12 && day >= 1 && day <= 31) {
      return `${day} ${MONTH_NAMES_INDONESIA[month]} ${year}`;
    }
  }

  // Pola DD-MM-YYYY atau DD/MM/YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    if (month >= 0 && month < 12 && day >= 1 && day <= 31) {
      return `${day} ${MONTH_NAMES_INDONESIA[month]} ${year}`;
    }
  }

  // Fallback parsing objek Date
  try {
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      // Gunakan UTC jika string adalah ISO date murni YYYY-MM-DD untuk menghindari offset waktu
      if (clean.length === 10 && clean.includes('-')) {
        return `${d.getUTCDate()} ${MONTH_NAMES_INDONESIA[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
      }
      return `${d.getDate()} ${MONTH_NAMES_INDONESIA[d.getMonth()]} ${d.getFullYear()}`;
    }
  } catch {
    // Abaikan error dan fallback
  }

  return clean;
}

/**
 * Format tanggal standar Indonesia (contoh: "14 Mei 2018")
 */
export function formatIndonesianDate(dateStr?: string | null): string {
  return formatBirthDate(dateStr);
}

/**
 * Format tanggal dan waktu standar Indonesia (contoh: "14 Mei 2018, 14:30 WIB")
 */
export function formatIndonesianDateTime(isoString?: string | null): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const dateFormatted = `${d.getDate()} ${MONTH_NAMES_INDONESIA[d.getMonth()]} ${d.getFullYear()}`;
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${dateFormatted}, ${hours}:${minutes} WIB`;
  } catch {
    return isoString;
  }
}
