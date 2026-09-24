import { StudentRegistration, TrainingSession } from '../types.ts';

export const INITIAL_SEED_REGISTRATIONS: StudentRegistration[] = [
  {
    id: 'reg_1001',
    regNumber: 'ERA-2026-001',
    studentName: 'Muhammad Rayhan Al-Fatih',
    nickname: 'Rayhan',
    gender: 'L',
    birthPlace: 'Jakarta',
    birthDate: '2018-05-14',
    age: 8,
    height: '128',
    weight: '26',
    jerseyNumber: '10',
    currentSchool: 'SDIT Al-Azhar Kelapa Gading',
    parentName: 'Bambang Riviansyah',
    parentRole: 'Ayah',
    whatsapp: '081287654321',
    email: 'bambang.rivian@example.com',
    address: 'Jl. Kemang Timur No. 45',
    subdistrict: 'Bangka',
    district: 'Mampang Prapatan',
    city: 'Jakarta Selatan',
    programId: 'volleyball-kids',
    programName: 'Volleyball Training for Kids',
    branch: 'Kelas Utama',
    preferredSchedule: "Rabu & Jum'at (18.45 - 21.00 WIB)",
    specialNotes: 'Sudah menguasai passing bawah dan servis dasar.',
    status: 'Register',
    adminNotes: 'Pendaftaran masuk otomatis via formulir mandiri. Menunggu konfirmasi orientasi latihan.',
    whatsappNotifications: [
      {
        id: 'wa_init_1',
        type: 'REGISTRATION_CONFIRMATION',
        title: 'Konfirmasi Pendaftaran Volleyball Training',
        sentAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
        sentBy: 'System Auto-Dispatcher',
        message: 'Halo Bapak Bambang, pendaftaran ananda Muhammad Rayhan Al-Fatih (No. Reg: ERA-2026-001, No. Jersey: #10) kelas Volleyball Training for Kids telah tercatat.',
        status: 'TERKIRIM',
        targetNumber: '6281287654321'
      }
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 25).toISOString()
  },
  {
    id: 'reg_1002',
    regNumber: 'ERA-2026-002',
    studentName: 'Alya Shakila Putri',
    nickname: 'Alya',
    gender: 'P',
    birthPlace: 'Tangerang',
    birthDate: '2019-11-20',
    age: 6,
    height: '115',
    weight: '20',
    jerseyNumber: '7',
    currentSchool: 'SD Mentari Grand Bintaro',
    parentName: 'Citra Permata',
    parentRole: 'Ibu',
    whatsapp: '081399881122',
    email: 'citra.permata@example.com',
    address: 'Kebayoran Residences Blok B3',
    subdistrict: 'Pondok Aren',
    district: 'Pondok Aren',
    city: 'Tangerang Selatan',
    programId: 'volleyball-kids',
    programName: 'Volleyball Training for Kids',
    branch: 'Kelas Utama',
    preferredSchedule: "Rabu & Jum'at (18.45 - 21.00 WIB)",
    specialNotes: 'Latihan fisik dasar & kelincahan gerak.',
    status: 'Diterima',
    adminNotes: "Siswa resmi diterima di kelas Volleyball Training for Kids (Rabu & Jum'at 18.45 - 21.00 WIB).",
    whatsappNotifications: [
      {
        id: 'wa_init_2',
        type: 'ACCEPTANCE_WELCOME',
        title: 'Pengumuman Resmi Diterima',
        sentAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        sentBy: 'Admin Pusat ERA Kids',
        message: 'Selamat! Alya Shakila Putri resmi diterima di kelas Volleyball Training for Kids.',
        status: 'TERBACA',
        targetNumber: '6281399881122'
      }
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 110).toISOString()
  },
  {
    id: 'reg_1003',
    regNumber: 'ERA-2026-003',
    studentName: 'Kenzo Alvaro Dinata',
    nickname: 'Kenzo',
    gender: 'L',
    birthPlace: 'Jakarta',
    birthDate: '2020-03-08',
    age: 6,
    height: '118',
    weight: '21',
    jerseyNumber: '9',
    currentSchool: 'SD Ceria Bangsa',
    parentName: 'Hendra Dinata',
    parentRole: 'Ayah',
    whatsapp: '085712348899',
    email: 'hendra.dinata@example.com',
    address: 'Cluster Foresta Greenwich Park',
    subdistrict: 'Pagedangan',
    district: 'Pagedangan',
    city: 'Tangerang Selatan',
    programId: 'volleyball-kids',
    programName: 'Volleyball Training for Kids',
    branch: 'Kelas Utama',
    preferredSchedule: "Rabu & Jum'at (18.45 - 21.00 WIB)",
    specialNotes: 'Sangat aktif dan menyukai olahraga beregu.',
    status: 'Register',
    adminNotes: 'Pendaftaran masuk via portal mandiri. No. Jersey #9 kategori Laki-laki.',
    whatsappNotifications: [
      {
        id: 'wa_init_3',
        type: 'REGISTRATION_CONFIRMATION',
        title: 'Notifikasi Pendaftaran Baru',
        sentAt: new Date(Date.now() - 1000 * 60 * 600).toISOString(),
        sentBy: 'System Auto-Engine',
        message: 'Pendaftaran Kenzo Alvaro Dinata berhasil tercatat.',
        status: 'TERBACA',
        targetNumber: '6285712348899'
      }
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 1440).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 590).toISOString()
  },
  {
    id: 'reg_1004',
    regNumber: 'ERA-2026-004',
    studentName: 'Zahra Naura Khairunnisa',
    nickname: 'Zahra',
    gender: 'P',
    birthPlace: 'Bandung',
    birthDate: '2017-08-25',
    age: 9,
    height: '132',
    weight: '29',
    jerseyNumber: '10',
    currentSchool: 'SD IT Darul Hikam Bandung',
    parentName: 'dr. Farida Rahmawati',
    parentRole: 'Ibu',
    whatsapp: '081220033445',
    email: 'farida.rahma@example.com',
    address: 'Jl. Bukit Pakar Timur No. 12',
    subdistrict: 'Ciburial',
    district: 'Cimenyan',
    city: 'Bandung',
    programId: 'volleyball-kids',
    programName: 'Volleyball Training for Kids',
    branch: 'Kelas Utama',
    preferredSchedule: "Rabu & Jum'at (18.45 - 21.00 WIB)",
    specialNotes: 'Orang tua pindah tugas ke luar kota.',
    status: 'Pembatalan Keanggotaan',
    adminNotes: 'Pembatalan keanggotaan atas permintaan wali karena relokasi domisili keluarga.',
    whatsappNotifications: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 2200).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 2100).toISOString()
  }
];

