import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  UserCheck, 
  SplitSquareVertical, 
  Sparkles, 
  ExternalLink,
  HelpCircle,
  Lock,
  Unlock,
  ShieldCheck,
  Share2,
  ArrowRight,
  Phone,
  LogOut,
  QrCode,
  Award,
  ClipboardCheck
} from 'lucide-react';
import { RealtimeProvider, useRealtime } from './context/RealtimeContext.tsx';
import { ParentPortal } from './components/parent/ParentPortal.tsx';
import { AdminPortal } from './components/admin/AdminPortal.tsx';
import { CoachAttendancePortal } from './components/coach/CoachAttendancePortal.tsx';
import { AdminPinModal } from './components/auth/AdminPinModal.tsx';
import { RoleGuideModal } from './components/common/RoleGuideModal.tsx';
import { ShareParentLinkModal } from './components/admin/ShareParentLinkModal.tsx';
import { EraKidsLogo } from './components/common/EraKidsLogo.tsx';

type AppMode = 'admin' | 'parent' | 'dual' | 'coach';

const AppContent: React.FC = () => {
  // Check if URL has ?portal=parent or ?app=parent or coach
  const [isParentDirectQuery, setIsParentDirectQuery] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const portal = params.get('portal');
      const app = params.get('app');
      return portal === 'parent' || app === 'parent';
    }
    return false;
  });

  // Admin authentication state (active by default for project admin/owner)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('era_kids_admin_auth');
      return stored !== 'false';
    }
    return true;
  });

  // Read initial mode from URL or localStorage (default to 'admin' portal)
  const [appMode, setAppMode] = useState<AppMode>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const portal = params.get('portal');
      const app = params.get('app');
      if (portal === 'parent' || app === 'parent') return 'parent';
      if (portal === 'coach' || app === 'coach') return 'coach';
      if (app === 'admin' || portal === 'admin') return 'admin';
      if (app === 'dual') return 'dual';

      const saved = localStorage.getItem('era_kids_app_mode');
      if (saved === 'parent' || saved === 'admin' || saved === 'dual' || saved === 'coach') return saved as AppMode;
    }
    return 'admin'; // Default directly to Admin Portal as requested
  });

  // Modal states
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pendingTargetMode, setPendingTargetMode] = useState<AppMode | null>(null);
  const [isRoleGuideOpen, setIsRoleGuideOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const { isConnected } = useRealtime();

  const handleRequestModeChange = (mode: AppMode) => {
    if (mode === 'parent' || mode === 'coach') {
      applyModeChange(mode);
      return;
    }

    // Entering admin or dual mode requires Admin PIN check
    if (!isAdminAuthenticated) {
      setPendingTargetMode(mode);
      setIsPinModalOpen(true);
      return;
    }

    applyModeChange(mode);
  };

  const applyModeChange = (mode: AppMode) => {
    setAppMode(mode);
    localStorage.setItem('era_kids_app_mode', mode);

    // Update URL parameter cleanly
    const url = new URL(window.location.href);
    if (mode === 'parent') {
      url.searchParams.set('portal', 'parent');
      url.searchParams.delete('app');
    } else if (mode === 'coach') {
      url.searchParams.set('portal', 'coach');
      url.searchParams.delete('app');
    } else {
      url.searchParams.delete('portal');
      url.searchParams.set('app', mode);
    }
    window.history.replaceState({}, '', url.toString());
  };

  const handlePinSuccess = () => {
    setIsAdminAuthenticated(true);
    if (pendingTargetMode) {
      applyModeChange(pendingTargetMode);
      setPendingTargetMode(null);
    }
  };

  const handleLockAdmin = () => {
    localStorage.removeItem('era_kids_admin_auth');
    setIsAdminAuthenticated(false);
    applyModeChange('parent');
  };

  // Dedicated view flags
  const isDedicatedParentView = appMode === 'parent';
  const isDedicatedCoachView = appMode === 'coach';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800">
      {/* ======================================================== */}
      {/* HEADER CASE 1: DEDICATED COACH ATTENDANCE PORTAL VIEW */}
      {/* ======================================================== */}
      {isDedicatedCoachView ? (
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-2xs">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 h-12 flex items-center justify-between gap-2">
            {/* Simple & Clean ERA Kids Branding */}
            <div className="flex items-center gap-2.5 min-w-0">
              <EraKidsLogo className="w-8 h-8" />
              <span className="font-black text-sm sm:text-base tracking-tight text-slate-900 truncate">
                ERA Kids
              </span>
            </div>

            {/* Right side controls for Coach view */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsRoleGuideOpen(true)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                title="Panduan Akses Peran"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleRequestModeChange('parent')}
                className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors hidden sm:inline-block"
              >
                Portal Ortu
              </button>

              <button
                onClick={() => handleRequestModeChange('admin')}
                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                title="Buka Manajemen Admin ERA Kids"
              >
                <Building2 className="w-3 h-3" />
                <span>Admin</span>
              </button>
            </div>
          </div>
        </header>
      ) : isDedicatedParentView ? (
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-2xs">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 h-12 flex items-center justify-between gap-2">
            {/* Simple & Clean ERA Kids Branding */}
            <div className="flex items-center gap-2.5 min-w-0">
              <EraKidsLogo className="w-8 h-8" />
              <span className="font-black text-sm sm:text-base tracking-tight text-slate-900 truncate">
                ERA Kids
              </span>
            </div>

            {/* Right Side Controls for Parent View */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* WhatsApp Helpdesk Button for Parents */}
              <a
                href="https://wa.me/6281519660119?text=Halo%20Admin%20ERA%20Kids,%20saya%20ingin%20bertanya%20seputar%20pendaftaran%20siswa%20baru"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-colors whitespace-nowrap"
                title="Hubungi Layanan Konselor ERA Kids via WhatsApp"
              >
                <Phone className="w-3 h-3" />
                <span>Bantuan WA</span>
              </a>

              {/* Role Guide Modal Button */}
              <button
                type="button"
                onClick={() => setIsRoleGuideOpen(true)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                title="Panduan Akses & Keamanan Sistem 1 Platform"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>

              {/* Discreet Staff/Admin Access Gate */}
              {isAdminAuthenticated ? (
                <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    onClick={() => handleRequestModeChange('admin')}
                    className="px-2 py-1 text-[11px] font-bold text-indigo-700 hover:bg-white rounded-md transition-colors flex items-center gap-1 whitespace-nowrap"
                  >
                    <Building2 className="w-3 h-3" />
                    <span>Admin</span>
                  </button>
                  <button
                    onClick={() => handleRequestModeChange('dual')}
                    className="px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-white rounded-md transition-colors flex items-center gap-1 whitespace-nowrap"
                  >
                    <SplitSquareVertical className="w-3 h-3" />
                    <span>Uji</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setPendingTargetMode('admin');
                    setIsPinModalOpen(true);
                  }}
                  className="px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-all flex items-center gap-1 whitespace-nowrap"
                  title="Akses Staf Pengurus (Memerlukan PIN Pengurus)"
                >
                  <Lock className="w-3 h-3 text-slate-400" />
                  <span>Staf</span>
                </button>
              )}
            </div>
          </div>
        </header>
      ) : (
        /* ======================================================== */
        /* HEADER CASE 2: ADMIN & DUAL MODE MANAGEMENT VIEW */
        /* ======================================================== */
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
          <div className="max-w-7xl mx-auto px-2.5 sm:px-6 h-13 sm:h-14 flex items-center justify-between gap-1.5 sm:gap-3">
            {/* Simple & Clean ERA Kids Branding */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              <EraKidsLogo className="w-8 h-8" />
              <span className="font-black text-sm sm:text-base tracking-tight text-slate-900 hidden xs:inline">
                ERA Kids
              </span>
            </div>

            {/* Platform Role Switcher - Simple & Clean */}
            <div className="flex items-center bg-slate-100 p-0.5 sm:p-1 rounded-xl border border-slate-200 shadow-2xs overflow-x-auto no-scrollbar">
              {/* App 1: Admin */}
              <button
                id="switch-to-admin"
                onClick={() => handleRequestModeChange('admin')}
                className={`px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 whitespace-nowrap ${
                  appMode === 'admin'
                    ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Admin</span>
                {!isAdminAuthenticated && <Lock className="w-3 h-3 text-slate-400" />}
              </button>

              {/* App 2: Parent Portal */}
              <button
                id="switch-to-parent"
                onClick={() => handleRequestModeChange('parent')}
                className={`px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 whitespace-nowrap ${
                  appMode === 'parent'
                    ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Portal Ortu</span>
              </button>

              {/* App 3: Coach Attendance Portal */}
              <button
                id="switch-to-coach"
                onClick={() => handleRequestModeChange('coach')}
                className={`px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 whitespace-nowrap ${
                  appMode === 'coach'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs ring-1 ring-amber-300'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Portal Presensi Pelatih di Lapangan"
              >
                <Award className="w-3.5 h-3.5 text-amber-700" />
                <span>Presensi</span>
              </button>

              {/* App 4: Dual Mode */}
              <button
                id="switch-to-dual"
                onClick={() => handleRequestModeChange('dual')}
                className={`px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 whitespace-nowrap ${
                  appMode === 'dual'
                    ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tampilan Bersanding (Uji Sinkronisasi Real-Time Otomatis)"
              >
                <SplitSquareVertical className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mode Uji</span>
              </button>
            </div>

            {/* Admin Right Actions: Share Link, Role Guide, Lock Admin */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Share Parent Link button */}
              <button
                type="button"
                id="header-btn-share-parent"
                onClick={() => setIsShareModalOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
                title="Salin Link & QR Code Khusus Orang Tua"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Link Ortu</span>
              </button>

              {/* Help & Architecture Guide */}
              <button
                type="button"
                onClick={() => setIsRoleGuideOpen(true)}
                className="p-1.5 sm:p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                title="Panduan Akses Peran Orang Tua & Admin"
              >
                <HelpCircle className="w-4 h-4" />
              </button>

              {/* Lock Admin Session */}
              {isAdminAuthenticated && (
                <button
                  type="button"
                  onClick={handleLockAdmin}
                  className="px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors flex items-center gap-1"
                  title="Kunci Panel Admin (Logout)"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">Kunci</span>
                </button>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Main Container based on selected Mode */}
      <main className="flex-1 flex flex-col">
        {/* MODE 1: ERA KIDS MANAGEMENT (ADMIN PUSAT) */}
        {appMode === 'admin' && (
          <div className="flex-1 py-1.5 sm:py-4 px-0 sm:px-3 w-full max-w-full overflow-x-hidden">
            <AdminPortal />
          </div>
        )}

        {/* MODE 2: PORTAL PENDAFTARAN MANDIRI ORANG TUA */}
        {appMode === 'parent' && (
          <div className="flex-1 py-1 sm:py-4 px-0 sm:px-3 w-full max-w-full overflow-x-hidden">
            <ParentPortal />
          </div>
        )}

        {/* MODE 3: PORTAL PRESENSI PELATIH (COACH ATTENDANCE) */}
        {appMode === 'coach' && (
          <div className="flex-1 py-1 sm:py-4 px-0 sm:px-3 w-full max-w-full overflow-x-hidden">
            <CoachAttendancePortal onOpenAdmin={() => handleRequestModeChange('admin')} />
          </div>
        )}

        {/* MODE 4: ⚡ DUAL SCREEN REAL-TIME SYNC DEMO (SIDE-BY-SIDE) */}
        {appMode === 'dual' && (
          <div className="flex-1 flex flex-col">
            {/* Top Interactive Banner for Dual Mode */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-4 py-2.5 border-b border-indigo-500/20">
              <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    Demo Sinkronisasi Otomatis Real-Time
                  </span>
                  <span className="text-slate-300 hidden sm:inline">
                    Isi formulir di sisi <strong>Kiri</strong> & amati data langsung masuk di sisi <strong>Kanan</strong> tanpa refresh!
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsShareModalOpen(true)}
                    className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-indigo-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <QrCode className="w-3 h-3 text-indigo-300" />
                    <span>Dapatkan Link Khusus Orang Tua</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Split screen layout: Left = Parent Portal, Right = Admin Management */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
              {/* Left Pane: Parent Self-Registration Portal */}
              <div className="lg:col-span-5 bg-slate-50/50 p-2 sm:p-4 overflow-y-auto max-h-none lg:max-h-[calc(100vh-105px)]">
                <div className="mb-3 px-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Portal Mandiri Orang Tua (Siswa Baru)
                    </span>
                  </div>
                  <button
                    onClick={() => handleRequestModeChange('parent')}
                    className="text-xs text-indigo-600 hover:underline font-semibold flex items-center gap-1"
                  >
                    Layar Penuh <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <ParentPortal />
              </div>

              {/* Right Pane: ERA Kids Management (Admin Pusat) */}
              <div className="lg:col-span-7 bg-white p-2 sm:p-4 overflow-y-auto max-h-none lg:max-h-[calc(100vh-105px)]">
                <div className="mb-3 px-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      ERA Kids Management (Pusat Pembelajaran)
                    </span>
                  </div>
                  <button
                    onClick={() => handleRequestModeChange('admin')}
                    className="text-xs text-indigo-600 hover:underline font-semibold flex items-center gap-1"
                  >
                    Layar Penuh <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <AdminPortal />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ADMIN PIN AUTHENTICATION MODAL */}
      <AdminPinModal
        isOpen={isPinModalOpen}
        onClose={() => {
          setIsPinModalOpen(false);
          setPendingTargetMode(null);
        }}
        onSuccess={handlePinSuccess}
      />

      {/* ROLE ACCESS & SYSTEM EXPLANATION MODAL */}
      <RoleGuideModal
        isOpen={isRoleGuideOpen}
        onClose={() => setIsRoleGuideOpen(false)}
        onSelectRole={role => handleRequestModeChange(role)}
        onOpenShareModal={() => setIsShareModalOpen(true)}
      />

      {/* SHARE PARENT LINK & QR MODAL */}
      <ShareParentLinkModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <RealtimeProvider>
      <AppContent />
    </RealtimeProvider>
  );
}
