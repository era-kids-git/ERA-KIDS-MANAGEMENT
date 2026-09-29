import React, { useState, useRef } from 'react';
import { 
  X, 
  User, 
  Users,
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Printer, 
  Trash2, 
  MessageSquare,
  Save,
  Clock3,
  Shirt,
  CreditCard,
  FileText,
  Loader2,
  AlertTriangle,
  Edit3,
  Camera,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { StudentRegistration, RegistrationStatus } from '../../types.ts';
import { useRealtime } from '../../context/RealtimeContext.tsx';
import { formatIndonesianDate } from '../../utils/whatsapp.ts';
import { formatBirthDate } from '../../utils/dateUtils.ts';
import { formatJerseyNumber, calculateAgeFromBirthDate } from '../../utils/regNumber.ts';
import { EraKidsLogo } from '../common/EraKidsLogo.tsx';
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
  const { registrations, updateRegistration, deleteRegistration } = useRealtime();

  // Mode: View vs Edit
  const [isEditing, setIsEditing] = useState(false);

  // Status & Notes
  const [currentStatus, setCurrentStatus] = useState<RegistrationStatus>(student?.status || 'Register');
  const [specialNotes, setSpecialNotes] = useState(student?.specialNotes || '');
  const [adminNotes, setAdminNotes] = useState(student?.adminNotes || '');

  // Editable Form Fields
  const [editForm, setEditForm] = useState({
    studentName: '',
    nickname: '',
    gender: 'L' as 'L' | 'P',
    birthPlace: '',
    birthDate: '',
    height: '',
    weight: '',
    jerseyNumber: '',
    currentSchool: '',
    photoUrl: '',
    parentName: '',
    parentRole: 'Ayah' as 'Ayah' | 'Ibu' | 'Wali',
    whatsapp: '',
    email: '',
    address: '',
    subdistrict: '',
    district: '',
    city: '',
    preferredSchedule: ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>(initialTab);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Photo upload references
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

  // Sync state whenever student changes
  React.useEffect(() => {
    if (student) {
      setCurrentStatus(student.status || 'Register');
      setSpecialNotes(student.specialNotes || '');
      setAdminNotes(student.adminNotes || '');
      setIsEditing(false);
      setEditError(null);

      setEditForm({
        studentName: student.studentName || '',
        nickname: student.nickname || '',
        gender: student.gender || 'L',
        birthPlace: student.birthPlace || '',
        birthDate: student.birthDate || '',
        height: student.height || '',
        weight: student.weight || '',
        jerseyNumber: student.jerseyNumber || '',
        currentSchool: student.currentSchool || '',
        photoUrl: student.photoUrl || '',
        parentName: student.parentName || '',
        parentRole: student.parentRole || 'Ayah',
        whatsapp: student.whatsapp || '',
        email: student.email || '',
        address: student.address || '',
        subdistrict: student.subdistrict || '',
        district: student.district || '',
        city: student.city || 'BEKASI',
        preferredSchedule: student.preferredSchedule || "Rabu & Jum'at (18.45 - 21.00 WIB)"
      });

      if (initialTab) {
        setActiveTab(initialTab);
      }
    }
  }, [student, initialTab]);

  if (!student) return null;

  // Handle Photo Compression & Set
  const handlePhotoFileChange = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Format file tidak didukung. Mohon pilih file foto/gambar (JPG/PNG).');
      return;
    }

    setIsProcessingPhoto(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        setIsProcessingPhoto(false);
        return;
      }

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
          setEditForm(prev => ({ ...prev, photoUrl: optimizedBase64 }));
        } else {
          setEditForm(prev => ({ ...prev, photoUrl: dataUrl }));
        }
        setIsProcessingPhoto(false);
      };
      img.onerror = () => {
        setEditForm(prev => ({ ...prev, photoUrl: dataUrl }));
        setIsProcessingPhoto(false);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Save changes (both view mode quick save and edit mode full save)
  const handleSave = async () => {
    setIsSaving(true);
    setEditError(null);

    try {
      if (isEditing) {
        // Validation checks
        if (!editForm.studentName.trim()) {
          setEditError('Nama Lengkap Siswa wajib diisi.');
          setIsSaving(false);
          return;
        }

        const cleanJersey = formatJerseyNumber(editForm.jerseyNumber);
        if (cleanJersey) {
          // Check jersey uniqueness separated by gender (excluding current student)
          const jerseyConflict = registrations.find(r => {
            if (r.id === student.id) return false;
            if (r.status === 'Pembatalan Keanggotaan') return false;
            const sameGender = r.gender === editForm.gender;
            const sameNumber = formatJerseyNumber(r.jerseyNumber) === cleanJersey;
            return sameGender && sameNumber;
          });

          if (jerseyConflict) {
            const genderLabel = editForm.gender === 'L' ? 'Laki-laki' : 'Perempuan';
            setEditError(`No. Jersey ${cleanJersey} untuk kategori ${genderLabel} sudah terdaftar atas nama ${jerseyConflict.studentName}.`);
            setIsSaving(false);
            return;
          }
        }

        const computedAge = editForm.birthDate 
          ? calculateAgeFromBirthDate(editForm.birthDate) 
          : student.age;

        await updateRegistration(student.id, {
          status: currentStatus,
          specialNotes: specialNotes.trim(),
          adminNotes: adminNotes.trim(),
          studentName: editForm.studentName.trim().toUpperCase(),
          nickname: (editForm.nickname || editForm.studentName.split(' ')[0] || '').trim().toUpperCase(),
          gender: editForm.gender,
          birthPlace: editForm.birthPlace.trim().toUpperCase(),
          birthDate: editForm.birthDate,
          age: computedAge,
          height: editForm.height.trim(),
          weight: editForm.weight.trim(),
          jerseyNumber: cleanJersey,
          currentSchool: (editForm.currentSchool || 'BELUM SEKOLAH').trim().toUpperCase(),
          photoUrl: editForm.photoUrl || student.photoUrl || '',
          parentName: editForm.parentName.trim().toUpperCase(),
          parentRole: editForm.parentRole,
          whatsapp: editForm.whatsapp.trim(),
          email: editForm.email.trim(),
          address: editForm.address.trim().toUpperCase(),
          subdistrict: editForm.subdistrict.trim().toUpperCase(),
          district: editForm.district.trim().toUpperCase(),
          city: editForm.city.trim().toUpperCase(),
          preferredSchedule: editForm.preferredSchedule.trim()
        });

        setIsEditing(false);
      } else {
        // Quick save status & notes
        await updateRegistration(student.id, {
          status: currentStatus,
          specialNotes: specialNotes.trim(),
          adminNotes: adminNotes.trim()
        });
      }

      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      setIsSaving(false);
      setEditError(err.message || 'Gagal menyimpan perubahan.');
    }
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    await deleteRegistration(student.id);
    setIsDeleting(false);
    setShowDeleteConfirm(false);
    onClose();
  };

  const displayPhoto = isEditing ? editForm.photoUrl : (student.photoUrl || '');
  const activeGender = isEditing ? editForm.gender : student.gender;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto overflow-x-hidden">
      {/* Hidden File Inputs for Photo Upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={e => {
          if (e.target.files && e.target.files[0]) {
            handlePhotoFileChange(e.target.files[0]);
          }
        }}
      />
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={e => {
          if (e.target.files && e.target.files[0]) {
            handlePhotoFileChange(e.target.files[0]);
          }
        }}
      />

      {/* Modal Container */}
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-full sm:max-w-2xl shadow-2xl border-0 sm:border border-slate-200 overflow-hidden max-h-[96vh] sm:max-h-[90vh] flex flex-col animate-in fade-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        
        {/* Mobile Pull Handle Indicator */}
        <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto my-2 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative group shrink-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center justify-center font-bold text-base sm:text-lg overflow-hidden">
                {displayPhoto ? (
                  <img src={displayPhoto} alt="" className="w-full h-full object-cover" />
                ) : (
                  activeGender === 'L' ? '👦' : '👧'
                )}
              </div>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 p-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-full shadow-md transition-all"
                  title="Ganti Foto Siswa"
                >
                  <Camera className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-bold text-sm sm:text-base truncate max-w-[160px] sm:max-w-[260px]">
                  {isEditing ? (editForm.studentName || 'Edit Data Siswa') : student.studentName}
                </h3>
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  {student.regNumber}
                </span>
                {(isEditing ? editForm.jerseyNumber : student.jerseyNumber) && (
                  <span className="inline-flex items-center gap-0.5 font-bold text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    <Shirt className="w-2.5 h-2.5" />
                    #{isEditing ? editForm.jerseyNumber : student.jerseyNumber}
                  </span>
                )}
              </div>
              <p className="text-[10.5px] text-slate-400 truncate">
                Panggilan: <strong className="text-white">{isEditing ? (editForm.nickname || '-') : (student.nickname || '-')}</strong> • {isEditing && editForm.birthDate ? calculateAgeFromBirthDate(editForm.birthDate) : student.age} Tahun
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Edit / Cancel Toggle Button */}
            <button
              type="button"
              onClick={() => {
                if (isEditing) {
                  // Cancel editing and revert form
                  setEditError(null);
                  setIsEditing(false);
                } else {
                  setIsEditing(true);
                }
              }}
              className={`px-2.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 transition-all ${
                isEditing
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-2xs'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-2xs'
              }`}
              title={isEditing ? 'Batal Edit' : 'Edit Data & Foto Siswa'}
            >
              {isEditing ? (
                <>
                  <X className="w-3.5 h-3.5" />
                  <span>Batal</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Data</span>
                </>
              )}
            </button>

            {!isEditing && (
              <>
                <button
                  type="button"
                  id="btn-open-student-card"
                  onClick={() => setIsCardModalOpen(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1 transition-colors shadow-2xs hidden sm:flex"
                  title="Cetak Kartu Siswa ERA Kids"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Kartu</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors hidden sm:block"
                  title="Cetak Berkas"
                >
                  <Printer className="w-3.5 h-3.5" />
                </button>
              </>
            )}

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
              className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>

            {isEditing && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                <Edit3 className="w-3 h-3 text-amber-700" />
                Mode Edit Aktif
              </span>
            )}
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

        {/* Error Notification Banner */}
        {editError && (
          <div className="px-4 py-2.5 bg-rose-50 border-b border-rose-200 text-rose-900 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold flex-1">{editError}</span>
            <button onClick={() => setEditError(null)} className="text-rose-600 font-bold hover:underline text-[11px]">
              Tutup
            </button>
          </div>
        )}

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

        {/* Segmented Navigation Tabs */}
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
            title="Orang Tua & Domisili"
            className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 shrink-0 ${
              activeTab === 'parent'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Orang Tua & Domisili</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            title="Catatan Khusus Siswa & Log Riwayat"
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
          
          {/* ===================================================================== */}
          {/* TAB 1: DATA SISWA (VIEW & EDIT)                                      */}
          {/* ===================================================================== */}
          {activeTab === 'student' && (
            <div className="space-y-3.5">
              
              {/* Photo & Quick Action Card */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center sm:items-start gap-4">
                {/* Photo 3x4 Container with Edit Controls */}
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div className="w-20 h-26 rounded-xl border-2 border-amber-400 overflow-hidden bg-slate-200 shrink-0 shadow-sm flex items-center justify-center relative group">
                    {displayPhoto ? (
                      <img src={displayPhoto} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl">{activeGender === 'L' ? '👦' : '👧'}</span>
                    )}

                    {isProcessingPhoto && (
                      <div className="absolute inset-0 bg-slate-900/70 flex items-center justify-center text-white">
                        <Loader2 className="w-5 h-5 animate-spin" />
                      </div>
                    )}

                    <div className="absolute bottom-0 inset-x-0 bg-slate-900/80 text-[8px] text-amber-300 text-center font-bold py-0.5">
                      PAS FOTO 3 x 4
                    </div>
                  </div>

                  {/* Photo Change Buttons in Edit Mode */}
                  {isEditing && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-[10.5px] font-bold flex items-center gap-1 shadow-2xs"
                        title="Pilih dari Galeri/Komputer"
                      >
                        <Upload className="w-3 h-3 text-indigo-600" />
                        <span>Galeri</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-[10.5px] font-bold flex items-center gap-1 shadow-2xs"
                        title="Ambil Kamera Langsung"
                      >
                        <Camera className="w-3 h-3 text-amber-600" />
                        <span>Kamera</span>
                      </button>
                      {editForm.photoUrl && (
                        <button
                          type="button"
                          onClick={() => setEditForm(prev => ({ ...prev, photoUrl: '' }))}
                          className="p-1 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-lg shadow-2xs"
                          title="Hapus Foto"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Details / Header Info */}
                <div className="flex-1 w-full space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                    <span className="text-[11px] text-slate-500 font-semibold uppercase">No. Registrasi:</span>
                    <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                      {student.regNumber}
                    </span>
                  </div>

                  {/* In View Mode: Brief Summary */}
                  {!isEditing ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Nomor Jersey:</span>
                        <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                          #{student.jerseyNumber || '-'} ({student.gender === 'L' ? 'Laki-laki' : 'Perempuan'})
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Tanggal Terdaftar:</span>
                        <span className="text-slate-700 font-medium">{formatIndonesianDate(student.createdAt)}</span>
                      </div>
                      <div className="pt-1 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => setIsEditing(true)}
                          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Ubah Data Siswa / Ganti Foto</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* In Edit Mode: Quick inputs for Jersey & Gender */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          No. Jersey <span className="text-rose-500">*</span>:
                        </label>
                        <div className="relative">
                          <Shirt className="w-3.5 h-3.5 text-amber-600 absolute left-2.5 top-2.5" />
                          <input
                            type="text"
                            value={editForm.jerseyNumber}
                            onChange={e => setEditForm(prev => ({ ...prev, jerseyNumber: e.target.value }))}
                            placeholder="Contoh: 10, 7"
                            className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Kategori Gender <span className="text-rose-500">*</span>:
                        </label>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditForm(prev => ({ ...prev, gender: 'L' }))}
                            className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-xs border transition-all ${
                              editForm.gender === 'L'
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            👦 Laki-laki
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditForm(prev => ({ ...prev, gender: 'P' }))}
                            className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-xs border transition-all ${
                              editForm.gender === 'P'
                                ? 'bg-pink-600 text-white border-pink-600'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            👧 Perempuan
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* VIEW MODE: Key-Value Table */}
              {!isEditing ? (
                <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-2xs">
                  <div className="p-2.5 flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Nama Lengkap Siswa</span>
                    <span className="font-bold text-slate-900 text-right">{student.studentName}</span>
                  </div>
                  <div className="p-2.5 flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Nama Panggilan</span>
                    <span className="font-semibold text-slate-800">{student.nickname || '-'}</span>
                  </div>
                  <div className="p-2.5 flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Jenis Kelamin & Usia</span>
                    <span className="font-semibold text-slate-800">
                      {student.gender === 'L' ? 'Laki-laki' : 'Perempuan'} • {student.age} Tahun
                    </span>
                  </div>
                  <div className="p-2.5 flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Tempat, Tgl Lahir (TTL)</span>
                    <span className="font-semibold text-slate-800 text-right">
                      {student.birthPlace ? `${student.birthPlace}, ` : ''}{formatBirthDate(student.birthDate)}
                    </span>
                  </div>
                  {(student.height || student.weight) && (
                    <div className="p-2.5 flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Tinggi / Berat Badan</span>
                      <span className="font-semibold text-slate-800">
                        {student.height ? `${student.height} cm` : '-'} / {student.weight ? `${student.weight} kg` : '-'}
                      </span>
                    </div>
                  )}
                  <div className="p-2.5 flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Asal Sekolah</span>
                    <span className="font-semibold text-slate-800 text-right">{student.currentSchool}</span>
                  </div>
                </div>
              ) : (
                /* EDIT MODE: Form Inputs */
                <div className="bg-white p-3.5 rounded-xl border border-indigo-200 space-y-3 shadow-2xs">
                  <h4 className="font-bold text-xs text-indigo-950 flex items-center gap-1.5 border-b border-indigo-100 pb-2">
                    <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                    Formulir Edit Data Pribadi Siswa
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Nama Lengkap Siswa <span className="text-rose-500">*</span>:
                      </label>
                      <input
                        type="text"
                        value={editForm.studentName}
                        onChange={e => setEditForm(prev => ({ ...prev, studentName: e.target.value }))}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Nama Panggilan:
                      </label>
                      <input
                        type="text"
                        value={editForm.nickname}
                        onChange={e => setEditForm(prev => ({ ...prev, nickname: e.target.value }))}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Tempat Lahir:
                      </label>
                      <input
                        type="text"
                        value={editForm.birthPlace}
                        onChange={e => setEditForm(prev => ({ ...prev, birthPlace: e.target.value }))}
                        placeholder="Contoh: BEKASI"
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Tanggal Lahir:
                      </label>
                      <input
                        type="date"
                        value={editForm.birthDate}
                        onChange={e => setEditForm(prev => ({ ...prev, birthDate: e.target.value }))}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      {editForm.birthDate && (
                        <span className="text-[10px] text-slate-500 mt-0.5 block">
                          Usia dihitung: {calculateAgeFromBirthDate(editForm.birthDate)} Tahun
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Tinggi Badan (cm):
                      </label>
                      <input
                        type="number"
                        value={editForm.height}
                        onChange={e => setEditForm(prev => ({ ...prev, height: e.target.value }))}
                        placeholder="135"
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Berat Badan (kg):
                      </label>
                      <input
                        type="number"
                        value={editForm.weight}
                        onChange={e => setEditForm(prev => ({ ...prev, weight: e.target.value }))}
                        placeholder="32"
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Asal Sekolah:
                      </label>
                      <input
                        type="text"
                        value={editForm.currentSchool}
                        onChange={e => setEditForm(prev => ({ ...prev, currentSchool: e.target.value }))}
                        placeholder="SDN Harapan Indah 01"
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===================================================================== */}
          {/* TAB 2: DATA ORANG TUA & DOMISILI                                     */}
          {/* ===================================================================== */}
          {activeTab === 'parent' && (
            <div className="space-y-3.5">
              {!isEditing ? (
                /* VIEW MODE: Parent Info Table */
                <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-2xs">
                  <div className="p-2.5 flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Orang Tua / Wali</span>
                    <span className="font-bold text-slate-900">{student.parentName} ({student.parentRole})</span>
                  </div>
                  <div className="p-2.5 flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Nomor WhatsApp</span>
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
                    <span className="text-slate-500 font-medium">Email</span>
                    <span className="text-slate-700">{student.email || '-'}</span>
                  </div>
                  <div className="p-2.5 flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Kota Domisili</span>
                    <span className="font-semibold text-slate-800">{student.city || '-'}</span>
                  </div>
                  <div className="p-2.5">
                    <span className="text-slate-500 block mb-0.5 font-medium">Alamat Tempat Tinggal:</span>
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
              ) : (
                /* EDIT MODE: Parent Inputs */
                <div className="bg-white p-3.5 rounded-xl border border-indigo-200 space-y-3 shadow-2xs">
                  <h4 className="font-bold text-xs text-indigo-950 flex items-center gap-1.5 border-b border-indigo-100 pb-2">
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                    Formulir Edit Data Orang Tua & Domisili
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Nama Orang Tua / Wali:
                      </label>
                      <input
                        type="text"
                        value={editForm.parentName}
                        onChange={e => setEditForm(prev => ({ ...prev, parentName: e.target.value }))}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Hubungan (Peran):
                      </label>
                      <select
                        value={editForm.parentRole}
                        onChange={e => setEditForm(prev => ({ ...prev, parentRole: e.target.value as any }))}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="Ayah">Ayah</option>
                        <option value="Ibu">Ibu</option>
                        <option value="Wali">Wali</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Nomor WhatsApp:
                      </label>
                      <input
                        type="text"
                        value={editForm.whatsapp}
                        onChange={e => setEditForm(prev => ({ ...prev, whatsapp: e.target.value }))}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Email:
                      </label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Alamat Lengkap:
                      </label>
                      <textarea
                        rows={2}
                        value={editForm.address}
                        onChange={e => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Kelurahan:
                      </label>
                      <input
                        type="text"
                        value={editForm.subdistrict}
                        onChange={e => setEditForm(prev => ({ ...prev, subdistrict: e.target.value }))}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Kecamatan:
                      </label>
                      <input
                        type="text"
                        value={editForm.district}
                        onChange={e => setEditForm(prev => ({ ...prev, district: e.target.value }))}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Kota Domisili:
                      </label>
                      <input
                        type="text"
                        value={editForm.city}
                        onChange={e => setEditForm(prev => ({ ...prev, city: e.target.value }))}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Kelas & Jadwal */}
              <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-2">
                <h4 className="font-bold text-xs text-indigo-950 flex items-center gap-1.5">
                  <EraKidsLogo className="w-4 h-4 shrink-0" />
                  Kelas & Jadwal Latihan Resmi
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 text-[11px] block">Program:</span>
                    <span className="font-bold text-indigo-950">Volleyball Training for Kids</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Jadwal:</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.preferredSchedule}
                        onChange={e => setEditForm(prev => ({ ...prev, preferredSchedule: e.target.value }))}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-medium"
                      />
                    ) : (
                      <span className="font-bold text-slate-900">
                        {student.preferredSchedule || "Rabu & Jum'at (18.45 - 21.00 WIB)"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* TAB 3: CATATAN KHUSUS & RIWAYAT NOTIFIKASI                            */}
          {/* ===================================================================== */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              {/* Catatan Khusus Siswa */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-600" />
                  <span>Catatan Khusus Siswa (Alergi, Riwayat Cedera, Preferensi):</span>
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
                  Catatan Internal Administrasi:
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
                <CheckCircle2 className="w-3.5 h-3.5" /> Perubahan Berhasil Disimpan!
              </span>
            ) : isEditing ? (
              <span className="text-[11px] text-amber-700 font-bold flex items-center gap-1">
                <Edit3 className="w-3.5 h-3.5" /> Jangan lupa simpan setelah mengedit.
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">ID: {student.id.slice(0, 8)}...</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditError(null);
                    setIsEditing(false);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  id="btn-save-student-detail"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all shadow-xs flex items-center gap-1.5"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Simpan Perubahan</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-all shadow-xs flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Data</span>
                </button>
                <button
                  type="button"
                  id="btn-save-student-detail"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all shadow-xs flex items-center gap-1"
                  title="Simpan perubahan status atau catatan"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? 'Menyimpan...' : 'Simpan Status'}
                </button>
              </>
            )}
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
