import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  Volume2, 
  VolumeX, 
  MessageSquare, 
  CheckCircle2, 
  Eye, 
  Kanban, 
  Table as TableIcon, 
  Share2, 
  Shirt, 
  CreditCard,
  Phone,
  School,
  Database,
  ClipboardCheck,
  X,
  FileSpreadsheet,
  Loader2,
  RotateCcw
} from 'lucide-react';
import { useRealtime } from '../../context/RealtimeContext.tsx';
import { StudentRegistration, RegistrationStatus } from '../../types.ts';
import { formatIndonesianDate, generateWhatsAppMessage } from '../../utils/whatsapp.ts';
import { formatBirthDate } from '../../utils/dateUtils.ts';
import { exportStudentsToExcel } from '../../utils/excelExport.ts';
import { WhatsAppModal } from './WhatsAppModal.tsx';
import { StudentDetailModal } from './StudentDetailModal.tsx';
import { ShareParentLinkModal } from './ShareParentLinkModal.tsx';
import { StudentCardModal } from '../common/StudentCardModal.tsx';
import { DatabaseBackupModal } from './DatabaseBackupModal.tsx';
import { CoachAttendancePortal } from '../coach/CoachAttendancePortal.tsx';
import { EraKidsLogo } from '../common/EraKidsLogo.tsx';

