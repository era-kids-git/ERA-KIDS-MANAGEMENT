export type RegistrationStatus = 
  | 'Register' 
  | 'Diterima' 
  | 'Pembatalan Keanggotaan';

export type WhatsAppNotificationType = 
  | 'REGISTRATION_CONFIRMATION' 
  | 'ACCEPTANCE_WELCOME' 
  | 'MEMBERSHIP_CANCELLATION' 
  | 'CUSTOM';

export interface WhatsAppNotification {
  id: string;
  type: WhatsAppNotificationType;
  title: string;
  sentAt: string;
  sentBy: string;
  message: string;
  status: 'TERKIRIM' | 'TERBACA' | 'PENDING';
  targetNumber: string;
}

export interface StudentRegistration {
  id: string;
  regNumber: string; // e.g. ERA-2026-0812
  studentName: string;
  nickname: string;
  gender: 'L' | 'P';
  birthPlace: string;
  birthDate: string; // YYYY-MM-DD
  age: number;
  height: string;
  weight: string;
  jerseyNumber: string;
  nisn?: string;
  photoUrl?: string;
  currentSchool: string;
  parentName: string;
  parentRole: 'Ayah' | 'Ibu' | 'Wali';
  whatsapp: string; // e.g. 08123456789 or 628123456789
  email: string;
  address: string;
  subdistrict: string;
  district: string;
  city: string;
  programId?: string;
  programName?: string;
  branch?: string;
  preferredSchedule?: string;
  specialNotes?: string;
  status: RegistrationStatus;
  trialSchedule?: {
    date: string;
    time: string;
    room?: string;
    mentor?: string;
    notes?: string;
  };
  adminNotes?: string;
  whatsappNotifications: WhatsAppNotification[];
  createdAt: string;
  updatedAt: string;
}

export interface ProgramInfo {
  id: string;
  name: string;
  ageRange: string;
  category: string;
  description: string;
  iconName: string;
  feeEstimate: string;
  color: string;
}

export interface BranchInfo {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  whatsapp: string;
}

export interface RegistrationStats {
  total: number;
  today: number;
  register: number;
  diterima: number;
  pembatalan: number;
}

export type AttendanceStatus = 'Hadir' | 'Izin' | 'Tidak Hadir';

export interface StudentAttendanceRecord {
  studentId: string;
  regNumber: string;
  studentName: string;
  nickname: string;
  gender: 'L' | 'P';
  age: number;
  jerseyNumber?: string;
  photoUrl?: string;
  status: AttendanceStatus | string;
  notes?: string;
}

export interface MediaDocumentation {
  id: string;
  type: 'photo' | 'video';
  url: string; // Base64 compressed image or video
  name: string;
  sizeFormatted: string;
  sizeBytes?: number;
  uploadedAt: string;
}

export interface TrainingSession {
  id: string;
  date: string; // YYYY-MM-DD
  timeRange: string; // e.g. "18.45 - 21.00 WIB"
  sessionTitle: string; // Sesi: "Reguler Jumat" | "Reguler Rabu" | "Latihan Tambahan" | "Kejuaraan"
  coachName: string; // e.g. "Riviansyah"
  location: string; // e.g. "GOR VOLI KUBA"
  programName: string;
  records: StudentAttendanceRecord[];
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
  documentationMedia?: MediaDocumentation[];
  createdAt: string;
  updatedAt: string;
}
