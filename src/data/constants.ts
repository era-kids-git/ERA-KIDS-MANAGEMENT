import { ProgramInfo, BranchInfo } from '../types.ts';

export const ERA_PROGRAMS: ProgramInfo[] = [
  {
    id: 'stem-robotics',
    name: 'Robotics & STEM Engineering',
    ageRange: '5 - 12 Tahun',
    category: 'Teknologi & Mekanika',
    description: 'Eksplorasi sensor, motor, perakitan robot interaktif, dan pemecahan masalah berbasis STEAM terpadu.',
    iconName: 'Bot',
    feeEstimate: 'Rp 650.000 / bln',
    color: 'emerald'
  },
  {
    id: 'creative-coding',
    name: 'Creative Coding & Game Creator',
    ageRange: '7 - 14 Tahun',
    category: 'Pemrograman & Logika',
    description: 'Belajar logika computational thinking, animasi Scratch, Blockly, Python dasar, dan pembuatan mini game seru.',
    iconName: 'Code2',
    feeEstimate: 'Rp 700.000 / bln',
    color: 'indigo'
  },
  {
    id: 'super-math',
    name: 'Super Math & Mental Logic',
    ageRange: '4 - 10 Tahun',
    category: 'Matematika Kreatif',
    description: 'Pendekatan visual konseptual matematika Singapura (CPA method), aritmatika ceria, dan ketangkasan berhitung.',
    iconName: 'Calculator',
    feeEstimate: 'Rp 550.000 / bln',
    color: 'amber'
  },
  {
    id: 'english-phonics',
    name: 'English Phonics & Kid Speaker',
    ageRange: '4 - 9 Tahun',
    category: 'Bahasa & Komunikasi',
    description: 'Membangun kepercayaan diri berbicara bahasa Inggris lewat storytelling, interactive phonics, dan roleplay panggung.',
    iconName: 'Languages',
    feeEstimate: 'Rp 580.000 / bln',
    color: 'rose'
  },
  {
    id: 'little-explorers',
    name: 'Little Explorers Early STEAM',
    ageRange: '3 - 5 Tahun',
    category: 'Pendidikan Anak Usia Dini',
    description: 'Stimulasi motorik halus, sensorik, eksperimen sains sederhana, dan pengenalan alfabet serta angka melalui bermain.',
    iconName: 'Sparkles',
    feeEstimate: 'Rp 520.000 / bln',
    color: 'sky'
  },
  {
    id: 'digital-art',
    name: 'Digital Art & 3D Animation',
    ageRange: '8 - 15 Tahun',
    category: 'Desain & Seni Digital',
    description: 'Menggambar digital dengan pen tablet, ilustrasi karakter kartun, dasar animasi 2D/3D, dan desain grafis kreatif.',
    iconName: 'Palette',
    feeEstimate: 'Rp 680.000 / bln',
    color: 'purple'
  }
];

export const ERA_BRANCHES: BranchInfo[] = [
  {
    id: 'jakarta-pusat',
    name: 'ERA Kids Cabang Utama (Jakarta Selatan)',
    address: 'Jl. Metro Pondok Indah Blok TB No. 12, Kebayoran Lama, Jakarta Selatan',
    city: 'Jakarta Selatan',
    phone: '081519660119',
    whatsapp: '6281519660119'
  },
  {
    id: 'tangerang-bintaro',
    name: 'ERA Kids Cabang Bintaro (Sektor 9)',
    address: 'Ruko Kebayoran Arcade 2 Blok B3 No. 5, Pondok Aren, Tangerang Selatan',
    city: 'Tangerang Selatan',
    phone: '021-2273901',
    whatsapp: '6281311223344'
  },
  {
    id: 'serpong-bsd',
    name: 'ERA Kids Cabang BSD City (Serpong)',
    address: 'The Icon Business Park Blok F No. 8, BSD City, Serpong',
    city: 'Tangerang Selatan',
    phone: '021-5381900',
    whatsapp: '6281599887766'
  },
  {
    id: 'bandung-dago',
    name: 'ERA Kids Cabang Bandung (Dago Atas)',
    address: 'Jl. Ir. H. Juanda No. 182, Dago, Coblong, Kota Bandung',
    city: 'Bandung',
    phone: '022-2508821',
    whatsapp: '6281809090911'
  }
];

export const SCHEDULE_OPTIONS = [
  'Sabtu Pagi (09:00 - 10:30 WIB)',
  'Sabtu Siang (11:00 - 12:30 WIB)',
  'Sabtu Sore (14:00 - 15:30 WIB)',
  'Minggu Pagi (09:30 - 11:00 WIB)',
  'Selasa & Kamis Sore (16:00 - 17:30 WIB)',
  'Rabu & Jumat Sore (16:00 - 17:30 WIB)'
];