const STATUS_COLUMNS: { status: RegistrationStatus; title: string; color: string; badgeBg: string; textCol: string }[] = [
  { status: 'Register', title: 'Register', color: 'bg-blue-500', badgeBg: 'bg-blue-50 text-blue-700 border-blue-200', textCol: 'text-blue-700' },
  { status: 'Diterima', title: 'Diterima', color: 'bg-emerald-500', badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200', textCol: 'text-emerald-700' },
  { status: 'Pembatalan Keanggotaan', title: 'Pembatalan', color: 'bg-rose-500', badgeBg: 'bg-rose-50 text-rose-700 border-rose-200', textCol: 'text-rose-700' }
];

export const AdminPortal: React.FC = () => {
  const { 
    registrations, 
    trainingSessions,
    stats, 
    isConnected, 
    isCloudConnected,
    latestAlert, 
    clearLatestAlert, 
    updateRegistration, 
    fetchRegistrations,
    soundEnabled, 
    setSoundEnabled 
  } = useRealtime();

  // Section switcher: 'students' (Data Siswa) or 'attendance' (Presensi Pelatih)
  const [adminSection, setAdminSection] = useState<'students' | 'attendance'>('students');

  // Filter and View states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedGender, setSelectedGender] = useState<'ALL' | 'L' | 'P'>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [kanbanMobileTab, setKanbanMobileTab] = useState<string>('Register');

  // Modals state
  const [activeWhatsAppStudent, setActiveWhatsAppStudent] = useState<StudentRegistration | null>(null);
  const [activeDetailStudent, setActiveDetailStudent] = useState<StudentRegistration | null>(null);
  const [activeCardStudent, setActiveCardStudent] = useState<StudentRegistration | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filtered registrations
  const filteredRegistrations = useMemo(() => {
    return registrations.filter(r => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = r.studentName.toLowerCase().includes(q) || r.nickname.toLowerCase().includes(q);
        const matchesReg = r.regNumber.toLowerCase().includes(q);
        const matchesJersey = r.jerseyNumber ? r.jerseyNumber.toLowerCase().includes(q) : false;
        const matchesParent = r.parentName.toLowerCase().includes(q);
        const matchesWa = r.whatsapp.includes(q.replace(/\D/g, ''));
        if (!matchesName && !matchesReg && !matchesJersey && !matchesParent && !matchesWa) return false;
      }

      if (selectedStatus !== 'ALL' && r.status !== selectedStatus) return false;
      if (selectedGender !== 'ALL' && r.gender !== selectedGender) return false;

      return true;
    });
  }, [registrations, searchQuery, selectedStatus, selectedGender]);

  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [exportToast, setExportToast] = useState<string | null>(null);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchRegistrations();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleQuickStatusChange = async (studentId: string, newStatus: RegistrationStatus) => {
    await updateRegistration(studentId, { status: newStatus });
  };

  // 1. Unduh Data Siswa Lengkap Format Excel (.xlsx) Termasuk Foto (Tanpa Kelas & Jadwal Latihan)
  const handleExportExcel = async () => {
    if (registrations.length === 0) {
      alert('Tidak ada data siswa untuk diekspor.');
      return;
    }
    try {
      setIsExportingExcel(true);
      await exportStudentsToExcel(registrations);
      setExportToast('File Excel data siswa beserta foto berhasil diunduh!');
      setTimeout(() => setExportToast(null), 3500);
    } catch (err: any) {
      console.error('Export Excel error:', err);
      alert('Gagal mengunduh file Excel: ' + (err?.message || 'Terjadi kesalahan sistem'));
    } finally {
      setIsExportingExcel(false);
    }
  };

  // 2. Unduh CSV Cadangan (Kelas dan Jadwal Latihan dihilangkan)
  const exportToCSV = () => {
    if (registrations.length === 0) return;

    const headers = [
      'No Registrasi',
      'No Jersey',
      'Nama Siswa',
      'Panggilan',
      'Gender',
      'Tempat Lahir',
      'Tanggal Lahir',
      'Usia',
      'Tinggi Badan',
      'Berat Badan',
      'Sekolah Asal',
      'Nama Orang Tua',
      'Peran',
      'WhatsApp',
      'Email',
      'Alamat',
      'Kelurahan',
      'Kecamatan',
      'Kota',
      'Status Siswa',
      'Catatan',
      'Tanggal Pendaftaran'
    ];

    const rows = registrations.map(r => [
      `"${r.regNumber}"`,
      `"${r.jerseyNumber || ''}"`,
      `"${r.studentName}"`,
      `"${r.nickname}"`,
      `"${r.gender}"`,
      `"${r.birthPlace || ''}"`,
      `"${formatBirthDate(r.birthDate)}"`,
      r.age,
      `"${r.height || ''}"`,
      `"${r.weight || ''}"`,
      `"${r.currentSchool}"`,
      `"${r.parentName}"`,
      `"${r.parentRole}"`,
      `"${r.whatsapp}"`,
      `"${r.email}"`,
      `"${(r.address || '').replace(/"/g, '""')}"`,
      `"${r.subdistrict || ''}"`,
      `"${r.district || ''}"`,
      `"${r.city || ''}"`,
      `"${r.status}"`,
      `"${(r.specialNotes || '').replace(/"/g, '""')}"`,
      `"${r.createdAt}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Registrasi_Volleyball_ERA_Kids_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: RegistrationStatus) => {
    switch (status) {
      case 'Register':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Register
          </span>
        );
      case 'Diterima':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Diterima
          </span>
        );
      case 'Pembatalan Keanggotaan':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Batal
          </span>
        );
    }
  };

  const counts = useMemo(() => {
    return {
      all: registrations.length,
      register: registrations.filter(r => r.status === 'Register').length,
      diterima: registrations.filter(r => r.status === 'Diterima').length,
      pembatalan: registrations.filter(r => r.status === 'Pembatalan Keanggotaan').length,
      genderL: registrations.filter(r => r.gender === 'L').length,
      genderP: registrations.filter(r => r.gender === 'P').length,
    };
  }, [registrations]);

  return (
    <div className="admin-portal-scope space-y-3 sm:space-y-4 w-full max-w-full overflow-x-hidden">
      {/* Real-time Toast Alert */}
      <AnimatePresence>
        {latestAlert && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="p-2.5 sm:p-3 rounded-xl bg-indigo-900 text-white shadow-lg border border-indigo-700 flex items-center justify-between gap-2 text-xs"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base animate-bounce shrink-0">🏐</span>
              <p className="font-medium text-[11px] sm:text-xs truncate">{latestAlert.message}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => {
                  const found = registrations.find(r => r.id === latestAlert.studentId);
                  if (found) setActiveDetailStudent(found);
                  clearLatestAlert();
                }}
                className="px-2 py-1 bg-white text-indigo-950 rounded-lg text-[10px] sm:text-xs font-bold hover:bg-white/90 transition-all"
              >
                Lihat
              </button>
              <button
                onClick={clearLatestAlert}
                className="p-1 text-white/70 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header Bar: Clean & Responsive on Mobile */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-2xs border border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Logo & Title & Mobile Quick Icons */}
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <EraKidsLogo className="w-8 h-8 sm:w-9 sm:h-9" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h1 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                    Admin ERA Kids
                  </h1>
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${isCloudConnected || isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`}
                    title={isCloudConnected ? 'Cloud Firestore & Live Sync Aktif' : isConnected ? 'Live Sync Terhubung' : 'Menghubungkan...'}
                  />
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Cloud Realtime
                  </span>
                </div>
                <p className="text-[10px] sm:text-[10.5px] text-slate-500 truncate">
                  Volleyball Training for Kids
                </p>
              </div>
            </div>

            {/* Mobile-only Sound & Refresh on top row */}
            <div className="flex items-center gap-1 sm:hidden shrink-0">
              <button
                id="btn-toggle-sound-mobile"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-1.5 rounded-lg border transition-all ${
                  soundEnabled
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
                title={soundEnabled ? 'Suara Bel Aktif' : 'Suara Bisu'}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>
              <button
                id="btn-refresh-data-mobile"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                title="Perbarui Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
              </button>
            </div>
          </div>

          {/* Action Buttons: Edge-to-Edge on Mobile, compact on Desktop */}
          <div className="flex items-center gap-1.5 sm:gap-1 w-full sm:w-auto">
            <button
              id="btn-switch-presensi"
              onClick={() => setAdminSection(adminSection === 'attendance' ? 'students' : 'attendance')}
              className={`flex-1 sm:flex-initial px-2 sm:px-2.5 py-1.5 sm:py-1 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 shadow-2xs whitespace-nowrap min-w-0 ${
                adminSection === 'attendance'
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black ring-1 ring-amber-400'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300'
              }`}
              title="Input Presensi Sesi Latihan Siswa (Portal Pelatih)"
            >
              <ClipboardCheck className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{adminSection === 'attendance' ? 'Data Siswa' : 'Presensi Latihan'}</span>
            </button>

            <button
              id="btn-backup-database"
              onClick={() => setIsBackupModalOpen(true)}
              className="flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 sm:py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-all flex items-center justify-center gap-1 shadow-2xs whitespace-nowrap min-w-0"
              title="Cadangkan Database Lengkap & Link Presensi"
            >
              <Database className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Backup DB</span>
            </button>

            <button
              id="btn-share-parent-link"
              onClick={() => setIsShareModalOpen(true)}
              className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-all flex items-center justify-center shadow-2xs shrink-0"
              title="Bagikan Link & QR Code Portal Registrasi Siswa untuk Orang Tua"
              aria-label="Bagikan Link Portal Ortu"
            >
              <Share2 className="w-3.5 h-3.5 shrink-0" />
            </button>

            {/* Desktop-only secondary tools */}
            <div className="hidden sm:flex items-center gap-1 shrink-0">
              <button
                id="btn-toggle-sound"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-1.5 rounded-lg border transition-all ${
                  soundEnabled
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
                title={soundEnabled ? 'Suara Bel Aktif' : 'Suara Bisu'}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>

              <button
                id="btn-refresh-data"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                title="Perbarui Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
              </button>

              <button
                id="btn-export-csv"
                onClick={exportToCSV}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                title="Ekspor CSV"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Section Navigation Tabs: 50%-50% Equal Grid on Mobile */}
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mt-2.5 pt-2 border-t border-slate-100 w-full">
          <button
            id="tab-admin-students"
            onClick={() => setAdminSection('students')}
            className={`w-full justify-center px-2 sm:px-3 py-2 sm:py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 min-w-0 ${
              adminSection === 'students'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Data Siswa</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] shrink-0 ${adminSection === 'students' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {registrations.length}
            </span>
          </button>

          <button
            id="tab-admin-attendance"
            onClick={() => setAdminSection('attendance')}
            className={`w-full justify-center px-2 sm:px-3 py-2 sm:py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 min-w-0 ${
              adminSection === 'attendance'
                ? 'bg-amber-500 text-slate-950 font-black shadow-2xs ring-2 ring-amber-300'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5 shrink-0 text-amber-700" />
            <span className="truncate">Presensi Latihan</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold shrink-0 ${adminSection === 'attendance' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-900'}`}>
              {trainingSessions.length}
            </span>
          </button>
        </div>

        {/* Compact KPI Stats Bar: 4-Item Single Grid - Shown when in students section */}
        {adminSection === 'students' && (
          <div className="grid grid-cols-4 gap-1 sm:gap-2 mt-2.5 pt-2.5 border-t border-slate-100 w-full">
            <div className="p-1 sm:p-2 rounded-lg bg-slate-50 border border-slate-200 text-center min-w-0">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wide block truncate">
                Total
              </span>
              <span className="text-sm sm:text-lg font-black text-slate-900 block leading-tight">
                {stats?.total ?? counts.all}
              </span>
            </div>

            <div className="p-1 sm:p-2 rounded-lg bg-blue-50/80 border border-blue-200 text-center min-w-0">
              <span className="text-[9px] sm:text-[10px] font-bold text-blue-700 uppercase tracking-wide block truncate">
                Masuk
              </span>
              <span className="text-sm sm:text-lg font-black text-blue-900 block leading-tight">
                {counts.register}
              </span>
            </div>

            <div className="p-1 sm:p-2 rounded-lg bg-emerald-50/80 border border-emerald-200 text-center min-w-0">
              <span className="text-[9px] sm:text-[10px] font-bold text-emerald-700 uppercase tracking-wide block truncate">
                Diterima
              </span>
              <span className="text-sm sm:text-lg font-black text-emerald-900 block leading-tight">
                {counts.diterima}
              </span>
            </div>

            <div className="p-1 sm:p-2 rounded-lg bg-rose-50/80 border border-rose-200 text-center min-w-0">
              <span className="text-[9px] sm:text-[10px] font-bold text-rose-700 uppercase tracking-wide block truncate">
                Batal
              </span>
              <span className="text-sm sm:text-lg font-black text-rose-900 block leading-tight">
                {counts.pembatalan}
              </span>
            </div>
          </div>
        )}
      </div>

      {adminSection === 'attendance' ? (
        <CoachAttendancePortal
          isEmbedded
          onOpenAdmin={() => setAdminSection('students')}
        />
      ) : (
        <>

      {/* Filter Toolbar: Search + View Switcher + Status Filter */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-3 shadow-2xs border border-slate-200/80 space-y-2 w-full">
        <div className="flex items-center justify-between gap-2">
          {/* Search Box */}
          <div className="relative flex-1 min-w-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              id="admin-search-input"
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari siswa, no. reg, jersey..."
              className="admin-control w-full pl-7 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Table / Kanban View Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
            <button
              id="btn-view-table"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1 ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
              }`}
              title="Tampilan List"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">List</span>
            </button>
            <button
              id="btn-view-kanban"
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1 ${
                viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
              }`}
              title="Tampilan Kanban Board"
            >
              <Kanban className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Kanban</span>
            </button>
          </div>
        </div>

        {/* Dropdown Filters Bar: Status Pendaftaran & Jenis Kelamin Berdampingan di HP */}
        <div className="pt-2 border-t border-slate-100">
          <div className="grid grid-cols-2 sm:flex sm:items-end gap-2">
            {/* Dropdown 1: Status Pendaftaran */}
            <div className="col-span-1 sm:w-64 min-w-0">
              <label htmlFor="filter-admin-status" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 truncate">
                Status Pendaftaran
              </label>
              <select
                id="filter-admin-status"
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="admin-control w-full bg-slate-50 border border-slate-200 rounded-lg px-2 sm:px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer truncate"
              >
                <option value="ALL">Semua Status ({counts.all})</option>
                <option value="Register">Menunggu ({counts.register})</option>
                <option value="Diterima">Diterima ({counts.diterima})</option>
                <option value="Pembatalan Keanggotaan">Dibatalkan ({counts.pembatalan})</option>
              </select>
            </div>

            {/* Dropdown 2: Jenis Kelamin */}
            <div className="col-span-1 sm:w-48 min-w-0">
              <label htmlFor="filter-admin-gender" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 truncate">
                Jenis Kelamin
              </label>
              <select
                id="filter-admin-gender"
                value={selectedGender}
                onChange={e => setSelectedGender(e.target.value as 'ALL' | 'L' | 'P')}
                className="admin-control w-full bg-slate-50 border border-slate-200 rounded-lg px-2 sm:px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer truncate"
              >
                <option value="ALL">Semua Gender ({counts.all})</option>
                <option value="L">Laki-laki (L) ({counts.genderL})</option>
                <option value="P">Perempuan (P) ({counts.genderP})</option>
              </select>
            </div>

            {/* Action Button: Reset Filter (jika ada filter yang aktif) */}
            {(selectedStatus !== 'ALL' || selectedGender !== 'ALL' || searchQuery.trim() !== '') && (
              <div className="col-span-2 sm:col-span-1 sm:ml-auto flex items-center justify-end">
                <button
                  id="btn-reset-filters"
                  onClick={() => {
                    setSelectedStatus('ALL');
                    setSelectedGender('ALL');
                    setSearchQuery('');
                  }}
                  className="w-full sm:w-auto px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-2xs"
                  title="Reset Semua Filter"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Filter</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filter Summary & Quick Status Badges */}
        <div className="flex items-center justify-between gap-2 pt-1 flex-wrap text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span>
              Menampilkan: <strong className="text-slate-900 font-bold">{filteredRegistrations.length}</strong> dari <span className="font-semibold">{registrations.length}</span> siswa
            </span>
            {selectedStatus !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                Status: {selectedStatus === 'Register' ? 'Menunggu Verifikasi' : selectedStatus === 'Pembatalan Keanggotaan' ? 'Dibatalkan' : selectedStatus}
                <button onClick={() => setSelectedStatus('ALL')} className="hover:text-indigo-900"><X className="w-2.5 h-2.5" /></button>
              </span>
            )}
            {selectedGender !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                Gender: {selectedGender === 'L' ? 'Laki-laki' : 'Perempuan'}
                <button onClick={() => setSelectedGender('ALL')} className="hover:text-blue-900"><X className="w-2.5 h-2.5" /></button>
              </span>
            )}
          </div>

          {/* Quick pills */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {[
              { id: 'ALL', label: 'Semua', count: counts.all },
              { id: 'Register', label: 'Verifikasi', count: counts.register },
              { id: 'Diterima', label: 'Diterima', count: counts.diterima },
              { id: 'Pembatalan Keanggotaan', label: 'Batal', count: counts.pembatalan }
            ].map(st => (
              <button
                key={st.id}
                onClick={() => setSelectedStatus(st.id)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all whitespace-nowrap flex items-center gap-1 shrink-0 ${
                  selectedStatus === st.id
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{st.label}</span>
                <span className={`text-[9px] px-1 rounded-full ${
                  selectedStatus === st.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {st.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: TABLE / LIST VIEW (RESPONSIVE CARDS ON HP, TABLE ON DESKTOP)      */}
      {/* ========================================================================= */}
      {viewMode === 'table' && (
        <div className="w-full">
          {/* Mobile Card List (sm:hidden) - Tailored for Smartphone Screen Width */}
          <div className="space-y-2.5 sm:hidden w-full">
            {filteredRegistrations.length === 0 ? (
              <div className="p-6 bg-white rounded-xl text-center text-xs text-slate-400 border border-slate-200">
                Tidak ada data siswa yang cocok dengan filter.
              </div>
            ) : (
              filteredRegistrations.map(st => (
                <div
                  key={st.id}
                  onClick={() => setActiveDetailStudent(st)}
                  className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2.5 active:bg-slate-50 transition-colors cursor-pointer w-full"
                >
                  {/* Top Bar: Reg# + Jersey & Quick Status Select */}
                  <div className="flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 text-[10px]">
                        {st.regNumber}
                      </span>
                      {st.jerseyNumber && (
                        <span className="inline-flex items-center gap-0.5 font-bold text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-300">
                          <Shirt className="w-2.5 h-2.5 text-amber-600" />
                          #{st.jerseyNumber} ({st.gender === 'L' ? 'L' : 'P'})
                        </span>
                      )}
                    </div>
                    
                    {/* Quick Status Select on Mobile Card */}
                    <div onClick={e => e.stopPropagation()} className="shrink-0">
                      <select
                        value={st.status}
                        onChange={e => handleQuickStatusChange(st.id, e.target.value as RegistrationStatus)}
                        className={`admin-control admin-status-select text-[10.5px] font-bold px-2 py-1 rounded-md border focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer ${
                          st.status === 'Register' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                          st.status === 'Diterima' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                          'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        <option value="Register">Register</option>
                        <option value="Diterima">Diterima</option>
                        <option value="Pembatalan Keanggotaan">Batal</option>
                      </select>
                    </div>
                  </div>

                  {/* Student Identity: Photo + Name + Details */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-lg border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center shrink-0">
                      {st.photoUrl ? (
                        <img src={st.photoUrl} alt={st.studentName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-base">{st.gender === 'L' ? '👦' : '👧'}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                        {st.studentName}
                      </h3>
                      <p className="text-[10.5px] text-slate-500 truncate">
                        Panggilan: <strong className="text-slate-700">{st.nickname || '-'}</strong> • {st.age} thn
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {st.currentSchool}
                      </p>
                    </div>
                  </div>

                  {/* Actions Row: Parent info + 3 Quick Action Buttons */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                    <div className="text-[10.5px] text-slate-500 truncate min-w-0">
                      Ortu: <strong className="text-slate-700">{st.parentName}</strong>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setActiveCardStudent(st)}
                        className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-md text-[10px] font-bold flex items-center gap-1"
                        title="Cetak Kartu Siswa"
                      >
                        <CreditCard className="w-3 h-3" />
                        <span>Kartu</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveWhatsAppStudent(st)}
                        className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-bold flex items-center gap-1"
                        title="Kirim Pesan WhatsApp"
                      >
                        <Phone className="w-3 h-3 text-emerald-600" />
                        <span>WA</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveDetailStudent(st)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[10px] font-semibold"
                        title="Buka Detail"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table (hidden sm:block) */}
          <div className="hidden sm:block bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">No. Reg</th>
                    <th className="py-3 px-4">Siswa & Jersey</th>
                    <th className="py-3 px-4">Orang Tua & WA</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Aksi Cepat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRegistrations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400">
                        Tidak ada data pendaftaran yang sesuai kriteria pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredRegistrations.map(student => (
                      <tr 
                        key={student.id} 
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                        onClick={() => setActiveDetailStudent(student)}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                          {student.regNumber}
                          <span className="block font-sans font-normal text-[10px] text-slate-400">
                            {formatIndonesianDate(student.createdAt)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                              {student.gender === 'L' ? '👦' : '👧'}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                {student.studentName}
                                {student.jerseyNumber && (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1 rounded bg-amber-50 text-amber-800 border border-amber-300">
                                    <Shirt className="w-2.5 h-2.5 text-amber-600" />
                                    #{student.jerseyNumber}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {student.nickname} • {student.age} thn • {student.currentSchool}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{student.parentName}</div>
                          <div className="text-[11px] text-emerald-700 font-mono flex items-center gap-1">
                            <Phone className="w-2.5 h-2.5 text-emerald-600" />
                            {student.whatsapp}
                          </div>
                        </td>
                        <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                          <select
                            value={student.status}
                            onChange={e => handleQuickStatusChange(student.id, e.target.value as RegistrationStatus)}
                            className={`admin-control admin-status-select text-xs font-bold px-2 py-1 rounded-lg border focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer ${
                              student.status === 'Register' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                              student.status === 'Diterima' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                              'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                          >
                            <option value="Register">Register</option>
                            <option value="Diterima">Diterima</option>
                            <option value="Pembatalan Keanggotaan">Pembatalan</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setActiveCardStudent(student)}
                              className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg transition-all"
                              title="Cetak Kartu Siswa ERA Kids"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setActiveWhatsAppStudent(student)}
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg transition-all"
                              title="Kirim WhatsApp Resmi"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setActiveDetailStudent(student)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all"
                              title="Detail Lengkap"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: KANBAN BOARD VIEW (COMPACT & RESPONSIVE WITH MOBILE COLUMN TABS)  */}
      {/* ========================================================================= */}
      {viewMode === 'kanban' && (
        <div className="space-y-2.5">
          {/* Mobile Kanban Column Tabs (sm:hidden) */}
          <div className="flex sm:hidden bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            {STATUS_COLUMNS.map(col => {
              const count = registrations.filter(r => r.status === col.status).length;
              return (
                <button
                  key={col.status}
                  onClick={() => setKanbanMobileTab(col.status)}
                  className={`flex-1 py-1 px-1.5 rounded-lg font-bold text-[11px] transition-all flex items-center justify-center gap-1 ${
                    kanbanMobileTab === col.status
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${col.color}`} />
                  <span>{col.title}</span>
                  <span className="text-[9px] px-1 rounded-full bg-slate-200 text-slate-700">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Kanban Columns: 3 columns on desktop, active tab column on mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
            {STATUS_COLUMNS.map(col => {
              const isHiddenOnMobile = kanbanMobileTab !== col.status;
              const items = filteredRegistrations.filter(r => r.status === col.status);

              return (
                <div 
                  key={col.status} 
                  className={`bg-slate-100/70 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 flex flex-col border border-slate-200/80 ${
                    isHiddenOnMobile ? 'hidden sm:flex' : 'flex'
                  }`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${col.color}`} />
                      {col.title}
                    </h3>
                    <span className="text-[10.5px] font-bold bg-white px-2 py-0.2 rounded-full border border-slate-200 text-slate-600">
                      {items.length}
                    </span>
                  </div>

                  {/* Compact Cards List */}
                  <div className="space-y-2 flex-1 overflow-y-auto max-h-[500px]">
                    {items.length === 0 ? (
                      <div className="p-4 bg-white/60 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-400">
                        Tidak ada siswa di kolom ini.
                      </div>
                    ) : (
                      items.map(st => (
                        <div
                          key={st.id}
                          className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-400 transition-all cursor-pointer space-y-1.5"
                          onClick={() => setActiveDetailStudent(st)}
                        >
                          {/* Card Top: Reg# + Jersey */}
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono font-bold text-indigo-700 text-[10.5px]">{st.regNumber}</span>
                            {st.jerseyNumber && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-300">
                                <Shirt className="w-2.5 h-2.5 text-amber-600" />
                                #{st.jerseyNumber}
                              </span>
                            )}
                          </div>

                          {/* Student Name */}
                          <div>
                            <h4 className="font-bold text-xs text-slate-900 truncate">{st.studentName}</h4>
                            <p className="text-[10px] text-slate-500 truncate">
                              {st.nickname} • {st.age} thn • {st.currentSchool}
                            </p>
                          </div>

                          {/* Quick Action Footer */}
                          <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10.5px]" onClick={e => e.stopPropagation()}>
                            <a 
                              href={`https://wa.me/${st.whatsapp.replace(/\D/g, '')}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-emerald-700 font-semibold hover:underline flex items-center gap-0.5"
                            >
                              <Phone className="w-2.5 h-2.5" />
                              WA
                            </a>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setActiveCardStudent(st)}
                                className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded hover:bg-indigo-100 text-[10px]"
                                title="Cetak Kartu Siswa"
                              >
                                Kartu
                              </button>
                              <button
                                onClick={() => setActiveWhatsAppStudent(st)}
                                className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded hover:bg-emerald-100 text-[10px]"
                                title="Kirim Notifikasi"
                              >
                                Chat
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      </>
      )}

      {/* MODALS */}
      {/* WHATSAPP NOTIFICATION MODAL */}
      <WhatsAppModal
        student={activeWhatsAppStudent}
        isOpen={Boolean(activeWhatsAppStudent)}
        onClose={() => setActiveWhatsAppStudent(null)}
      />

      {/* STUDENT DETAIL MODAL */}
      <StudentDetailModal
        student={activeDetailStudent}
        onClose={() => setActiveDetailStudent(null)}
        onOpenWhatsApp={st => setActiveWhatsAppStudent(st)}
      />

      {/* SHARE LINK MODAL */}
      <ShareParentLinkModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

      {/* STUDENT CARD MODAL */}
      <StudentCardModal
        student={activeCardStudent}
        isOpen={Boolean(activeCardStudent)}
        onClose={() => setActiveCardStudent(null)}
      />

      {/* DATABASE BACKUP & ATTENDANCE INTEGRATION MODAL */}
      <DatabaseBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />

      {/* EXPORT EXCEL TOAST NOTIFICATION */}
      {exportToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{exportToast}</span>
        </div>
      )}
    </div>
  );
};
