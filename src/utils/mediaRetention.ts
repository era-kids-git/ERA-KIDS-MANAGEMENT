import { MediaDocumentation, TrainingSession } from '../types';

// Masa retensi dokumentasi foto dan video: 3 minggu (21 hari)
export const MEDIA_RETENTION_DAYS = 21;
export const MEDIA_RETENTION_MS = MEDIA_RETENTION_DAYS * 24 * 60 * 60 * 1000;

/**
 * Mengambil tanggal acuan pengambilan/pengunggahan media
 */
export function getMediaCaptureDate(
  mediaUploadedAt?: string,
  sessionDate?: string,
  sessionCreatedAt?: string
): Date | null {
  if (mediaUploadedAt) {
    const d = new Date(mediaUploadedAt);
    if (!isNaN(d.getTime())) return d;
  }
  if (sessionDate) {
    // Gunakan akhir hari sesi latihan (23:59:59) agar 21 hari dihitung penuh
    const d = new Date(`${sessionDate}T23:59:59`);
    if (!isNaN(d.getTime())) return d;
  }
  if (sessionCreatedAt) {
    const d = new Date(sessionCreatedAt);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

/**
 * Memeriksa apakah suatu media sudah melewati masa retensi 3 minggu (21 hari)
 */
export function isMediaExpired(
  mediaUploadedAt?: string,
  sessionDate?: string,
  sessionCreatedAt?: string,
  referenceTime: number = Date.now()
): boolean {
  const captureDate = getMediaCaptureDate(mediaUploadedAt, sessionDate, sessionCreatedAt);
  if (!captureDate) return false;
  return (referenceTime - captureDate.getTime()) > MEDIA_RETENTION_MS;
}

/**
 * Menghitung sisa hari sebelum media otomatis terhapus (1 - 21 hari)
 */
export function getMediaRemainingDays(
  mediaUploadedAt?: string,
  sessionDate?: string,
  sessionCreatedAt?: string,
  referenceTime: number = Date.now()
): number {
  const captureDate = getMediaCaptureDate(mediaUploadedAt, sessionDate, sessionCreatedAt);
  if (!captureDate) return MEDIA_RETENTION_DAYS;
  const expiryTime = captureDate.getTime() + MEDIA_RETENTION_MS;
  const diffMs = expiryTime - referenceTime;
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}

/**
 * Menghitung tanggal kedaluwarsa media
 */
export function getMediaExpiryDate(
  mediaUploadedAt?: string,
  sessionDate?: string,
  sessionCreatedAt?: string
): Date | null {
  const captureDate = getMediaCaptureDate(mediaUploadedAt, sessionDate, sessionCreatedAt);
  if (!captureDate) return null;
  return new Date(captureDate.getTime() + MEDIA_RETENTION_MS);
}

/**
 * Membersihkan foto & video yang berusia lebih dari 3 minggu dari daftar sesi
 */
export function filterExpiredMediaFromSessions(
  sessions: TrainingSession[],
  referenceTime: number = Date.now()
): { cleanedSessions: TrainingSession[]; totalPurged: number } {
  let totalPurged = 0;

  const cleanedSessions = sessions.map(session => {
    let sessionChanged = false;
    let newDocMedia = session.documentationMedia;
    let newPhotos = session.photos;

    if (session.documentationMedia && session.documentationMedia.length > 0) {
      const activeMedia = session.documentationMedia.filter(media => {
        const expired = isMediaExpired(media.uploadedAt, session.date, session.createdAt, referenceTime);
        if (expired) totalPurged++;
        return !expired;
      });

      if (activeMedia.length !== session.documentationMedia.length) {
        newDocMedia = activeMedia;
        sessionChanged = true;
      }
    }

    if (session.photos && session.photos.length > 0) {
      const sessionExpired = isMediaExpired(undefined, session.date, session.createdAt, referenceTime);
      if (sessionExpired) {
        totalPurged += session.photos.length;
        newPhotos = [];
        sessionChanged = true;
      }
    }

    if (sessionChanged) {
      return {
        ...session,
        documentationMedia: newDocMedia,
        photos: newPhotos
      };
    }
    return session;
  });

  return { cleanedSessions, totalPurged };
}
