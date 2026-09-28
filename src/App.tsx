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

type AppMode = 'admin' | 'parent' | 'coach';

const AppContent: React.FC = () => {
  // Check if URL has ?portal=parent, ?app=parent, ?mode=register, ?portal=coach, ?mode=attendance
  const [initialParams] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const portal = params.get('portal');
      const app = params.get('app');
      const mode = params.get('mode');
      const isParent = portal === 'parent' || app === 'parent' || mode === 'register';
      const isCoach = portal === 'coach' || app === 'coach' || mode === 'attendance';
      return { isParent, isCoach, portal, app, mode };
    }
    return { isParent: false, isCoach: false, portal: null, app: null, mode: null };
  });

  // Admin authentication state:
  // If user opens as parent link (?portal=parent or ?mode=register), force non-authenticated parent state!
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const portal = params.get('portal');
      const app = params.get('app');
      const mode = params.get('mode');
      if (portal === 'parent' || app === 'parent' || mode === 'register') {
        return false;
      }
      const stored = localStorage.getItem('era_kids_admin_auth');
      return stored === 'true';
    }
    return false;
  });

  // Read initial mode from URL or localStorage
  const [appMode, setAppMode] = useState<AppMode>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const portal = params.get('portal');
      const app = params.get('app');
      const mode = params.get('mode');
      if (portal === 'parent' || app === 'parent' || mode === 'register') return 'parent';
      if (portal === 'coach' || app === 'coach' || mode === 'attendance') return 'coach';
      if (app === 'admin' || portal === 'admin') return 'admin';

      const saved = localStorage.getItem('era_kids_app_mode');
      if (saved === 'parent' || saved === 'admin' || saved === 'coach') return saved as AppMode;
    }
    return 'admin';
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

    // Entering admin mode strictly requires Admin PIN authentication
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
      url.searchParams.delete('mode');
    } else if (mode === 'coach') {
      url.searchParams.set('portal', 'coach');
      url.searchParams.delete('app');
      url.searchParams.delete('mode');
    } else {
      url.searchParams.delete('portal');
      url.searchParams.delete('mode');
      url.searchParams.set('app', 'admin');
    }
    window.history.replaceState({}, '', url.toString());
  };

  const handlePinSuccess = () => {
    setIsAdminAuthenticated(true);
    if (pendingTargetMode) {
      applyModeChange(pendingTargetMode);
      setPendingTargetMode(null);
    } else {
      applyModeChange('admin');
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
                onClick={() => handleRequestModeChange('admin')}
                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                title="Buka Manajemen Admin ERA Kids (Memerlukan PIN)"
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
            {/* Simple & Clean ERA Kids Branding - Exclusive Parent Portal */}
            <div className="flex items-center gap-2.5 min-w-0">
              <EraKidsLogo className="w-8 h-8" />
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-black text-sm sm:text-base tracking-tight text-slate-900 truncate">
                  ERA Kids
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 hidden sm:inline">
                  Portal Orang Tua
                </span>
              </div>
            </div>

            {/* Right Side Controls for Parent View: Only WhatsApp help desk & discreet staff login if unlocked */}
            <div className="flex items-center gap-2 shrink-0">
              {/* WhatsApp Helpdesk Button for Parents */}
              <a
                href="https://wa.me/6281519660119?text=Halo%20Admin%20ERA%20Kids,%20saya%20ingin%20bertanya%20seputar%20pendaftaran%20siswa%20baru"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
                title="Hubungi Layanan Konselor ERA Kids via WhatsApp"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Bantuan WA</span>
              </a>

              {/* Discreet Staff/Admin Access Gate - Locked by default */}
              {isAdminAuthenticated ? (
                <button
                  onClick={() => handleRequestModeChange('admin')}
                  className="px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-50 border border-indigo-200 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap"
                  title="Panel Admin"
                >
                  <Building2 className="w-3 h-3" />
                  <span>Admin</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setPendingTargetMode('admin');
                    setIsPinModalOpen(true);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  title="Akses Staf Pengurus (Memerlukan PIN Pengurus)"
                >
                  <Lock className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </header>
      ) : (
        /* ======================================================== */
        /* HEADER CASE 2: ADMIN MANAGEMENT VIEW */
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

            {/* Platform Role Switcher - Admin & Coach & Parent Link */}
            <div className="flex items-center bg-slate-100 p-0.5 sm:p-1 rounded-xl border border-slate-200 shadow-2xs overflow-x-auto no-scrollbar">
              {/* App 1: Admin */}
              <button
                id="switch-to-admin"
                onClick={() => handleRequestModeChange('admin')}
                className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 whitespace-nowrap ${
                  appMode === 'admin'
                    ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Admin Pusat</span>
                {!isAdminAuthenticated && <Lock className="w-3 h-3 text-slate-400" />}
              </button>

              {/* App 2: Coach Attendance Portal */}
              <button
                id="switch-to-coach"
                onClick={() => handleRequestModeChange('coach')}
                className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 whitespace-nowrap ${
                  appMode === 'coach'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs ring-1 ring-amber-300'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Portal Presensi Pelatih di Lapangan"
              >
                <Award className="w-3.5 h-3.5 text-amber-700" />
                <span>Presensi Latihan</span>
              </button>

              {/* App 3: Parent Portal View */}
              <button
                id="switch-to-parent"
                onClick={() => handleRequestModeChange('parent')}
                className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 whitespace-nowrap ${
                  appMode === 'parent'
                    ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Pratinjau Ortu</span>
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
                <span className="hidden lg:inline">Link Pendaftaran Ortu</span>
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
