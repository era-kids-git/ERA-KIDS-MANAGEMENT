import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Shirt, 
  Sparkles, 
  ShieldCheck, 
  Calendar, 
  User, 
  CreditCard,
  Hash
} from 'lucide-react';
import { StudentRegistration } from '../../types';
import { formatBirthDate } from '../../utils/dateUtils';

interface StudentCardModalProps {
  student: StudentRegistration | null;
  isOpen: boolean;
  onClose: () => void;
}

export const StudentCardModal: React.FC<StudentCardModalProps> = ({
  student,
  isOpen,
  onClose
}) => {
  const [activeSide, setActiveSide] = useState<'both' | 'front' | 'back'>('both');

  if (!isOpen || !student) return null;

  const handlePrint = () => {
    window.print();
  };

  const ttlFormatted = `${student.birthPlace ? student.birthPlace + ', ' : ''}${formatBirthDate(student.birthDate)}`;
  const genderLabel = student.gender === 'L' ? 'Laki-laki' : 'Perempuan';
  const jerseyLabel = student.jerseyNumber ? `#${student.jerseyNumber}` : '-';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto overflow-x-hidden">
      {/* Container */}
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border-0 sm:border border-slate-200 w-full min-w-full sm:min-w-0 sm:max-w-3xl overflow-hidden my-0 sm:my-auto max-h-[96vh] sm:max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header Modal */}
        <div className="bg-slate-900 text-white px-3.5 sm:px-5 py-3 sm:py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
              <span className="text-base">🏐</span>
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-xs sm:text-base flex items-center gap-1.5 truncate">
                <span>Kartu Siswa ERA Kids</span>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-1.5 py-0.5 rounded-full font-mono font-bold shrink-0">
                  {student.regNumber}
                </span>
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                ERA Kids • Format Standar
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              id="btn-print-student-card"
              onClick={handlePrint}
              className="px-2.5 sm:px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              title="Cetak Kartu Siswa"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cetak Kartu</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Toggle Bar */}
        <div className="px-3 sm:px-5 py-2 sm:py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
            <span className="text-slate-500 text-[10.5px] font-semibold shrink-0">Tampilan:</span>
            <div className="bg-slate-200/80 p-0.5 rounded-lg flex text-[10.5px] font-bold shrink-0">
              <button
                type="button"
                onClick={() => setActiveSide('both')}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md transition-all ${
                  activeSide === 'both' ? 'bg-white text-indigo-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Depan & Belakang
              </button>
              <button
                type="button"
                onClick={() => setActiveSide('front')}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md transition-all ${
                  activeSide === 'front' ? 'bg-white text-indigo-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sisi Depan
              </button>
              <button
                type="button"
                onClick={() => setActiveSide('back')}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md transition-all ${
                  activeSide === 'back' ? 'bg-white text-indigo-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sisi Belakang
              </button>
            </div>
          </div>

          <div className="text-[10px] sm:text-[11px] text-slate-500 flex items-center gap-1.5 hidden sm:flex">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Format Resmi Tanpa Barcode</span>
          </div>
        </div>

        {/* Printable Card Area */}
        <div className="p-2 sm:p-6 bg-slate-100/70 overflow-x-hidden overflow-y-auto flex flex-col items-center justify-center flex-1">
          <div 
            id="printable-student-card"
            className="flex flex-col md:flex-row gap-3 sm:gap-6 items-center justify-center w-full max-w-2xl print:m-0 print:p-0 print:w-full print:gap-4"
          >
            {/* ================= SISI DEPAN KARTU ================= */}
            {(activeSide === 'both' || activeSide === 'front') && (
              <div className="w-full max-w-[305px] sm:max-w-[340px] min-h-[210px] sm:min-h-[220px] bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 rounded-xl p-3 sm:p-4 text-white shadow-xl border border-indigo-400/30 flex flex-col justify-between relative overflow-hidden shrink-0 print:shadow-none print:border-slate-800">
                {/* Decorative background curves */}
                <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-indigo-500/15 blur-xl pointer-events-none" />
                <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-amber-500/10 blur-lg pointer-events-none" />

                {/* Card Header: ERA Kids */}
                <div className="flex items-center justify-between border-b border-indigo-500/30 pb-2 relative z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-400 to-amber-500 p-0.5 flex items-center justify-center shadow-xs">
                      <span className="text-base leading-none">🏐</span>
                    </div>
                    <div>
                      <div className="font-black text-sm tracking-wider text-white leading-none flex items-center gap-1.5">
                        ERA KIDS
                      </div>
                      <div className="text-[9px] font-semibold text-amber-300 tracking-wide mt-0.5">
                        Volleyball Training for Kids
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-block text-[8px] font-black px-2 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-400/40 rounded tracking-widest uppercase">
                      KARTU SISWA
                    </span>
                  </div>
                </div>

                {/* Card Body: Pas Foto + Detail (Nama Panjang, TTL, Umur, JK, No. Jersey, No. Reg) */}
                <div className="flex items-center gap-3.5 py-1.5 relative z-10 flex-1">
                  {/* Pas Foto 3x4 */}
                  <div className="w-[76px] h-[100px] rounded-lg border-2 border-amber-400/80 overflow-hidden bg-slate-800 shrink-0 shadow-md flex items-center justify-center relative">
                    {student.photoUrl ? (
                      <img 
                        src={student.photoUrl} 
                        alt={student.studentName} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-1">
                        <span className="text-2xl block mb-0.5">
                          {student.gender === 'L' ? '👦' : '👧'}
                        </span>
                        <span className="text-[8px] text-slate-400 leading-tight block">
                          3 x 4
                        </span>
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-slate-950/85 py-0.5 text-center text-[7px] font-bold text-amber-300 tracking-wider">
                      PAS FOTO
                    </div>
                  </div>

                  {/* Student Details Data */}
                  <div className="flex-1 min-w-0 text-[10px] space-y-1">
                    {/* Nama Panjang */}
                    <div>
                      <span className="text-[7.5px] text-indigo-300 uppercase tracking-wider block font-semibold">
                        Nama Lengkap:
                      </span>
                      <h4 className="font-extrabold text-[12px] leading-tight text-white truncate drop-shadow-xs" title={student.studentName}>
                        {student.studentName}
                      </h4>
                    </div>

                    {/* TTL */}
                    <div>
                      <span className="text-[7.5px] text-indigo-300 uppercase tracking-wider block font-semibold">
                        Tempat, Tanggal Lahir (TTL):
                      </span>
                      <p className="text-[10px] text-slate-200 font-medium truncate">
                        {ttlFormatted}
                      </p>
                    </div>

                    {/* Umur & Jenis Kelamin */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <span className="text-[7.5px] text-indigo-300 uppercase tracking-wider block font-semibold">
                          Umur:
                        </span>
                        <span className="text-[10px] text-white font-bold">
                          {student.age} Tahun
                        </span>
                      </div>
                      <div>
                        <span className="text-[7.5px] text-indigo-300 uppercase tracking-wider block font-semibold">
                          Jenis Kelamin:
                        </span>
                        <span className="text-[10px] text-white font-medium">
                          {genderLabel}
                        </span>
                      </div>
                    </div>

                    {/* No. Jersey & No. Reg */}
                    <div className="grid grid-cols-2 gap-1.5 pt-0.5 border-t border-indigo-500/20">
                      <div>
                        <span className="text-[7.5px] text-amber-300 uppercase tracking-wider block font-semibold">
                          No. Jersey:
                        </span>
                        <span className="inline-flex items-center gap-1 font-black text-[11px] text-amber-300 bg-amber-400/15 px-1.5 py-0.2 rounded border border-amber-400/30">
                          <Shirt className="w-2.5 h-2.5 text-amber-400" />
                          {jerseyLabel}
                        </span>
                      </div>
                      <div>
                        <span className="text-[7.5px] text-indigo-300 uppercase tracking-wider block font-semibold">
                          No. Registrasi:
                        </span>
                        <span className="font-mono font-bold text-[10px] text-white bg-slate-800/80 px-1.5 py-0.2 rounded border border-slate-700 inline-block">
                          {student.regNumber}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="flex items-center justify-between pt-1.5 border-t border-indigo-500/20 text-[8px] text-slate-400 relative z-10">
                  <span className="font-mono text-indigo-200">Volleyball Training for Kids</span>
                  <span className="text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-2 h-2 text-amber-400" />
                    ERA Kids
                  </span>
                </div>
              </div>
            )}

            {/* ================= SISI BELAKANG KARTU ================= */}
            {(activeSide === 'both' || activeSide === 'back') && (
              <div className="w-full max-w-[305px] sm:max-w-[340px] min-h-[210px] sm:min-h-[220px] bg-slate-900 rounded-xl p-3 sm:p-4 text-white shadow-xl border border-slate-700 flex flex-col justify-between relative overflow-hidden shrink-0 print:shadow-none print:border-slate-800">
                {/* Header Back */}
                <div className="border-b border-slate-700 pb-1.5 text-center">
                  <div className="font-black text-[11px] text-white tracking-wide">
                    ERA KIDS
                  </div>
                  <div className="font-bold text-[9px] text-amber-400 tracking-wide uppercase">
                    Volleyball Training for Kids
                  </div>
                  <p className="text-[7.5px] text-slate-400 mt-0.5">
                    Ketentuan & Tata Tertib Siswa Resmi
                  </p>
                </div>

                {/* Rules Content */}
                <div className="text-[8px] text-slate-300 space-y-1.5 my-1 leading-relaxed px-1">
                  <div className="flex items-start gap-1.5">
                    <span className="font-bold text-amber-400">1.</span>
                    <span>Kartu ini adalah identitas resmi siswa <strong>ERA Kids</strong>.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="font-bold text-amber-400">2.</span>
                    <span>Wajib dibawa pada setiap sesi latihan, uji tanding, dan evaluasi berkala.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="font-bold text-amber-400">3.</span>
                    <span>Kartu ini bersifat pribadi dan tidak dapat dipindahtangankan.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="font-bold text-amber-400">4.</span>
                    <span>Bila kartu hilang atau rusak, harap segera hubungi sekretariat pusat ERA Kids.</span>
                  </div>
                </div>

                {/* Contact & Signature Footer */}
                <div className="pt-2 border-t border-slate-700 flex items-end justify-between text-[8px] text-slate-400">
                  <div>
                    <span className="font-bold text-slate-200 block text-[8px]">SEKRETARIAT ERA KIDS:</span>
                    <span>WhatsApp: +62 812-8765-4321</span>
                    <span className="block font-mono text-[7px] text-indigo-400 mt-0.5">
                      No. Reg: {student.regNumber} • Jersey: {jerseyLabel}
                    </span>
                  </div>

                  <div className="text-center">
                    <div className="text-[7px] text-slate-400 mb-1.5">Manajemen Pelatih</div>
                    <div className="font-bold text-[8px] text-white border-t border-slate-600 pt-0.5 px-2">
                      ERA Kids
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Print instructions & Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-600 text-[11px] leading-snug">
            <span className="font-bold text-slate-800">Petunjuk Cetak:</span> Kartu Siswa resmi <strong className="text-indigo-700 font-semibold">ERA Kids</strong> siap dicetak ke ukuran standar PVC CR80 atau kertas foto tebal tanpa barcode.
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors text-xs"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors text-xs flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak Kartu Siswa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
