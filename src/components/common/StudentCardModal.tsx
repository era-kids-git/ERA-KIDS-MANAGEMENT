import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Shirt, 
  Sparkles, 
  ShieldCheck, 
  Loader2,
  Printer
} from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import { StudentRegistration } from '../../types';
import { formatBirthDate } from '../../utils/dateUtils';
import { EraKidsLogo } from './EraKidsLogo';

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
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen || !student) return null;

  const handleDownloadCard = async () => {
    const cardContainer = document.getElementById('printable-student-card');
    if (!cardContainer) return;

    let clone: HTMLElement | null = null;
    try {
      setIsDownloading(true);

      // Preload /logo.png as lossless Base64 to ensure html2canvas paints the full resolution without network/scaling degradation
      let logoDataUrl = '/logo.png';
      try {
        const res = await fetch('/logo.png');
        if (res.ok) {
          const blob = await res.blob();
          logoDataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve('/logo.png');
            reader.readAsDataURL(blob);
          });
        }
      } catch (e) {
        console.warn('Fallback to standard logo URL:', e);
      }

      // Clone container to ensure pristine export layout regardless of screen resolution
      clone = cardContainer.cloneNode(true) as HTMLElement;
      clone.style.position = 'fixed';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.display = 'flex';
      clone.style.flexDirection = 'row';
      clone.style.gap = '20px';
      clone.style.padding = '24px';
      clone.style.background = '#ffffff';
      clone.style.zIndex = '-9999';

      // Replace logo images in clone with high-res base64 dataUrl
      const clonedImgs = Array.from(clone.querySelectorAll('img'));
      clonedImgs.forEach((img) => {
        if (img.src && (img.src.includes('logo.png') || img.alt.includes('Logo'))) {
          img.src = logoDataUrl;
          img.style.imageRendering = '-webkit-optimize-contrast';
        }
      });

      document.body.appendChild(clone);

      // Ensure all images are fully loaded and hardware-decoded before rendering canvas
      await Promise.all(
        clonedImgs.map((img) => {
          return new Promise<void>((resolve) => {
            if (img.complete && img.naturalWidth > 0) {
              if (img.decode) {
                img.decode().then(() => resolve()).catch(() => resolve());
              } else {
                resolve();
              }
            } else {
              img.onload = () => {
                if (img.decode) {
                  img.decode().then(() => resolve()).catch(() => resolve());
                } else {
                  resolve();
                }
              };
              img.onerror = () => resolve();
            }
          });
        })
      );

      // Short buffer to ensure layout and fonts are fully settled
      await new Promise(r => setTimeout(r, 100));

      // Capture at scale 4 for ultra-high-definition 300+ DPI print quality
      const canvas = await html2canvas(clone, {
        scale: 4,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        imageTimeout: 15000,
        scrollX: 0,
        scrollY: 0
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const safeReg = (student.regNumber || 'REG').replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeName = (student.nickname || student.studentName || 'Siswa').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Kartu_Siswa_ERAKids_${safeReg}_${safeName}.png`;

      const link = document.createElement('a');
      link.href = imgData;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Gagal mengunduh kartu siswa:', err);
    } finally {
      if (clone && document.body.contains(clone)) {
        document.body.removeChild(clone);
      }
      setIsDownloading(false);
    }
  };

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
            <EraKidsLogo className="w-8 h-8 shrink-0" />
            <div className="min-w-0">
              <h3 className="font-bold text-xs sm:text-base flex items-center gap-1.5 truncate">
                <span>Kartu Siswa ERA Kids</span>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-1.5 py-0.5 rounded-full font-mono font-bold shrink-0">
                  {student.regNumber}
                </span>
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                ERA Kids • Format Standar Name Tag Landscape
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              id="btn-download-student-card"
              onClick={handleDownloadCard}
              disabled={isDownloading}
              className="px-2.5 sm:px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Unduh Kartu Siswa (PNG)"
            >
              {isDownloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Unduh Kartu</span>
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
            <span>Format Resmi Landscape CR80</span>
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
              <div 
                className="w-[340px] h-[215px] sm:w-[355px] sm:h-[225px] bg-gradient-to-br from-[#0c2340] via-[#0f3460] to-[#16213e] rounded-xl p-3.5 text-white shadow-xl border border-sky-400/40 flex flex-col justify-between relative overflow-hidden shrink-0 print:shadow-none print:border-slate-800"
                style={{ aspectRatio: '85.6 / 54' }}
              >
                {/* Subtle decorative background curves matching logo theme */}
                <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-sky-400/15 blur-xl pointer-events-none" />
                <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-blue-500/15 blur-lg pointer-events-none" />

                {/* Card Header: ERA KIDS */}
                <div className="flex items-center justify-between border-b border-sky-400/25 pb-2 relative z-10">
                  <div className="flex items-center gap-2.5">
                    <EraKidsLogo className="w-9 h-9 sm:w-10 sm:h-10 shrink-0" />
                    <div>
                      <div className="font-black text-sm sm:text-base tracking-wider text-white leading-none font-mono flex items-center gap-1.5">
                        ERA KIDS
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-block text-[8px] font-black px-2 py-0.5 bg-sky-400/20 text-sky-200 border border-sky-300/40 rounded tracking-widest uppercase shadow-2xs">
                      KARTU SISWA
                    </span>
                  </div>
                </div>

                {/* Card Body: Pas Foto 3x4 + Detail Mahasiswa/Siswa */}
                <div className="flex items-center gap-3 py-1 relative z-10 flex-1">
                  {/* Pas Foto 3x4 Proporsional */}
                  <div className="w-[74px] h-[98px] rounded-lg border-2 border-sky-300/80 overflow-hidden bg-slate-900 shrink-0 shadow-md flex items-center justify-center relative">
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
                    <div className="absolute bottom-0 inset-x-0 bg-[#0c2340]/90 py-0.5 text-center text-[7px] font-bold text-sky-200 tracking-wider">
                      PAS FOTO
                    </div>
                  </div>

                  {/* Student Details Data */}
                  <div className="flex-1 min-w-0 text-[10px] space-y-1.5">
                    {/* Nama Panjang */}
                    <div>
                      <span className="text-[7.5px] text-sky-300 uppercase tracking-wider block font-semibold leading-tight">
                        Nama Lengkap:
                      </span>
                      <h4 className="font-extrabold text-[12px] leading-tight text-white truncate drop-shadow-xs" title={student.studentName}>
                        {student.studentName}
                      </h4>
                    </div>

                    {/* TTL */}
                    <div>
                      <span className="text-[7.5px] text-sky-300 uppercase tracking-wider block font-semibold leading-tight">
                        Tempat, Tanggal Lahir (TTL):
                      </span>
                      <p className="text-[9.5px] text-slate-100 font-medium truncate">
                        {ttlFormatted}
                      </p>
                    </div>

                    {/* Jenis Kelamin */}
                    <div>
                      <span className="text-[7.5px] text-sky-300 uppercase tracking-wider block font-semibold leading-tight">
                        Jenis Kelamin:
                      </span>
                      <span className="text-[9.5px] text-white font-medium">
                        {genderLabel}
                      </span>
                    </div>

                    {/* No. Jersey & No. Reg */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-sky-400/25">
                      <div>
                        <span className="text-[7.5px] text-sky-300 uppercase tracking-wider block font-semibold leading-tight">
                          No. Jersey:
                        </span>
                        <span className="inline-flex items-center gap-1 font-black text-[10.5px] text-sky-100 bg-sky-500/25 px-1.5 py-0.2 rounded border border-sky-400/40">
                          <Shirt className="w-2.5 h-2.5 text-sky-300" />
                          {jerseyLabel}
                        </span>
                      </div>
                      <div>
                        <span className="text-[7.5px] text-sky-300 uppercase tracking-wider block font-semibold leading-tight">
                          No. Registrasi:
                        </span>
                        <span className="font-mono font-bold text-[9.5px] text-white bg-blue-950/80 px-1.5 py-0.2 rounded border border-sky-500/40 inline-block">
                          {student.regNumber}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="flex items-center justify-between pt-1.5 border-t border-sky-400/25 text-[8px] text-sky-200/80 relative z-10">
                  <span className="font-mono text-sky-300">Volleyball Training for Kids</span>
                  <span className="text-sky-200 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-2 h-2 text-sky-300" />
                    ERA Kids
                  </span>
                </div>
              </div>
            )}

            {/* ================= SISI BELAKANG KARTU ================= */}
            {(activeSide === 'both' || activeSide === 'back') && (
              <div 
                className="w-[340px] h-[215px] sm:w-[355px] sm:h-[225px] bg-gradient-to-br from-[#0a192f] via-[#0c2340] to-[#0f3460] rounded-xl p-3.5 text-white shadow-xl border border-sky-500/30 flex flex-col justify-between relative overflow-hidden shrink-0 print:shadow-none print:border-slate-800"
                style={{ aspectRatio: '85.6 / 54' }}
              >
                {/* Header Back: Logo ERA Kids di bagian tengah atas belakang kartu */}
                <div className="border-b border-sky-500/30 pb-2 flex flex-col items-center justify-center relative z-10">
                  <div className="flex items-center justify-center gap-2 mb-0.5">
                    <EraKidsLogo className="w-9 h-9 sm:w-10 sm:h-10 shrink-0" />
                    <span className="font-black text-xs sm:text-sm text-white tracking-wider font-mono">
                      ERA KIDS
                    </span>
                  </div>
                </div>

                {/* Rules Content */}
                <div className="text-[8.5px] text-slate-150 space-y-1.5 my-auto leading-relaxed px-1 relative z-10 font-normal">
                  <div className="flex items-start gap-1.5">
                    <span className="font-bold text-sky-300">1.</span>
                    <span>Kartu ini adalah identitas resmi siswa <strong>ERA Kids</strong>.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="font-bold text-sky-300">2.</span>
                    <span>Wajib dibawa pada setiap sesi latihan, uji tanding, dan evaluasi.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="font-bold text-sky-300">3.</span>
                    <span>Kartu ini bersifat pribadi dan tidak dapat dipindahtangankan.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="font-bold text-sky-300">4.</span>
                    <span>Bila kartu hilang atau rusak, segera lapor ke manajemen ERA Kids.</span>
                  </div>
                </div>

                {/* Signature & Identity Footer (Without phone/WA) */}
                <div className="pt-2 border-t border-sky-500/30 flex items-end justify-between text-[8px] text-slate-300 relative z-10">
                  <div>
                    <span className="font-bold text-sky-200 block text-[8px]">SEKRETARIAT ERA KIDS</span>
                    <span className="block font-mono text-[7.5px] text-sky-300 mt-0.5">
                      No. Reg: {student.regNumber} • Jersey: {jerseyLabel}
                    </span>
                  </div>

                  <div className="text-center">
                    <div className="text-[7px] text-slate-300 mb-1">Manajemen Pelatih</div>
                    <div className="font-bold text-[8px] text-white border-t border-sky-400/40 pt-0.5 px-2 font-mono">
                      ERA Kids
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-600 text-[11px] leading-snug">
            <span className="font-bold text-slate-800">Petunjuk:</span> Kartu Siswa resmi <strong className="text-indigo-700 font-semibold">ERA Kids</strong> dapat langsung diunduh ke format gambar beresolusi tinggi atau dicetak ke kartu PVC standar.
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors text-xs flex items-center gap-1.5 cursor-pointer"
              title="Cetak langsung"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors text-xs cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleDownloadCard}
              disabled={isDownloading}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-lg transition-colors text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              {isDownloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Unduh Kartu</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
