import React, { useState } from 'react';
import { 
  X, 
  User, 
  Users,
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Printer, 
  Trash2, 
  MessageSquare,
  Sparkles,
  Save,
  Clock3,
  Shirt,
  CreditCard,
  School,
  FileText,
  Activity,
  ChevronRight,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { StudentRegistration, RegistrationStatus } from '../../types.ts';
import { useRealtime } from '../../context/RealtimeContext.tsx';
import { formatIndonesianDate } from '../../utils/whatsapp.ts';
import { formatBirthDate } from '../../utils/dateUtils.ts';
import { StudentCardModal } from '../common/StudentCardModal.tsx';

interface StudentDetailModalProps {
  student: StudentRegistration | null;
  onClose: () => void;
  onOpenWhatsApp: (student: StudentRegistration) => void;
  initialTab?: 'student' | 'parent' | 'notes';
}

const STATUS_OPTIONS: RegistrationStatus[] = [
  'Register',
  'Diterima',
  'Pembatalan Keanggotaan'
];

type DetailTab = 'student' | 'parent' | 'notes';

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({ 
  student, 
  onClose,
  onOpenWhatsApp,
  initialTab = 'student'
}) => {
  const { updateRegistration, deleteRegistration } = useRealtime();

  const [currentStatus, setCurrentStatus] = useState<RegistrationStatus>(student?.status || 'Register');
  const [specialNotes, setSpecialNotes] = useState(student?.specialNotes || '');
  const [adminNotes, setAdminNotes] = useState(student?.adminNotes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>(initialTab);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync state whenever student changes
  React.useEffect(() => {
    if (student) {
      setCurrentStatus(student.status || 'Register');
      setSpecialNotes(student.specialNotes || '');
      setAdminNotes(student.adminNotes || '');
      if (initialTab) {
        setActiveTab(initialTab);
      }
    }
  }, [student, initialTab]);

  if (!student) return null;

  const handleSave = async () => {
    setIsSaving(true);
    await updateRegistration(student.id, {
      status: currentStatus,
      specialNotes: specialNotes.trim(),
      adminNotes: adminNotes.trim()
    });

    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    await deleteRegistration(student.id);
    setIsDeleting(false);
    setShowDeleteConfirm(false);
    onClose();
  };

  const statusColors: Record<RegistrationStatus, { bg: string; text: string; border: string }> = {
    'Register': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    'Diterima': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    'Pembatalan Keanggotaan': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto overflow-x-hidden">
      {/* Modal Container: Bottom sheet on mobile, rounded card on tablet/desktop */}
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-full sm:max-w-2xl shadow-2xl border-0 sm:border border-slate-200 overflow-hidden max-h-[96vh] sm:max-h-[88vh] flex flex-col animate-in fade-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        
        {/* Mobile Pull Handle Indicator */}
        <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto my-2 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center justify-center font-bold text-base sm:text-lg shrink-0">
              {student.photoUrl ? (
                <img src={student.photoUrl} alt="" className="w-full h-full object-cover rounded-xl" />
              ) : (
                student.gender === 'L' ? '👦' : '👧'
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-bold text-sm sm:text-base truncate max-w-[170px] sm:max-w-[260px]">
                  {student.studentName}
                </h3>
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  {student.regNumber}
                </span>
                {student.jerseyNumber && (
                  <span className="inline-flex items-center gap-0.5 font-bold text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    <Shirt className="w-2.5 h-2.5" />
                    #{student.jerseyNumber}
                  </span>
                )}
              </div>
              <p className="text-[10.5px] text-slate-400 truncate">
                Panggilan: <strong className="text-white">{student.nickname || '-'}</strong> • {student.age} Tahun
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              id="btn-open-student-card"
              onClick={() => setIsCardModalOpen(true)}
              className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1 transition-colors shadow-2xs"
              title="Cetak Kartu Siswa ERA Kids"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kartu Siswa</span>
            </button>
            <button
              onClick={() => window.print()}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Cetak Berkas"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Action Ribbon */}
        <div className="px-4 py-2.5 sm:px-5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Status:
            </span>
            <select
              id="select-detail-status"
              value={currentStatus}
              onChange={e => setCurrentStatus(e.target.value as RegistrationStatus)}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenWhatsApp(student);
              }}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
            >
              <MessageSquare className="w-3 h-3" />
              <span>WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(prev => !prev)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Hapus Data Siswa"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* In-Modal Delete Confirmation Banner */}
        {showDeleteConfirm && (
          <div className="px-4 py-3 bg-rose-50 border-b border-rose-200 text-rose-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-150">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-rose-100 text-rose-600 rounded-xl shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-rose-900">
                  Hapus data pendaftaran ananda {student.studentName}?
                </p>
                <p className="text-[11px] text-rose-700">
                  No. Reg: {student.regNumber} • Tindakan ini akan menghapus data siswa secara permanen.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-rose-100 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Ya, Hapus Siswa</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Clean Segmented Navigation Tabs */}
        <div className="px-3 sm:px-5 pt-2 bg-white border-b border-slate-200 flex items-center gap-1 shrink-0 overflow-x-auto no-scrollbar whitespace-nowrap">
          <button
            type="button"
            onClick={() => setActiveTab('student')}
            className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'student'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Data Siswa</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('parent')}
            title="Orang Tua & Kelas"
            aria-label="Orang Tua & Kelas"
            className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 shrink-0 ${
              activeTab === 'parent'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Orang Tua & Kelas</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            title="Catatan Khusus Siswa & Log Riwayat"
            aria-label="Catatan Khusus Siswa & Log"
            className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 shrink-0 ${
              activeTab === 'notes'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4 text-amber-600" />
            <span>Catatan Khusus</span>
            {specialNotes && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Ada Catatan Khusus" />
            )}
            {student.whatsappNotifications.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded-full font-mono">
                {student.whatsappNotifications.length}
              </span>
            )}
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto overflow-x-hidden space-y-3.5 text-slate-800 text-xs flex-1">
          
          {/* TAB 1: DATA PRIBADI SISWA */}
          {activeTab === 'student' && (
            <div className="space-y-3">
              {/* Photo & Main Identity row */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center gap-3">
                <div className="w-14 h-18 rounded-lg border-2 border-amber-400/80 overflow-hidden bg-slate-200 shrink-0 shadow-xs flex items-center justify-center relative">
                  {student.photoUrl ? (
                    <img src={student.photoUrl} alt={student.studentName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">{student.gender === 'L' ? '👦' : '👧'}</span>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-slate-900/80 text-[7px] text-amber-300 text-center font-bold">
                    3 x 4
                  </div>
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] text-slate-500 font-semibold uppercase">No. Registrasi:</span>
                    <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                      {student.regNumber}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] text-slate-500 font-semibold uppercase">No. Jersey:</span>
                    <span className="font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-300">
                      #{student.jerseyNumber || '-'} ({student.gender === 'L' ? 'L' : 'P'})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] text-slate-500 font-semibold uppercase">Terdaftar:</span>
                    <span className="text-slate-600 text-[11px]">{formatIndonesianDate(student.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Catatan Khusus Siswa */}
              {specialNotes && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2.5">
                  <FileText className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-950 text-xs">
                        Catatan Khusus:
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('notes')}
                        className="text-[10px] font-bold text-amber-700 hover:text-amber-900 hover:underline"
                      >
                        Edit Catatan
                      </button>
                    </div>
                    <p className="text-slate-800 text-xs mt-1 leading-relaxed whitespace-pre-wrap">
                      {specialNotes}
                    </p>
                  </div>
                </div>
              )}

              {/* Tidy Key-Value Grid */}
              <div className="bg-white rounded-xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
                <div className="p-2.5 flex justify-between items-center">
                  <span className="text-slate-500">Nama Lengkap</span>
                  <span className="font-bold text-slate-900 text-right">{student.studentName}</span>
                </div>
                <div className="p-2.5 flex justify-between items-center">
                  <span className="text-slate-500">Nama Panggilan</span>
                  <span className="font-semibold text-slate-800">{student.nickname || '-'}</span>
                </div>
                <div className="p-2.5 flex justify-between items-center">
                  <span className="text-slate-500">Jenis Kelamin & Usia</span>
                  <span className="font-semibold text-slate-800">
                    {student.gender === 'L' ? 'Laki-laki' : 'Perempuan'} • {student.age} Tahun
                  </span>
                </div>
                <div className="p-2.5 flex justify-between items-center">
                  <span className="text-slate-500">Tempat, Tgl Lahir (TTL)</span>
                  <span className="font-semibold text-slate-800 text-right">
                    {student.birthPlace ? `${student.birthPlace}, ` : ''}{formatBirthDate(student.birthDate)}
                  </span>
                </div>
                {(student.height || student.weight) && (
                  <div className="p-2.5 flex justify-between items-center">
                    <span className="text-slate-500">Tinggi / Berat Badan</span>
                    <span className="font-semibold text-slate-800">
                      {student.height ? `${student.height} cm` : '-'} / {student.weight ? `${student.weight} kg` : '-'}
                    </span>
                  </div>
                )}
                <div className="p-2.5 flex justify-between items-center">
                  <span className="text-slate-500">Asal Sekolah</span>
                  <span className="font-semibold text-slate-800 text-right">{student.currentSchool}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ORANG TUA & KELAS */}
          {activeTab === 'parent' && (
            <div className="space-y-3">
              {/* Kontak Orang Tua */}
              <div className="bg-white rounded-xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
                <div className="p-2.5 flex justify-between items-center">
                  <span className="text-slate-500">Orang Tua / Wali</span>
                  <span className="font-bold text-slate-900">{student.parentName} ({student.parentRole})</span>
                </div>
                <div className="p-2.5 flex justify-between items-center">
                  <span className="text-slate-500">Nomor WhatsApp</span>
                  <a 
                    href={`https://wa.me/${student.whatsapp.replace(/\D/g, '')}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="font-bold text-emerald-700 hover:underline flex items-center gap-1"
                  >
                    <Phone className="w-3 h-3 text-emerald-600" />
                    {student.whatsapp}
                  </a>
                </div>
                <div className="p-2.5 flex justify-between items-center">
                  <span className="text-slate-500">Email</span>
                  <span className="text-slate-700">{student.email || '-'}</span>
                </div>
                <div className="p-2.5 flex justify-between items-center">
                  <span className="text-slate-500">Domisili</span>
                  <span className="font-semibold text-slate-800">{student.city || '-'}</span>
                </div>
                <div className="p-2.5">
                  <span className="text-slate-500 block mb-0.5">Alamat Tempat Tinggal:</span>
                  <p className="text-slate-800 font-medium leading-relaxed">
                    {student.address || '-'}
                  </p>
                  {(student.subdistrict || student.district) && (
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Kel. {student.subdistrict || '-'}, Kec. {student.district || '-'}
                    </span>
                  )}
                </div>
              </div>

              {/* Kelas & Jadwal */}
              <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-2">
                <h4 className="font-bold text-xs text-indigo-950 flex items-center gap-1.5">
                  <span>🏐</span>
                  Kelas & Jadwal Latihan Resmi
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 text-[11px] block">Program:</span>
                    <span className="font-bold text-indigo-950">Volleyball Training for Kids</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Jadwal:</span>
                    <span className="font-bold text-slate-900">
                      {student.preferredSchedule || "Rabu & Jum'at (18.45 - 21.00 WIB)"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CATATAN KHUSUS & LOG RIWAYAT */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              {/* Input Catatan Khusus Siswa */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-600" />
                  <span>Catatan Khusus Siswa:</span>
                </label>
                <textarea
                  rows={3}
                  value={specialNotes}
                  onChange={e => setSpecialNotes(e.target.value)}
                  placeholder="Tulis catatan khusus siswa..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Catatan Internal Tambahan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Catatan Internal:
                </label>
                <textarea
                  rows={2}
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  placeholder="Catatan administrasi tambahan..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Riwayat Notifikasi WhatsApp */}
              <div>
                <h4 className="font-bold text-xs text-slate-700 mb-2 flex items-center gap-1.5">
                  <Clock3 className="w-3.5 h-3.5 text-slate-400" />
                  Riwayat Notifikasi WhatsApp ({student.whatsappNotifications.length})
                </h4>
                {student.whatsappNotifications.length === 0 ? (
                  <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl text-center">
                    Belum ada notifikasi WhatsApp terkirim ke orang tua.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {student.whatsappNotifications.map(notif => (
                      <div
                        key={notif.id}
                        className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-start justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="font-bold text-slate-800 truncate">{notif.title}</span>
                            <span className="text-[9px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-semibold">
                              {notif.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 line-clamp-2">{notif.message}</p>
                        </div>
                        <div className="text-right text-[10px] text-slate-400 shrink-0">
                          {formatIndonesianDate(notif.sentAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal Sticky Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {saveSuccess ? (
              <span className="text-emerald-600 font-bold flex items-center gap-1 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" /> Tersimpan!
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">ID: {student.id.slice(0, 8)}...</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Tutup
            </button>
            <button
              type="button"
              id="btn-save-student-detail"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all shadow-xs flex items-center gap-1"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </div>

      {/* Official Student Card Modal */}
      <StudentCardModal
        student={student}
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
      />
    </div>
  );
};
