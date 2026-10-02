import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  UserPlus, 
  Search, 
  Sparkles, 
  CheckCircle2, 
  MapPin, 
  MessageSquare, 
  Send, 
  ExternalLink,
  Printer,
  RefreshCw,
  ChevronRight,
  HelpCircle,
  Copy,
  AlertCircle,
  Calendar,
  Camera,
  Upload,
  Shirt,
  ImageIcon,
  Check,
  Download,
  Loader2,
  FileText
} from 'lucide-react';
import { useRealtime } from '../../context/RealtimeContext.tsx';
import { generateParentRegistrationInquiryMessage } from '../../utils/whatsapp.ts';
import { StudentRegistration } from '../../types.ts';
import { PhotoCaptureModal } from './PhotoCaptureModal.tsx';
import { ParentTrainingGalleryTab } from './ParentTrainingGalleryTab.tsx';
import { RegistrationProofDocument } from './RegistrationProofDocument.tsx';
import { 
  downloadRegistrationProofImage 
} from '../../utils/registrationDocExport.ts';
import { formatBirthDate } from '../../utils/dateUtils.ts';
import { EraKidsLogo } from '../common/EraKidsLogo.tsx';

export const ParentPortal: React.FC = () => {
  const { submitRegistration, registrations, isConnected, isCloudConnected, trainingSessions } = useRealtime();
  const [activeTab, setActiveTab] = useState<'form' | 'status' | 'gallery'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'gallery') return 'gallery';
      if (tabParam === 'status') return 'status';
    }
    return 'form';
  });

  const [initialGallerySessionId, setInitialGallerySessionId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('session');
    }
    return null;
  });

  // Form step: 1 (Siswa), 2 (Orang Tua), 3 (Program & Jadwal), 4 (Konfirmasi)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<StudentRegistration | null>(null);
  const [copiedRegNumber, setCopiedRegNumber] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  const [isDownloadingStatusPng, setIsDownloadingStatusPng] = useState(false);
  const [docDownloaded, setDocDownloaded] = useState(false);
  const proofRef = useRef<HTMLDivElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    studentName: '',
    nickname: '',
    gender: 'L' as 'L' | 'P',
    birthPlace: '',
    birthDate: '2016-01-01',
    height: '',
    weight: '',
    jerseyNumber: '',
    photoUrl: '',
    currentSchool: '',
    parentName: '',
    parentRole: 'Ibu' as 'Ayah' | 'Ibu' | 'Wali',
    whatsapp: '',
    email: '',
    address: '',
    subdistrict: '',
    district: '',
    city: 'BEKASI',
    agreementChecked: false
  });

  // Tracking State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedResults, setSearchedResults] = useState<StudentRegistration[] | null>(null);
  const [searchedStudent, setSearchedStudent] = useState<StudentRegistration | null | undefined>(undefined);

  // Helper: Format nomor jersey hanya angka dan tanpa awalan 0 (misal '07' -> '7')
  const formatJerseyNumber = (value: string): string => {
    if (!value) return '';
    const digitsOnly = value.replace(/\D/g, '');
    return digitsOnly.replace(/^0+/, '');
  };

  // Calculate age dynamically
  const calculatedAge = formData.birthDate ? (() => {
    const b = new Date(formData.birthDate);
    const now = new Date();
    let age = now.getFullYear() - b.getFullYear();
    const m = now.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
    return Math.max(age, 3);
  })() : null;

  // Realtime Jersey number check separated by gender
  const jerseyCheck = useMemo(() => {
    const num = formatJerseyNumber(formData.jerseyNumber);
    if (!num) return { checked: false, isTaken: false, student: null };
    
    const taken = registrations.find(r => 
      r.status !== 'Pembatalan Keanggotaan' &&
      r.gender === formData.gender &&
      formatJerseyNumber(r.jerseyNumber || '') === num
    );

    return {
      checked: true,
      isTaken: Boolean(taken),
      student: taken || null
    };
  }, [formData.jerseyNumber, formData.gender, registrations]);

  // List of already taken jersey numbers for the selected gender
  const takenJerseyNumbers = useMemo(() => {
    return registrations
      .filter(r => r.status !== 'Pembatalan Keanggotaan' && r.gender === formData.gender && r.jerseyNumber)
      .map(r => formatJerseyNumber(r.jerseyNumber))
      .filter(Boolean)
      .sort((a, b) => {
        const numA = parseInt(a, 10);
        const numB = parseInt(b, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
      });
  }, [registrations, formData.gender]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!formData.studentName.trim()) {
        alert('Mohon isi Nama Lengkap Calon Siswa (Wajib diisi).');
        return;
      }
      if (!formData.nickname.trim()) {
        alert('Mohon isi Nama Panggilan Calon Siswa (Wajib diisi).');
        return;
      }
      if (!formData.birthPlace.trim()) {
        alert('Mohon isi Tempat Lahir Siswa (Wajib diisi).');
        return;
      }
      if (!formData.birthDate) {
        alert('Mohon pilih Tanggal Lahir Siswa (Wajib diisi).');
        return;
      }
      if (!formData.height.trim()) {
        alert('Mohon isi Tinggi Badan Siswa dalam cm (Wajib diisi).');
        return;
      }
      if (!formData.weight.trim()) {
        alert('Mohon isi Berat Badan Siswa dalam kg (Wajib diisi).');
        return;
      }
      const cleanJersey = formatJerseyNumber(formData.jerseyNumber);
      if (!cleanJersey) {
        alert('Mohon isi No. Jersey calon siswa.');
        return;
      }
      if (jerseyCheck.isTaken) {
        const genderLabel = formData.gender === 'L' ? 'Laki-laki' : 'Perempuan';
        alert(`No. Jersey ${cleanJersey} untuk kategori ${genderLabel} sudah terdaftar (${jerseyCheck.student?.studentName}). Silakan pilih nomor jersey lain.`);
        return;
      }
      if (!formData.currentSchool.trim()) {
        alert('Mohon isi Sekolah Calon Siswa saat ini (Wajib diisi). Jika belum sekolah, ketik "Belum Sekolah".');
        return;
      }
      if (!formData.photoUrl) {
        alert('Semua permohonan harus melengkapi pas foto 3x4 dahulu (Wajib diisi). Silakan ambil menggunakan kamera depan/belakang atau pilih dari galeri.');
        return;
      }
      setCurrentStep(2);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate Step 1 requirements
    if (!formData.studentName.trim()) {
      alert('Mohon isi Nama Lengkap Calon Siswa (Wajib diisi).');
      setCurrentStep(1);
      return;
    }
    if (!formData.nickname.trim()) {
      alert('Mohon isi Nama Panggilan Calon Siswa (Wajib diisi).');
      setCurrentStep(1);
      return;
    }
    if (!formData.birthPlace.trim()) {
      alert('Mohon isi Tempat Lahir Siswa (Wajib diisi).');
      setCurrentStep(1);
      return;
    }
    if (!formData.birthDate) {
      alert('Mohon pilih Tanggal Lahir Siswa (Wajib diisi).');
      setCurrentStep(1);
      return;
    }
    if (!formData.height.trim()) {
      alert('Mohon isi Tinggi Badan Siswa (Wajib diisi).');
      setCurrentStep(1);
      return;
    }
    if (!formData.weight.trim()) {
      alert('Mohon isi Berat Badan Siswa (Wajib diisi).');
      setCurrentStep(1);
      return;
    }
    const cleanJersey = formatJerseyNumber(formData.jerseyNumber);
    if (!cleanJersey) {
      alert('Mohon isi No. Jersey calon siswa.');
      setCurrentStep(1);
      return;
    }
    if (jerseyCheck.isTaken) {
      const genderLabel = formData.gender === 'L' ? 'Laki-laki' : 'Perempuan';
      alert(`No. Jersey ${cleanJersey} untuk kategori ${genderLabel} sudah terdaftar. Silakan ganti No. Jersey.`);
      setCurrentStep(1);
      return;
    }
    if (!formData.currentSchool.trim()) {
      alert('Mohon isi Sekolah saat ini (Wajib diisi).');
      setCurrentStep(1);
      return;
    }
    if (!formData.photoUrl) {
      alert('Semua permohonan harus melengkapi pas foto 3x4 calon siswa dahulu sebelum bisa submit.');
      setCurrentStep(1);
      return;
    }

    // Validate Step 2 requirements
    if (!formData.parentName.trim()) {
      alert('Mohon isi Nama Orang Tua / Wali (Wajib diisi).');
      return;
    }
    if (!formData.whatsapp.trim()) {
      alert('Mohon isi Nomor WhatsApp Aktif (Wajib diisi).');
      return;
    }
    if (!formData.email.trim()) {
      alert('Mohon isi Alamat Email (Wajib diisi).');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email.trim())) {
      alert('Format Alamat Email tidak valid. Contoh: nama@gmail.com');
      return;
    }
    if (!formData.address.trim()) {
      alert('Mohon isi Alamat Domisili Lengkap (Wajib diisi).');
      return;
    }
    if (!formData.subdistrict.trim()) {
      alert('Mohon isi Kelurahan (Wajib diisi).');
      return;
    }
    if (!formData.district.trim()) {
      alert('Mohon isi Kecamatan (Wajib diisi).');
      return;
    }
    if (!formData.city.trim()) {
      alert('Mohon isi Kota Domisili (Wajib diisi).');
      return;
    }
    if (!formData.agreementChecked) {
      alert('Mohon centang persetujuan keabsahan data sebelum mengirim formulir (Wajib diisi).');
      return;
    }

    setIsSubmitting(true);
    const result = await submitRegistration({
      studentName: formData.studentName.toUpperCase(),
      nickname: (formData.nickname || formData.studentName.split(' ')[0]).toUpperCase(),
      gender: formData.gender,
      birthPlace: formData.birthPlace.toUpperCase(),
      birthDate: formData.birthDate,
      height: formData.height,
      weight: formData.weight,
      jerseyNumber: cleanJersey,
      photoUrl: formData.photoUrl,
      currentSchool: (formData.currentSchool || 'BELUM SEKOLAH').toUpperCase(),
      parentName: formData.parentName.toUpperCase(),
      parentRole: formData.parentRole,
      whatsapp: formData.whatsapp,
      email: formData.email,
      address: formData.address.toUpperCase(),
      subdistrict: formData.subdistrict.toUpperCase(),
      district: formData.district.toUpperCase(),
      city: formData.city.toUpperCase()
    });

    setIsSubmitting(false);

    if (result.success && result.registration) {
      const newReg = result.registration;
      setSubmittedData(newReg);
      setDocDownloaded(false);

      // Trigger festive celebration confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Unduh Gambar Bukti Pendaftaran Resmi Otomatis (.png 1 Lembar Utuh)
      setTimeout(() => {
        triggerAutoPngDownload(newReg);
      }, 600);
    } else {
      alert(result.error || 'Gagal mengirim pendaftaran. Silakan coba kembali.');
    }
  };

  const triggerAutoPngDownload = async (reg: StudentRegistration) => {
    setIsDownloadingImage(true);
    try {
      await new Promise(r => setTimeout(r, 600));
      const el = document.getElementById('registration-proof-container') || proofRef.current;
      if (el) {
        await downloadRegistrationProofImage(el, reg);
        setDocDownloaded(true);
      }
    } catch (err) {
      console.error('Auto download PNG failed:', err);
    } finally {
      setIsDownloadingImage(false);
    }
  };

  const handleManualDownloadImage = async () => {
    if (!submittedData || isDownloadingImage) return;
    setIsDownloadingImage(true);
    try {
      const el = document.getElementById('registration-proof-container') || proofRef.current;
      if (el) {
        await downloadRegistrationProofImage(el, submittedData);
        setDocDownloaded(true);
      } else {
        throw new Error('Elemen bukti pendaftaran tidak ditemukan');
      }
    } catch (err) {
      console.error('Manual download image failed:', err);
      alert('Gagal mengunduh gambar bukti pendaftaran. Silakan coba beberapa saat lagi.');
    } finally {
      setIsDownloadingImage(false);
    }
  };

  const handleDownloadStatusPng = async (student: StudentRegistration) => {
    if (isDownloadingStatusPng) return;
    setIsDownloadingStatusPng(true);
    try {
      const el = document.getElementById('status-proof-container');
      if (el) {
        await downloadRegistrationProofImage(el, student);
      } else {
        throw new Error('Elemen bukti pendaftaran tidak ditemukan');
      }
    } catch (err) {
      console.error('Download status PNG failed:', err);
      alert('Gagal mengunduh gambar bukti pendaftaran. Silakan coba beberapa saat lagi.');
    } finally {
      setIsDownloadingStatusPng(false);
    }
  };

  const handleTrackSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const q = searchQuery.trim().toLowerCase();
    const cleanNumber = q.replace(/\D/g, '');

    const matches = registrations.filter(r => {
      const regLower = r.regNumber.toLowerCase();
      const nameLower = r.studentName.toLowerCase();
      const nickLower = (r.nickname || '').toLowerCase();
      const waDigits = r.whatsapp ? r.whatsapp.replace(/\D/g, '') : '';

      // Match No Reg (exact, partial, or number suffix such as '001')
      if (regLower === q || regLower.includes(q)) return true;
      if (cleanNumber.length > 0) {
        const regDigits = r.regNumber.replace(/\D/g, '');
        if (regDigits === cleanNumber || regDigits.endsWith(cleanNumber)) return true;
      }

      // Match Student Name or Nickname
      if (nameLower.includes(q) || nickLower.includes(q)) return true;

      // Match WhatsApp
      if (cleanNumber.length >= 6 && waDigits.includes(cleanNumber)) return true;

      return false;
    });

    setSearchedResults(matches);
    if (matches.length === 1) {
      setSearchedStudent(matches[0]);
    } else if (matches.length > 1) {
      setSearchedStudent(undefined);
    } else {
      setSearchedStudent(null);
    }
  };

  const compressAndSetPhoto = (file: File) => {
    // Check file size and type
    if (!file.type.startsWith('image/')) {
      alert('Format file tidak didukung. Mohon pilih file foto/gambar.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) return;

      const img = new Image();
      img.onload = () => {
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 1000;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.85);
          handleInputChange('photoUrl', optimizedBase64);
        } else {
          handleInputChange('photoUrl', dataUrl);
        }
      };
      img.onerror = () => {
        handleInputChange('photoUrl', dataUrl);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const copyRegNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedRegNumber(true);
    setTimeout(() => setCopiedRegNumber(false), 2500);
  };

  const resetFormToNew = () => {
    setSubmittedData(null);
    setCurrentStep(1);
    setFormData({
      studentName: '',
      nickname: '',
      gender: 'L',
      birthPlace: '',
      birthDate: '2016-01-01',
      height: '',
      weight: '',
      jerseyNumber: '',
      photoUrl: '',
      currentSchool: '',
      parentName: '',
      parentRole: 'Ibu',
      whatsapp: '',
      email: '',
      address: '',
      subdistrict: '',
      district: '',
      city: 'BEKASI',
      agreementChecked: false
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-1 sm:px-4 py-1.5 sm:py-3 overflow-x-hidden">
      {/* Portal Top Header - 3 Baris Simple & Clean */}
      <div className="bg-white rounded-xl p-2.5 sm:p-3.5 shadow-2xs border border-slate-200 mb-2.5 sm:mb-3">
        <div className="flex items-start sm:items-center gap-2.5 sm:gap-3">
          <EraKidsLogo className="w-9 h-9 sm:w-10 sm:h-10 mt-0.5 sm:mt-0" />
          <div className="min-w-0 flex-1 leading-tight">
            {/* Baris 1: Judul Kelas & Badge */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-xs sm:text-sm font-bold tracking-tight text-slate-900">
                ERA Kids
              </h1>
              <span className="px-1.5 py-0.5 rounded text-[9.5px] sm:text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                Kelas Aktif 2026/2027
              </span>
            </div>

            {/* Baris 2: Jadwal Latihan */}
            <p className="text-[10.5px] sm:text-[11px] text-slate-600 font-medium mt-0.5">
              Jadwal: <strong className="text-slate-800">Rabu & Jum'at (18.45 - 21.00 WIB)</strong>
            </p>

            {/* Baris 3: Keterangan & Status Real-time */}
            <div className="text-[10px] sm:text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span>Portal Pendaftaran Mandiri</span>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 font-medium whitespace-nowrap">
                <span className={`w-1.5 h-1.5 rounded-full ${isCloudConnected || isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                {isCloudConnected ? 'Cloud Real-time Aktif' : isConnected ? 'Sinkron Real-time' : 'Menghubungkan'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs - Fit width 100% on Mobile */}
        <div className="grid grid-cols-3 gap-1 sm:flex sm:items-center sm:gap-1.5 mt-2.5 pt-2 border-t border-slate-100 w-full">
          <button
            id="parent-tab-form"
            onClick={() => setActiveTab('form')}
            className={`w-full sm:w-auto px-2 sm:px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
              activeTab === 'form'
                ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                : 'bg-slate-50 sm:bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate sm:hidden">Daftar</span>
            <span className="hidden sm:inline whitespace-nowrap">Formulir Pendaftaran</span>
          </button>

          <button
            id="parent-tab-status"
            onClick={() => setActiveTab('status')}
            className={`w-full sm:w-auto px-2 sm:px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
              activeTab === 'status'
                ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                : 'bg-slate-50 sm:bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Search className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate sm:hidden">Status</span>
            <span className="hidden sm:inline whitespace-nowrap">Lacak Status</span>
          </button>

          <button
            id="parent-tab-gallery"
            onClick={() => setActiveTab('gallery')}
            className={`w-full sm:w-auto px-2 sm:px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 sm:gap-1.5 relative ${
              activeTab === 'gallery'
                ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                : 'bg-slate-50 sm:bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Camera className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate sm:hidden">Galeri</span>
            <span className="hidden sm:inline whitespace-nowrap">Galeri & Foto Latihan</span>
            {trainingSessions.some(s => (s.mediaCount || s.documentationMedia?.length || s.photos?.length || 0) > 0) && (
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 ml-0.5" />
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: FORMULIR PENDAFTARAN */}
      {activeTab === 'form' && (
        <div className="space-y-3">
          {submittedData ? (
            /* SUCCESS CONFIRMATION SCREEN */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl p-3 sm:p-5 shadow-2xs border border-emerald-200/80"
            >
              <div className="max-w-2xl mx-auto text-center">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200 mb-1">
                  <Sparkles className="w-3 h-3" />
                  Pendaftaran Berhasil Tersimpan di Sistem
                </span>
                <h2 className="text-base sm:text-xl font-extrabold text-slate-900 mb-0.5">
                  Pendaftaran Berhasil Terkirim!
                </h2>
                <p className="text-slate-600 text-xs sm:text-sm mb-5">
                  Data calon siswa atas nama <strong className="text-slate-900 font-bold">{submittedData.studentName}</strong> telah berhasil didaftarkan di sistem ERA Kids.
                </p>

                {/* Dokumen Bukti Pendaftaran Resmi (Persis Seperti PDF yang Diunduh) */}
                <div ref={proofRef} className="mb-5 text-left">
                  <RegistrationProofDocument
                    registration={submittedData}
                    id="registration-proof-container"
                  />
                </div>

                {/* Dokumen Bukti Pendaftaran Resmi (1 Lembar Utuh Tanpa Terpotong) */}
                <div className="max-w-2xl mx-auto w-full mb-4 text-left">
                  <div className="bg-indigo-50/90 border border-indigo-200 rounded-xl p-3 sm:p-4 flex items-start gap-3 shadow-2xs">
                    <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs text-lg">
                      🖼️
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-indigo-900 uppercase tracking-wider">
                          Gambar Bukti Pendaftaran Resmi (1 Lembar Utuh)
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          docDownloaded 
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-indigo-200/80 text-indigo-900 border-indigo-300'
                        }`}>
                          {isDownloadingImage ? 'Menyiapkan...' : docDownloaded ? 'Terunduh (.png)' : 'Otomatis'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-snug mt-1">
                        {isDownloadingImage
                          ? 'Sedang menyiapkan berkas gambar bukti pendaftaran resmi 1 lembar utuh (.png)...'
                          : docDownloaded
                          ? 'Berkas gambar bukti pendaftaran resmi (.png) 1 lembar utuh telah berhasil diunduh ke perangkat Anda.'
                          : 'Berkas gambar bukti pendaftaran resmi (.png) 1 lembar utuh otomatis diunduh ke galeri perangkat Anda tanpa terpotong.'}
                      </p>
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={handleManualDownloadImage}
                          disabled={isDownloadingImage}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs disabled:opacity-50"
                          title="Unduh gambar bukti pendaftaran resolusi tinggi (.png) 1 lembar utuh untuk galeri/WhatsApp"
                        >
                          {isDownloadingImage ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                              <span>Menyiapkan Gambar...</span>
                            </>
                          ) : (
                            <>
                              <Download className="w-3.5 h-3.5 text-white" />
                              <span>{docDownloaded ? 'Unduh Ulang Gambar (.png)' : 'Unduh Gambar Bukti (.png)'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tombol Aksi Bersih: Pantau Status Pendaftaran */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 max-w-md mx-auto pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery(submittedData.regNumber);
                      setSearchedStudent(submittedData);
                      setActiveTab('status');
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Search className="w-3.5 h-3.5 shrink-0" />
                    <span>Pantau Status Pendaftaran</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            /* STEPPED REGISTRATION FORM */
            <div className="bg-white rounded-xl shadow-2xs border border-slate-200/80 overflow-hidden">
              {/* Step indicator header */}
              <div className="bg-slate-50/80 px-3 py-2 border-b border-slate-200/80">
                <div className="flex items-center justify-center max-w-xs mx-auto">
                  {[
                    { step: 1, label: 'Data Siswa' },
                    { step: 2, label: 'Data Orang Tua' }
                  ].map((s, idx) => (
                    <div key={s.step} className="flex items-center">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                            currentStep === s.step
                              ? 'bg-indigo-600 text-white shadow-2xs ring-2 ring-indigo-100'
                              : currentStep > s.step
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {currentStep > s.step ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.step}
                        </div>
                        <span className={`text-[10px] font-medium mt-0.5 ${currentStep === s.step ? 'text-indigo-600 font-bold' : 'text-slate-500'}`}>
                          {s.label}
                        </span>
                      </div>
                      {idx < 1 && (
                        <div className={`w-12 sm:w-20 h-0.5 mx-2 ${currentStep > idx + 1 ? 'bg-emerald-600' : 'bg-slate-200'}`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSubmitForm} className="p-3 sm:p-4">
                {/* STEP 1: DATA SISWA */}
                {currentStep === 1 && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-2.5 max-w-2xl mx-auto"
                  >
                    <div className="border-b border-slate-100 pb-1.5 mb-2">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <div>
                          <h3 className="text-xs sm:text-sm font-bold text-slate-900">Langkah 1: Data Calon Siswa</h3>
                          <p className="text-[11px] text-slate-500">Lengkapi data diri calon atlet muda ERA Kids.</p>
                        </div>
                        <span className="text-[10px] text-rose-600 font-semibold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full w-fit">
                          * Seluruh isian wajib diisi
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Nama Lengkap Siswa <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="input-student-name"
                        type="text"
                        required
                        value={formData.studentName}
                        onChange={e => handleInputChange('studentName', e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all uppercase"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Nama Panggilan / Nickname <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="input-nickname"
                          type="text"
                          required
                          value={formData.nickname}
                          onChange={e => handleInputChange('nickname', e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Jenis Kelamin <span className="text-rose-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleInputChange('gender', 'L')}
                            className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                              formData.gender === 'L'
                                ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-2xs'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            👦 Laki-laki
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInputChange('gender', 'P')}
                            className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                              formData.gender === 'P'
                                ? 'bg-pink-50 border-pink-500 text-pink-700 shadow-2xs'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            👧 Perempuan
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Tempat Lahir <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.birthPlace}
                          onChange={e => handleInputChange('birthPlace', e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Tanggal Lahir <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            id="input-birthdate"
                            type="date"
                            required
                            value={formData.birthDate}
                            onChange={e => handleInputChange('birthDate', e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer hover:bg-white"
                          />
                        </div>
                        {calculatedAge !== null && (
                          <span className="text-[10px] text-indigo-600 font-medium mt-0.5 block">
                            {formatBirthDate(formData.birthDate)} • Usia saat ini: {calculatedAge} tahun
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Tinggi Badan (cm) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          required
                          placeholder="Contoh: 125"
                          value={formData.height}
                          onChange={e => handleInputChange('height', e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Berat Badan (kg) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          required
                          placeholder="Contoh: 28"
                          value={formData.weight}
                          onChange={e => handleInputChange('weight', e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-semibold text-slate-700">
                            No. Jersey Siswa <span className="text-rose-500">*</span>
                          </label>
                          <span className="text-[10px] text-slate-500 font-medium">
                            Kategori: {formData.gender === 'L' ? '👦 Laki-laki' : '👧 Perempuan'}
                          </span>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                            <Shirt className="w-3.5 h-3.5" />
                          </div>
                          <input
                            id="input-jersey-number"
                            type="text"
                            inputMode="numeric"
                            required
                            placeholder="Contoh: 7, 10, 99"
                            value={formData.jerseyNumber}
                            onChange={e => handleInputChange('jerseyNumber', formatJerseyNumber(e.target.value))}
                            className={`w-full pl-8 pr-7 py-1.5 bg-slate-50 border rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                              jerseyCheck.checked && jerseyCheck.isTaken
                                ? 'border-rose-400 text-rose-800 bg-rose-50/50 focus:ring-rose-400'
                                : jerseyCheck.checked && !jerseyCheck.isTaken
                                ? 'border-emerald-400 text-emerald-800 bg-emerald-50/40 focus:ring-emerald-400'
                                : 'border-slate-200 text-slate-800 focus:ring-indigo-500'
                            }`}
                          />
                          {jerseyCheck.checked && (
                            <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                              {jerseyCheck.isTaken ? (
                                <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              )}
                            </div>
                          )}
                        </div>

                        {/* Jersey Status Validation Alert */}
                        {jerseyCheck.checked && jerseyCheck.isTaken && (
                          <div className="mt-1 p-1.5 bg-rose-50 border border-rose-200 rounded-md text-[10px] text-rose-700 flex items-start gap-1">
                            <AlertCircle className="w-3 h-3 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold">No. Jersey #{formatJerseyNumber(formData.jerseyNumber)} sudah terdaftar</span> untuk kategori {formData.gender === 'L' ? 'Laki-laki' : 'Perempuan'} ({jerseyCheck.student?.studentName}). Gunakan nomor lain!
                            </div>
                          </div>
                        )}

                        {jerseyCheck.checked && !jerseyCheck.isTaken && (
                          <p className="mt-0.5 text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            No. Jersey #{formatJerseyNumber(formData.jerseyNumber)} tersedia!
                          </p>
                        )}

                        {/* Taken numbers helper */}
                        {takenJerseyNumbers.length > 0 && (
                          <div className="mt-1 text-[10px] text-slate-500">
                            <span className="font-semibold text-slate-600">Nomor jersey {formData.gender === 'L' ? 'Laki-laki' : 'Perempuan'} terisi: </span>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {takenJerseyNumbers.map(num => (
                                <span key={num} className="px-1.5 py-0.2 bg-slate-200 text-slate-600 rounded text-[10px] font-mono">
                                  #{num}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Sekolah saat ini <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="input-school"
                          type="text"
                          required
                          placeholder="Nama SD / TK / Belum Sekolah"
                          value={formData.currentSchool}
                          onChange={e => handleInputChange('currentSchool', e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                        />
                      </div>
                    </div>

                    <div className="pt-1">
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Foto Pas Foto 3x4 (Kamera Langsung atau Galeri) <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-18 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 overflow-hidden flex items-center justify-center relative shrink-0">
                          {formData.photoUrl ? (
                            <img src={formData.photoUrl} alt="Foto siswa" className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-center text-slate-400 p-1">
                              <Camera className="w-4 h-4 mx-auto mb-0.5 opacity-50" />
                              <span className="text-[8px] leading-tight block font-medium">3 x 4</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <p className="text-[10px] text-slate-500">
                            Bisa ambil langsung menggunakan kamera (depan/belakang) atau pilih dari galeri foto.
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {/* Tombol Buka Kamera (Depan & Belakang) */}
                            <button
                              type="button"
                              id="btn-open-camera"
                              onClick={() => setIsCameraModalOpen(true)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-semibold transition-colors shadow-2xs"
                              title="Ambil Foto Menggunakan Kamera Depan atau Belakang"
                            >
                              <Camera className="w-3 h-3" />
                              <span>Ambil Kamera (Depan / Belakang)</span>
                            </button>

                            {/* Tombol Pilih dari Galeri */}
                            <button
                              type="button"
                              id="btn-open-gallery"
                              onClick={() => galleryInputRef.current?.click()}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors shadow-2xs"
                              title="Pilih File Foto dari Galeri"
                            >
                              <ImageIcon className="w-3 h-3 text-slate-500" />
                              <span>Pilih Galeri</span>
                            </button>

                            {/* Hidden file input for gallery */}
                            <input 
                              ref={galleryInputRef}
                              type="file" 
                              accept="image/*" 
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  compressAndSetPhoto(file);
                                }
                              }}
                            />

                            {formData.photoUrl && (
                              <button
                                type="button"
                                onClick={() => handleInputChange('photoUrl', '')}
                                className="inline-block text-[10px] text-rose-600 hover:underline px-1 font-semibold"
                              >
                                Hapus
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        id="btn-step1-next"
                        onClick={handleNextStep}
                        className="w-full sm:w-auto justify-center px-4 py-2.5 sm:py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shadow-2xs"
                      >
                        <span>Lanjut ke Data Orang Tua</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 2: DATA ORANG TUA / WALI */}
                {currentStep === 2 && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-2.5 max-w-2xl mx-auto"
                  >
                    <div className="border-b border-slate-100 pb-1.5 mb-2">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <div>
                          <h3 className="text-xs sm:text-sm font-bold text-slate-900">Langkah 2: Data Orang Tua / Wali</h3>
                          <p className="text-[11px] text-slate-500">Nomor WhatsApp aktif untuk konfirmasi pendaftaran resmi.</p>
                        </div>
                        <span className="text-[10px] text-rose-600 font-semibold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full w-fit">
                          * Seluruh isian wajib diisi
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Nama Orang Tua / Wali <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="input-parent-name"
                          type="text"
                          required
                          value={formData.parentName}
                          onChange={e => handleInputChange('parentName', e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Hubungan / Peran <span className="text-rose-500">*</span>
                        </label>
                        <select
                          required
                          value={formData.parentRole}
                          onChange={e => handleInputChange('parentRole', e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="Ibu">Ibu</option>
                          <option value="Ayah">Ayah</option>
                          <option value="Wali">Wali</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Nomor WhatsApp Aktif <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            id="input-whatsapp"
                            type="tel"
                            required
                            placeholder="Contoh: 08123456789"
                            value={formData.whatsapp}
                            onChange={e => handleInputChange('whatsapp', e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          <span className="absolute left-2.5 top-2 text-emerald-600 text-[10px] font-bold">
                            WA
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 mt-0.5 block">
                          Sistem akan mengirim notifikasi ke nomor ini.
                        </span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Alamat Email <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="input-email"
                          type="email"
                          required
                          placeholder="Contoh: orangtua@email.com"
                          value={formData.email}
                          onChange={e => handleInputChange('email', e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Alamat Domisili Lengkap <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="input-address"
                        type="text"
                        required
                        placeholder="Nama jalan, nomor rumah, RT/RW"
                        value={formData.address}
                        onChange={e => handleInputChange('address', e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Kelurahan <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Nama Kelurahan"
                          value={formData.subdistrict}
                          onChange={e => handleInputChange('subdistrict', e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Kecamatan <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Nama Kecamatan"
                          value={formData.district}
                          onChange={e => handleInputChange('district', e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Kota <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: BEKASI"
                          value={formData.city}
                          onChange={e => handleInputChange('city', e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                        />
                      </div>
                    </div>

                    {/* Ringkasan Pas Foto jika ada */}
                    {formData.photoUrl && (
                      <div className="p-2 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-10 rounded border border-slate-200 overflow-hidden shrink-0 bg-white">
                            <img src={formData.photoUrl} alt="Foto siswa" className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="font-semibold text-[11px] text-slate-800">
                              Pas Foto 3x4 Calon Siswa
                            </p>
                            <p className="text-[10px] text-slate-500">
                              Telah terlampir untuk ID Card Resmi
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Agreement checkbox */}
                    <div className="pt-1.5">
                      <label className="flex items-start gap-2 cursor-pointer select-none">
                        <input
                          id="checkbox-agreement"
                          type="checkbox"
                          required
                          checked={formData.agreementChecked}
                          onChange={e => handleInputChange('agreementChecked', e.target.checked)}
                          className="mt-0.5 w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                        />
                        <span className="text-[11px] text-slate-600 leading-snug">
                          Saya menyatakan seluruh data yang diisikan benar dan menyetujui data ini disinkronisasikan ke sistem pusat <strong>ERA Kids Management</strong>. <span className="text-rose-500 font-bold">*</span>
                        </span>
                      </label>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors text-center border border-slate-200 sm:border-transparent rounded-lg"
                      >
                        Kembali
                      </button>
                      <button
                        type="submit"
                        id="btn-submit-registration"
                        disabled={isSubmitting || !formData.agreementChecked || !formData.photoUrl}
                        className={`w-full sm:w-auto justify-center px-5 py-2.5 sm:py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs ${
                          isSubmitting || !formData.agreementChecked || !formData.photoUrl
                            ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-indigo-200 active:scale-98'
                        }`}
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                            <span>Menyinkronkan...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 shrink-0" />
                            <span>Kirim Formulir Pendaftaran</span>
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </form>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LACAK STATUS PENDAFTARAN */}
      {activeTab === 'status' && (
        <div className="bg-white rounded-xl p-3 sm:p-4 shadow-2xs border border-slate-200/80">
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-3">
              <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-1">
                <Search className="w-4 h-4" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Lacak Status Pendaftaran Siswa</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Masukkan Nomor Registrasi (contoh: <strong className="text-indigo-600">001</strong> atau <strong className="text-indigo-600">ERA-2026-001</strong>) atau Nama Siswa.
              </p>
            </div>

            <form onSubmit={handleTrackSearch} className="flex gap-1.5 mb-3">
              <div className="relative flex-1">
                <input
                  id="input-track-search"
                  type="text"
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    if (!e.target.value.trim()) {
                      setSearchedResults(null);
                      setSearchedStudent(undefined);
                    }
                  }}
                  placeholder="Ketik No. Registrasi (001) atau Nama Siswa..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
              <button
                type="submit"
                id="btn-track-submit"
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs whitespace-nowrap"
              >
                Cek Status
              </button>
            </form>

            {/* Tracking Result: Multiple matches */}
            {searchedResults && searchedResults.length > 1 && !searchedStudent && (
              <div className="space-y-2 mb-3">
                <div className="p-2 rounded-lg bg-indigo-50/70 border border-indigo-200/80 text-xs text-indigo-900 flex items-center justify-between">
                  <span className="font-semibold">Ditemukan {searchedResults.length} siswa dengan nama/registrasi serupa:</span>
                  <span className="text-[10px] text-indigo-700">Klik untuk melihat status</span>
                </div>
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
                  {searchedResults.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSearchedStudent(s)}
                      className="w-full text-left p-2 rounded-lg border border-slate-200 hover:border-indigo-400 bg-white hover:bg-indigo-50/40 transition-all flex items-center justify-between gap-2 shadow-2xs group"
                    >
                      <div className="flex items-center gap-2.5">
                        {s.photoUrl ? (
                          <img src={s.photoUrl} alt={s.studentName} className="w-8 h-10 object-cover rounded border border-slate-200 shrink-0" />
                        ) : (
                          <div className="w-8 h-10 bg-slate-100 rounded flex items-center justify-center text-xs shrink-0">
                            {s.gender === 'L' ? '👦' : '👧'}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-xs text-slate-900 group-hover:text-indigo-600">{s.studentName}</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            No. Reg: <strong className="text-indigo-700">{s.regNumber}</strong> • {s.gender === 'L' ? 'Laki-laki' : 'Perempuan'} • Jersey: #{s.jerseyNumber || '-'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold border mb-0.5 ${
                          s.status === 'Register'
                            ? 'bg-blue-100 text-blue-800 border-blue-200'
                            : s.status === 'Diterima'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : 'bg-rose-100 text-rose-800 border-rose-200'
                        }`}>
                          {s.status}
                        </span>
                        <p className="text-[10px] text-indigo-600 font-semibold group-hover:underline">Lihat Detail →</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tracking Result: Not Found */}
            {searchedStudent === null && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-center text-amber-800 text-xs">
                <AlertCircle className="w-4 h-4 mx-auto mb-0.5 text-amber-600" />
                Data pendaftaran tidak ditemukan. Pastikan Nomor Registrasi atau Nama Siswa sudah benar.
              </div>
            )}

            {searchedStudent && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-slate-200 rounded-xl p-3 bg-slate-50/70"
              >
                {searchedResults && searchedResults.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setSearchedStudent(undefined)}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 underline mb-2 inline-flex items-center gap-1 font-semibold"
                  >
                    ← Kembali ke daftar hasil pencarian ({searchedResults.length} siswa)
                  </button>
                )}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200 pb-2 mb-2.5">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                      Nomor Registrasi
                    </span>
                    <h3 className="text-sm font-bold font-mono text-indigo-700">
                      {searchedStudent.regNumber}
                    </h3>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Status Terkini:</span>
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                      searchedStudent.status === 'Register'
                        ? 'bg-blue-100 text-blue-800 border-blue-200'
                        : searchedStudent.status === 'Diterima'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-rose-100 text-rose-800 border-rose-200'
                    }`}>
                      {searchedStudent.status}
                    </span>
                  </div>
                </div>

                {/* Progress Visual Tracker */}
                <div className="mb-3 pt-0.5">
                  <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
                    Tahapan Status Siswa:
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                    {[
                      { step: 'Register', active: true, desc: 'Pendaftaran Masuk' },
                      { 
                        step: 'Diterima', 
                        active: searchedStudent.status === 'Diterima', 
                        desc: 'Resmi Diterima Latihan' 
                      },
                      { 
                        step: 'Pembatalan', 
                        active: searchedStudent.status === 'Pembatalan Keanggotaan',
                        isCancel: true,
                        desc: searchedStudent.status === 'Pembatalan Keanggotaan' ? 'Dibatalkan' : 'Tidak Dibatalkan' 
                      }
                    ].map((stepItem, idx) => (
                      <div key={idx} className="flex flex-col items-center">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mb-0.5 ${
                          stepItem.isCancel
                            ? stepItem.active
                              ? 'bg-rose-600 text-white'
                              : 'bg-slate-100 text-slate-400 border border-slate-200'
                            : stepItem.active
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 text-slate-500'
                        }`}>
                          {stepItem.active ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                        </div>
                        <span className={`font-semibold text-[10px] ${
                          stepItem.isCancel
                            ? stepItem.active ? 'text-rose-700' : 'text-slate-400'
                            : stepItem.active ? 'text-emerald-700' : 'text-slate-400'
                        }`}>
                          {stepItem.step}
                        </span>
                        <span className="text-[9px] text-slate-400">{stepItem.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Student Details Grid */}
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 mb-2.5">
                  <div className="flex items-center gap-2.5 mb-2 pb-2 border-b border-slate-100">
                    {searchedStudent.photoUrl ? (
                      <img 
                        src={searchedStudent.photoUrl} 
                        alt={searchedStudent.studentName} 
                        className="w-10 h-13 object-cover rounded-md border border-slate-200 shrink-0" 
                      />
                    ) : (
                      <div className="w-10 h-13 bg-slate-100 rounded-md flex items-center justify-center text-base shrink-0">
                        {searchedStudent.gender === 'L' ? '👦' : '👧'}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">{searchedStudent.studentName}</h4>
                      <p className="text-[11px] text-slate-500">Panggilan: <span className="font-semibold text-slate-700">{searchedStudent.nickname}</span></p>
                      <p className="text-[10px] text-slate-500">
                        {searchedStudent.gender === 'L' ? 'Laki-laki' : 'Perempuan'} • Usia: {searchedStudent.age} Thn
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block">No. Jersey:</span>
                      <span className="inline-flex items-center gap-1 font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded text-[10px]">
                        <Shirt className="w-3 h-3" />
                        #{searchedStudent.jerseyNumber || '-'} ({searchedStudent.gender === 'L' ? 'Laki-laki' : 'Perempuan'})
                      </span>
                    </div>
                    {searchedStudent.birthPlace && (
                      <div>
                        <span className="text-[10px] text-slate-500 block">Tempat / Tanggal Lahir:</span>
                        <span className="font-semibold text-slate-800 text-xs">
                          {searchedStudent.birthPlace}, {formatBirthDate(searchedStudent.birthDate)}
                        </span>
                      </div>
                    )}
                    {(searchedStudent.height || searchedStudent.weight) && (
                      <div>
                        <span className="text-[10px] text-slate-500 block">Tinggi / Berat Badan:</span>
                        <span className="font-semibold text-slate-800 text-xs">
                          {searchedStudent.height ? `${searchedStudent.height} cm` : '-'} / {searchedStudent.weight ? `${searchedStudent.weight} kg` : '-'}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-[10px] text-slate-500 block">Sekolah saat ini:</span>
                      <span className="font-semibold text-slate-800 text-xs">{searchedStudent.currentSchool || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Orang Tua / Wali:</span>
                      <span className="font-semibold text-slate-800 text-xs">{searchedStudent.parentName} ({searchedStudent.parentRole})</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Kota Domisili:</span>
                      <span className="font-semibold text-slate-800 text-xs">{searchedStudent.city || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Action: Direct WhatsApp Contact & Unduh Bukti PNG */}
                {(() => {
                  const { waLink } = generateParentRegistrationInquiryMessage(searchedStudent);
                  return (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => handleDownloadStatusPng(searchedStudent)}
                        disabled={isDownloadingStatusPng}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs disabled:opacity-50"
                        title="Unduh berkas gambar resmi bukti pendaftaran ananda (.png) 1 lembar utuh"
                      >
                        {isDownloadingStatusPng ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                            <span>Menyiapkan Gambar...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5 shrink-0" />
                            <span>Unduh Bukti Pendaftaran (.png)</span>
                          </>
                        )}
                      </button>

                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs"
                        title="Kirim pesan konfirmasi pendaftaran ananda ke WhatsApp Admin ERA Kids"
                      >
                        <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                        <span>Hubungi Admin via WA</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                  );
                })()}

                {/* Elemen tersembunyi offscreen untuk proses unduh berkas gambar PNG tanpa menampilkan pratinjau di layar */}
                <div 
                  aria-hidden="true" 
                  style={{ 
                    position: 'fixed', 
                    left: '-9999px', 
                    top: '0', 
                    width: '680px', 
                    pointerEvents: 'none',
                    zIndex: -9999 
                  }}
                >
                  <RegistrationProofDocument
                    registration={searchedStudent}
                    id="status-proof-container"
                  />
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: GALERI & FOTO DOKUMENTASI LATIHAN */}
      {activeTab === 'gallery' && (
        <ParentTrainingGalleryTab
          sessions={trainingSessions}
          initialSessionId={initialGallerySessionId}
        />
      )}

      {/* Modal Kamera Pas Foto 3x4 */}
      <PhotoCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={(photoBase64) => handleInputChange('photoUrl', photoBase64)}
      />
    </div>
  );
};
