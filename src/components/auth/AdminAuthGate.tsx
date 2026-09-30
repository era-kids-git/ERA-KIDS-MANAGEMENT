import React, { useState } from 'react';
import { Lock, KeyRound, ShieldCheck, AlertCircle, ArrowRight, UserCheck } from 'lucide-react';
import { EraKidsLogo } from '../common/EraKidsLogo.tsx';

interface AdminAuthGateProps {
  onSuccess: () => void;
  onOpenParentPortal: () => void;
}

export const ADMIN_DEFAULT_PIN = '191919';

export const AdminAuthGate: React.FC<AdminAuthGateProps> = ({
  onSuccess,
  onOpenParentPortal
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    // Verification check for Admin PIN
    if (pin === ADMIN_DEFAULT_PIN) {
      sessionStorage.setItem('era_kids_admin_auth', 'true');
      setIsSubmitting(false);
      onSuccess();
    } else {
      setIsSubmitting(false);
      setError('PIN Pengurus salah. Masukkan kode otorisasi resmi ERA Kids.');
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 bg-slate-950 overflow-hidden select-none">
      {/* Background Graphic: Big Watermark ERA Kids Logo centered in background */}
      <div 
        className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        <div className="relative flex items-center justify-center">
          <EraKidsLogo className="w-[340px] h-[340px] sm:w-[580px] sm:h-[580px] object-contain opacity-25 filter drop-shadow-[0_0_40px_rgba(99,102,241,0.25)] transition-all" />
        </div>
      </div>

      {/* Decorative ambient gradient backdrop */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Card Auth Container */}
      <div className="relative z-10 w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-white">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 p-3 shadow-inner flex items-center justify-center mb-3">
            <EraKidsLogo className="w-full h-full object-contain" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            ERA KIDS MANAGEMENT
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Sistem Informasi & Manajemen Data Siswa Terpadu
          </p>
        </div>

        {/* Security badge */}
        <div className="mb-5 bg-indigo-950/60 border border-indigo-800/60 rounded-2xl p-3.5 flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 shrink-0 mt-0.5">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-indigo-200">Akses Terproteksi PIN Pengurus</h2>
            <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
              Silakan masukkan PIN otorisasi staf untuk membuka rekapitulasi data siswa dan administrasi klub.
            </p>
          </div>
        </div>

        {/* PIN Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              PIN Staf / Admin
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
              <input
                type="password"
                maxLength={8}
                autoFocus
                value={pin}
                onChange={e => {
                  setPin(e.target.value);
                  if (error) setError('');
                }}
                placeholder="••••••"
                className="w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-700 rounded-2xl text-center text-lg font-mono tracking-[0.35em] text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
            </div>
            {error && (
              <p className="text-xs text-rose-400 mt-2 flex items-center justify-center gap-1.5 font-medium animate-shake">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !pin.trim()}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-40 text-white font-bold text-sm rounded-2xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            <span>{isSubmitting ? 'Memverifikasi...' : 'Buka Panel Manajemen'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Footer Link to Parent Registration */}
        <div className="mt-6 pt-5 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-400 mb-2">Bukan staf / Ingin mendaftar latihan?</p>
          <button
            type="button"
            onClick={onOpenParentPortal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-emerald-400 hover:text-emerald-300 text-xs font-bold transition-colors border border-emerald-500/20"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Menuju Formulir Pendaftaran Siswa (Ortu)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