export const INITIAL_SEED_TRAINING_SESSIONS: TrainingSession[] = [
  {
    id: 'session_demo_prev',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString().split('T')[0],
    timeRange: '18.45 - 21.00 WIB',
    sessionTitle: 'Reguler Rabu',
    coachName: 'Riviansyah',
    location: 'GOR VOLI KUBA',
    programName: 'Volleyball Training for Kids',
    records: [
      {
        studentId: INITIAL_SEED_REGISTRATIONS[0].id,
        regNumber: INITIAL_SEED_REGISTRATIONS[0].regNumber,
        studentName: INITIAL_SEED_REGISTRATIONS[0].studentName,
        nickname: INITIAL_SEED_REGISTRATIONS[0].nickname,
        gender: INITIAL_SEED_REGISTRATIONS[0].gender,
        age: INITIAL_SEED_REGISTRATIONS[0].age,
        jerseyNumber: INITIAL_SEED_REGISTRATIONS[0].jerseyNumber,
        photoUrl: INITIAL_SEED_REGISTRATIONS[0].photoUrl,
        status: 'Hadir',
        notes: 'Passing bawah sangat stabil dan postur lutut tepat'
      },
      {
        studentId: INITIAL_SEED_REGISTRATIONS[1].id,
        regNumber: INITIAL_SEED_REGISTRATIONS[1].regNumber,
        studentName: INITIAL_SEED_REGISTRATIONS[1].studentName,
        nickname: INITIAL_SEED_REGISTRATIONS[1].nickname,
        gender: INITIAL_SEED_REGISTRATIONS[1].gender,
        age: INITIAL_SEED_REGISTRATIONS[1].age,
        jerseyNumber: INITIAL_SEED_REGISTRATIONS[1].jerseyNumber,
        photoUrl: INITIAL_SEED_REGISTRATIONS[1].photoUrl,
        status: 'Hadir',
        notes: 'Akurasi servis mengarah tajam ke zona 1'
      },
      {
        studentId: INITIAL_SEED_REGISTRATIONS[2].id,
        regNumber: INITIAL_SEED_REGISTRATIONS[2].regNumber,
        studentName: INITIAL_SEED_REGISTRATIONS[2].studentName,
        nickname: INITIAL_SEED_REGISTRATIONS[2].nickname,
        gender: INITIAL_SEED_REGISTRATIONS[2].gender,
        age: INITIAL_SEED_REGISTRATIONS[2].age,
        jerseyNumber: INITIAL_SEED_REGISTRATIONS[2].jerseyNumber,
        photoUrl: INITIAL_SEED_REGISTRATIONS[2].photoUrl,
        status: 'Izin',
        notes: 'Izin ulangan sekolah semester'
      }
    ],
    summary: {
      total: 3,
      hadir: 2,
      izin: 1,
      tidakHadir: 0
    },
    notes: 'Fokus sesi: drill 50x passing bergantian dan pengenalan rotasi lapangan.',
    photos: [
      'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1592656094267-764a45160876?auto=format&fit=crop&w=800&q=80'
    ],
    documentationMedia: [
      {
        id: 'media_demo_1',
        type: 'photo',
        url: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=800&q=80',
        name: 'Drill Passing Bawah GOR KUBA.jpg',
        sizeFormatted: '380 KB',
        sizeBytes: 389120,
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString()
      },
      {
        id: 'media_demo_2',
        type: 'photo',
        url: 'https://images.unsplash.com/photo-1592656094267-764a45160876?auto=format&fit=crop&w=800&q=80',
        name: 'Simulasi Rotasi & Servis Bola.jpg',
        sizeFormatted: '420 KB',
        sizeBytes: 430080,
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString()
      }
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString()
  }
];
