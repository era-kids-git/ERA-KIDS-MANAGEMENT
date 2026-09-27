import React from 'react';
import { 
  X, 
  UserCheck, 
  Building2, 
  ShieldCheck, 
  QrCode, 
  Link, 
  Lock, 
  ArrowRight,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { EraKidsLogo } from './EraKidsLogo.tsx';

interface RoleGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRole: (role: 'parent' | 'admin' | 'dual' | 'coach') => void;
  onOpenShareModal: () => void;
}

export const RoleGuideModal: React.FC<RoleGuideModalProps> = ({
  isOpen,
  onClose,
  onSelectRole,
  onOpenShareModal
}) => {
  if (!isOpen) return null;

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const parentUrl = `${baseUrl}?portal=parent`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto overflow-x-hidden">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-full sm:max-w-2xl shadow-2xl border-0 sm:border border-slate-200 overflow-hidden my-0 sm:my-6 max-h-[96vh] sm:max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base truncate">Panduan Akses Peran di 1 Platform</h3>
              <p className="text-[11px] sm:text-xs text-slate-300 truncate">Bagaimana Orang Tua & Staf Masuk ke Portal Masing-Masing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 text-slate-800 text-xs sm:text-sm overflow-y-auto overflow-x-hidden flex-1">
          <p className="text-slate-600 leading-relaxed">
            Meskipun sistem berada di <strong>1 platform web yang sama</strong>, sistem ERA Kids telah dilengkapi dengan <strong>isolasi peran otomatis</strong> dan <strong>kunci proteksi data</strong> agar orang tua atlet/siswa tidak dapat membuka data rahasia admin:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Orang Tua */}
            <div className="p-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-xl bg-emerald-600 text-white font-bold">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">1. Portal Khusus Orang Tua</h4>
                    <span className="text-[11px] text-emerald-700 font-semibold">Tautan Langsung / Scan QR</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  Orang tua cukup diberikan tautan langsung dengan akhiran <code className="bg-white px-1.5 py-0.5 rounded border font-mono text-emerald-800 font-bold">?portal=parent</code> atau memindai QR Code di meja resepsionis.
                </p>

                <ul className="text-xs text-slate-700 space-y-1.5 mb-4">
                  <li className="flex items-center gap-1.5">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Tampilan bersih hanya pendaftaran & pantau status ananda</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Tombol admin disembunyikan sepenuhnya</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Data pendaftar lain tidak dapat diakses</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => {
                  onSelectRole('parent');
                  onClose();
                }}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1 shadow-xs"
              >
                Masuk Tampilan Orang Tua Saja
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Card 2: Admin Pusat */}
            <div className="p-4 rounded-2xl border-2 border-indigo-200 bg-indigo-50/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-xl bg-indigo-600 text-white font-bold">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">2. ERA Kids Management</h4>
                    <span className="text-[11px] text-indigo-700 font-semibold">Khusus Staf (Dilindungi PIN)</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  Untuk mengelola penerimaan, menjadwalkan <em>free trial</em>, dan mengirim notifikasi WhatsApp resmi.
                </p>

                <ul className="text-xs text-slate-700 space-y-1.5 mb-4">
                  <li className="flex items-center gap-1.5">
                    <span className="text-indigo-600 font-bold">🔒</span>
                    <span><strong>Dilindungi PIN Keamanan:</strong> Default PIN <code className="font-mono bg-white px-1 rounded font-bold text-indigo-900">1234</code></span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-indigo-600 font-bold">✓</span>
                    <span>Dapat mengunci akses kapan saja saat meninggalkan laptop</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-indigo-600 font-bold">✓</span>
                    <span>Fitur generator QR Code & Tautan Orang Tua</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => {
                  onSelectRole('admin');
                  onClose();
                }}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1 shadow-xs"
              >
                Masuk Akses Staf / Admin
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Portal Presensi Pelatih Callout */}
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <EraKidsLogo className="w-5 h-5 shrink-0" />
                <h5 className="font-bold text-xs text-amber-950">Portal Presensi Latihan Pelatih</h5>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-200 text-amber-900">Baru</span>
              </div>
              <p className="text-xs text-amber-800 mt-1">
                Portal khusus pelatih di lapangan untuk input kehadiran cepat setiap sesi latihan (<code className="font-mono text-[11px] bg-amber-100 px-1 rounded">?portal=coach</code>).
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onSelectRole('coach');
                onClose();
              }}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl transition-all shadow-2xs whitespace-nowrap flex items-center gap-1.5"
            >
              Buka Portal Pelatih
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick share callout */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h5 className="font-bold text-xs text-slate-900">Ingin membagikan link ke Orang Tua sekarang?</h5>
              <p className="text-xs text-slate-500">
                Buka modal Bagikan Link untuk mendapatkan QR Code cetak dan format WhatsApp siaran.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenShareModal();
              }}
              className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl transition-all shadow-2xs whitespace-nowrap flex items-center gap-1.5"
            >
              <QrCode className="w-3.5 h-3.5 text-indigo-600" />
              Buka QR & Link Khusus
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Mengerti, Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
