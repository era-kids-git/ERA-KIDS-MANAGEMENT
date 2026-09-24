/**
 * Utility untuk Penomoran Otomatis Anggota ERA Kids & Validasi Data Siswa
 * 
 * Aturan Penomoran Member:
 * Format: ERA-{TAHUN}-{001, 002, 003...}
 * Jika di data ada anggota yang dihapus (misal ERA-2026-001 atau ERA-2026-003 dihapus),
 * sistem akan membaca seluruh data aktif dan mengisi no member tersebut terlebih dahulu (gap filling).
 */

export function getNextAvailableRegNumber(
  existingList: Array<{ regNumber?: string | null }>,
  targetYear?: number
): string {
  const year = targetYear || new Date().getFullYear();
  const usedNumbers = new Set<number>();

  if (Array.isArray(existingList)) {
    for (const item of existingList) {
      if (!item || !item.regNumber) continue;
      // Cocokkan angka di bagian akhir regNumber (contoh: "ERA-2026-001" -> 1, "005" -> 5)
      const match = String(item.regNumber).match(/(\d+)$/);
      if (match && match[1]) {
        const val = parseInt(match[1], 10);
        if (!isNaN(val) && val > 0) {
          usedNumbers.add(val);
        }
      }
    }
  }

  // Mulai dari angka 1, cari nomor terkecil yang belum terpakai / pernah dihapus
  let candidate = 1;
  while (usedNumbers.has(candidate)) {
    candidate++;
  }

  return `ERA-${year}-${String(candidate).padStart(3, '0')}`;
}

export function calculateAgeFromBirthDate(birthDateStr?: string): number {
  if (!birthDateStr) return 7;
  const bDate = new Date(birthDateStr);
  if (isNaN(bDate.getTime())) return 7;

  const today = new Date();
  let age = today.getFullYear() - bDate.getFullYear();
  const m = today.getMonth() - bDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < bDate.getDate())) {
    age--;
  }

  return isNaN(age) ? 7 : Math.max(age, 3);
}

export function formatJerseyNumber(val?: string | number): string {
  if (val === undefined || val === null) return '';
  const str = String(val).trim();
  const cleaned = str.replace(/^0+/, '');
  return cleaned === '' && str.includes('0') ? '0' : cleaned;
}
