import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Database, 
  FileJson, 
  FileSpreadsheet, 
  CheckCircle2, 
  Copy, 
  Upload, 
  Link2, 
  CalendarCheck2, 
  Camera, 
  Sparkles, 
  AlertCircle,
  Clock,
  ShieldCheck,
  Smartphone,
  ExternalLink,
  Loader2,
  Printer,
  Files,
  Trash2,
  Layers,
  ShieldAlert,
  HelpCircle,
  FileCode,
  UserCheck
} from 'lucide-react';
import { StudentRegistration } from '../../types.ts';
import { EraKidsLogo } from '../common/EraKidsLogo.tsx';
import { useRealtime } from '../../context/RealtimeContext.tsx';
import { exportStudentsToExcel } from '../../utils/excelExport.ts';
import { formatBirthDate } from '../../utils/dateUtils.ts';
import { downloadStudentsDataHtmlFile } from '../../utils/studentHtmlExport.ts';
import { 
  parseMultipleJsonFiles, 
  mergeAndDeduplicateStudents, 
  FileParseSummary, 
  MergeDeduplicateResult 
} from '../../utils/backupMerge.ts';
import { batchRestoreRegistrationsToFirestore } from '../../lib/firestoreService.ts';

interface DatabaseBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'download' | 'restore' | 'attendance' | 'api';
}

export const DatabaseBackupModal: React.FC<DatabaseBackupModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'download'
}) => {
  const { registrations, fetchRegistrations } = useRealtime();
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'download' | 'restore' | 'attendance' | 'api'>(initialTab);

  React.useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isExportingStudentsExcel, setIsExportingStudentsExcel] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filter state for HTML student export
  const [htmlFilterStatus, setHtmlFilterStatus] = useState<string>('ALL');
  const [htmlFilterGender, setHtmlFilterGender] = useState<string>('ALL');

  // State untuk restore multi-file .json & anti-duplikasi
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [parseSummaries, setParseSummaries] = useState<FileParseSummary[]>([]);
  const [stagingRawStudents, setStagingRawStudents] = useState<StudentRegistration[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [restoreMode, setRestoreMode] = useState<'merge_with_current' | 'replace_current'>('merge_with_current');
  const [isDragOver, setIsDragOver] = useState(false);

  if (!isOpen) return null;

  const totalStudents = registrations.length;
  const studentsWithPhoto = registrations.filter(r => Boolean(r.photoUrl && r.photoUrl.length > 50)).length;
  const acceptedStudents = registrations.filter(r => r.status === 'Diterima').length;

  const currentHost = typeof window !== 'undefined' ? window.location.origin : '';
  const liveRosterApiUrl = `${currentHost}/api/attendance/roster`;
  const liveBackupApiUrl = `${currentHost}/api/database/backup`;

  // 1. Export Full Database as JSON (Includes Base64 Photos)
  const downloadFullDatabaseJson = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupData = {
      metadata: {
        application: 'ERA Kids Management System',
        academy: 'ERA Kids',
        program: 'Volleyball Training for Kids',
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        totalRecords: registrations.length,
        withPhotosCount: studentsWithPhoto,
        hasPhotosIncluded: true,
        schema: 'era_kids_full_database_backup'
      },
      summary: {
        total: registrations.length,
        diterima: acceptedStudents,
        register: registrations.filter(r => r.status === 'Register').length,
        batal: registrations.filter(r => r.status === 'Pembatalan Keanggotaan').length
      },
      students: registrations
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ERA_Kids_Database_Backup_Lengkap_${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 2. Export Dedicated Attendance Roster JSON (Targeted for Attendance App)
  const downloadAttendanceRosterJson = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const rosterData = {
      academy: 'ERA Kids',
      program: 'Volleyball Training for Kids',
      defaultSchedule: "Rabu & Jum'at (18.45 - 21.00 WIB)",
      exportDate: new Date().toISOString(),
      totalActiveStudents: acceptedStudents > 0 ? acceptedStudents : totalStudents,
      integrationProtocol: {
        targetApp: 'Aplikasi Daftar Kehadiran Latihan Siswa',
        matchIdentifier: 'regNumber',
        alternateIdentifier: 'jerseyNumber',
        attendanceStatuses: ['Hadir', 'Izin', 'Tidak Hadir']
      },
      roster: registrations.map(student => ({
        studentId: student.id,
        regNumber: student.regNumber,
        jerseyNumber: student.jerseyNumber || '',
        studentName: student.studentName,
        nickname: student.nickname || '',
        gender: student.gender,
        age: student.age,
        currentSchool: student.currentSchool,
        photoUrl: student.photoUrl || '', // Base64 or URL
        parentName: student.parentName,
        parentRole: student.parentRole,
        whatsapp: student.whatsapp,
        preferredSchedule: student.preferredSchedule || "Rabu & Jum'at (18.45 - 21.00 WIB)",
        status: student.status,
        attendanceDefault: 'Hadir'
      }))
    };

    const blob = new Blob([JSON.stringify(rosterData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ERA_Kids_Roster_Presensi_Kehadiran_${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 3. Unduh Data Siswa Lengkap Format Excel (.xlsx) Beserta Foto (Tanpa Kelas & Jadwal Latihan)
  const handleDownloadStudentsExcel = async () => {
    if (registrations.length === 0) {
      alert('Tidak ada data siswa untuk diunduh.');
      return;
    }
    try {
      setIsExportingStudentsExcel(true);
      await exportStudentsToExcel(registrations);
      setToastMessage('File Excel data siswa beserta foto berhasil diunduh!');
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: any) {
      console.error('Error export students Excel:', err);
      alert('Gagal mengunduh file Excel: ' + (err?.message || 'Terjadi kesalahan sistem'));
    } finally {
      setIsExportingStudentsExcel(false);
    }
  };

  // 5. Export Standalone Offline Interactive / Printable HTML Attendance Sheet with Embedded Photos
  const downloadOfflineAttendanceHtml = () => {
    const timestamp = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const studentsHtmlRows = registrations.map((s, idx) => {
      const photoTag = s.photoUrl
        ? `<img src="${s.photoUrl}" alt="${s.studentName}" style="width:40px;height:48px;object-fit:cover;border-radius:6px;border:1px solid #cbd5e1;" />`
        : `<div style="width:40px;height:48px;background:#e2e8f0;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:16px;">${s.gender === 'L' ? '👦' : '👧'}</div>`;

      return `
        <tr>
          <td style="text-align:center;font-weight:bold;color:#64748b;">${idx + 1}</td>
          <td style="text-align:center;width:50px;">${photoTag}</td>
          <td style="text-align:center;">
            <span style="display:inline-block;padding:2px 6px;background:#fef3c7;color:#92400e;border:1px solid #fde68a;border-radius:4px;font-weight:bold;font-size:12px;">
              #${s.jerseyNumber || '-'}
            </span>
          </td>
          <td>
            <div style="font-weight:bold;color:#0f172a;font-size:13px;">${s.studentName}</div>
            <div style="color:#64748b;font-size:11px;">Panggilan: <strong>${s.nickname || '-'}</strong> • ${s.age} Thn (${s.gender})</div>
          </td>
          <td style="font-family:monospace;font-weight:bold;color:#4338ca;font-size:11px;text-align:center;">${s.regNumber}</td>
          <td style="font-size:11px;color:#334155;">${s.whatsapp}</td>
          <td style="border:1px solid #cbd5e1;text-align:center;width:40px;"></td>
          <td style="border:1px solid #cbd5e1;text-align:center;width:40px;"></td>
          <td style="border:1px solid #cbd5e1;text-align:center;width:40px;"></td>
          <td style="border:1px solid #cbd5e1;text-align:center;width:40px;"></td>
          <td style="border:1px solid #cbd5e1;text-align:center;width:40px;"></td>
          <td style="border:1px solid #cbd5e1;text-align:center;width:40px;"></td>
          <td style="border:1px solid #cbd5e1;text-align:center;width:40px;"></td>
          <td style="border:1px solid #cbd5e1;text-align:center;width:40px;"></td>
          <td style="border:1px solid #cbd5e1;width:65px;"></td>
        </tr>
      `;
    }).join('');

    const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lembar Presensi Kehadiran Siswa - ERA Kids</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
    .header { background: #0f172a; color: white; padding: 16px 20px; border-radius: 10px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
    .header h1 { margin: 0 0 4px 0; font-size: 18px; }
    .header p { margin: 0; font-size: 12px; color: #94a3b8; }
    .badge { background: #f59e0b; color: #78350f; padding: 3px 8px; border-radius: 9999px; font-weight: bold; font-size: 11px; }
    .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; background: white; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0; }
    table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    th { background: #047857; color: white; padding: 8px 6px; text-align: center; font-size: 11px; font-weight: bold; border: 1px solid #065f46; }
    td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
    tr:nth-child(even) { background: #f8fafc; }
    .btn { background: #059669; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 6px; }
    .btn:hover { background: #047857; }
    @media print {
      body { background: white; padding: 0; }
      .no-print { display: none !important; }
      .header { background: white; color: black; border-bottom: 2px solid black; border-radius: 0; padding: 6px 0; }
      th { background: #f1f5f9 !important; color: black !important; border: 1px solid #64748b !important; }
      td { border: 1px solid #94a3b8 !important; }
      table { box-shadow: none; font-size: 10px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>🏐 LEMBAR PRESENSI KEHADIRAN SISWA OFFLINE</h1>
      <p>ERA Kids • Volleyball Training for Kids • Tanggal Cetak: <strong>${timestamp}</strong></p>
    </div>
    <div style="text-align:right;">
      <span class="badge">Total: ${totalStudents} Siswa</span>
    </div>
  </div>

  <div class="toolbar no-print">
    <div style="font-size: 12px; color: #64748b;">
      📋 <strong>Pengganti Lembar Presensi Kertas:</strong> Dapat dibuka di laptop/tablet pelatih saat latihan di lapangan atau langsung dicetak ke kertas fisik.
    </div>
    <div>
      <button class="btn" onclick="window.print()">🖨️ Cetak / Simpan PDF</button>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:25px;">No</th>
        <th style="width:50px;">Foto</th>
        <th style="width:40px;">Jersey</th>
        <th style="text-align:left;">Nama Siswa</th>
        <th>No. Reg</th>
        <th style="text-align:left;">Kontak WA</th>
        <th style="width:38px;">Sesi 1</th>
        <th style="width:38px;">Sesi 2</th>
        <th style="width:38px;">Sesi 3</th>
        <th style="width:38px;">Sesi 4</th>
        <th style="width:38px;">Sesi 5</th>
        <th style="width:38px;">Sesi 6</th>
        <th style="width:38px;">Sesi 7</th>
        <th style="width:38px;">Sesi 8</th>
        <th style="width:65px;">Paraf</th>
      </tr>
    </thead>
    <tbody>
      ${studentsHtmlRows}
    </tbody>
  </table>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ERA_Kids_Lembar_Presensi_Offline_${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 5b. Unduh DATA SISWA ERA Kids Format HTML (Hanya Data Siswa Tanpa Data Orang Tua)
  const downloadStudentsDataHtml = () => {
    if (registrations.length === 0) {
      alert('Tidak ada data siswa untuk diunduh.');
      return;
    }

    downloadStudentsDataHtmlFile(registrations, {
      initialStatus: htmlFilterStatus,
      initialGender: htmlFilterGender,
      filteredOnly: false,
    });
    setToastMessage('File "DATA SISWA ERA Kids (.HTML)" berhasil diunduh!');
    setTimeout(() => setToastMessage(null), 3500);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(label);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  // 6. Handle multi-file selection and parsing
  const handleFilesSelected = async (fileList: FileList | File[]) => {
    const rawFiles = Array.from(fileList);
    const jsonFiles = rawFiles.filter(
      (f) => f.name.toLowerCase().endsWith('.json') || f.type.includes('json')
    );

    if (jsonFiles.length === 0) {
      alert('Silakan pilih setidaknya satu file berformat .JSON yang valid.');
      return;
    }

    setIsRestoring(true);
    setRestoreMessage(null);
    setParseErrors([]);

    try {
      const { allExtractedStudents, fileSummaries, parseErrors: errors } =
        await parseMultipleJsonFiles(jsonFiles);

      if (allExtractedStudents.length === 0) {
        throw new Error('Tidak ditemukan data siswa yang valid di dalam file JSON yang dipilih.');
      }

      setSelectedFiles(jsonFiles);
      setParseSummaries(fileSummaries);
      setStagingRawStudents(allExtractedStudents);
      setParseErrors(errors);
    } catch (err: any) {
      setRestoreMessage({
        type: 'error',
        text: err?.message || 'Gagal membaca atau memproses file cadangan JSON.'
      });
      setSelectedFiles([]);
      setParseSummaries([]);
      setStagingRawStudents([]);
    } finally {
      setIsRestoring(false);
    }
  };

  // Kalkulasi hasil penggabungan dan anti-duplikasi secara real-time
  const mergeResult: MergeDeduplicateResult | null =
    stagingRawStudents.length > 0
      ? mergeAndDeduplicateStudents(stagingRawStudents, registrations, restoreMode)
      : null;

  // Eksekusi pemulihan data ke server dan Cloud Firestore
  const handleExecuteRestore = async () => {
    if (!mergeResult || mergeResult.mergedStudents.length === 0) {
      alert('Tidak ada data siswa untuk dipulihkan.');
      return;
    }

    setIsRestoring(true);
    setRestoreMessage(null);

    try {
      // 1. Simpan ke Server Express & trigger SSE broadcast
      const res = await fetch('/api/database/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          students: mergeResult.mergedStudents,
          mode: restoreMode 
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Gagal memulihkan database di server.');
      }

      // 2. Simpan ke Cloud Firestore untuk persistensi permanen
      try {
        await batchRestoreRegistrationsToFirestore(
          mergeResult.mergedStudents,
          restoreMode === 'replace_current'
        );
      } catch (fsErr) {
        console.warn('[Firestore] Info sinkronisasi batch Firestore:', fsErr);
      }

      // 3. Refresh context state
      await fetchRegistrations();

      const dupInfo = mergeResult.duplicatesResolved > 0 
        ? ` (${mergeResult.duplicatesResolved} data duplikat berhasil disaring & disatukan)` 
        : '';

      setRestoreMessage({
        type: 'success',
        text: `Berhasil menggabungkan ${selectedFiles.length} file JSON! Total ${mergeResult.mergedStudents.length} siswa tersimpan rapi tanpa duplikat${dupInfo}.`
      });

      // Bersihkan staging file
      setSelectedFiles([]);
      setParseSummaries([]);
      setStagingRawStudents([]);
      setParseErrors([]);
    } catch (err: any) {
      setRestoreMessage({
        type: 'error',
        text: err?.message || 'Gagal mengeksekusi pemulihan data.'
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleResetStaging = () => {
    setSelectedFiles([]);
    setParseSummaries([]);
    setStagingRawStudents([]);
    setParseErrors([]);
    setRestoreMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto overflow-x-hidden">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border-0 sm:border border-slate-200 w-full max-w-full sm:max-w-2xl overflow-hidden my-0 sm:my-auto animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[96vh] sm:max-h-[92vh]">
        
        {/* Header Modal */}
        <div className="bg-slate-900 text-white px-3.5 sm:px-5 py-3 sm:py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-1.5 truncate">
                <span>Backup Database</span>
                <span className="text-[10px] bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-mono font-bold shrink-0">
                  {totalStudents} Siswa
                </span>
              </h3>
              <p className="text-[10.5px] text-slate-400 truncate">
                Cadangkan data lengkap & link presensi
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Database Status Ribbon */}
        <div className="px-3.5 sm:px-5 py-2 bg-indigo-50/70 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-1.5 text-xs shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 text-slate-700 text-[10.5px] font-medium">
              <Camera className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>Foto: <strong>{studentsWithPhoto}/{totalStudents}</strong></span>
            </div>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <div className="flex items-center gap-1 text-emerald-700 text-[10.5px] font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Foto Utuh Base64</span>
            </div>
          </div>

          <span className="text-[9.5px] font-mono text-indigo-700 bg-white px-1.5 py-0.5 rounded border border-indigo-200 shrink-0">
            JSON & Roster
          </span>
        </div>

        {/* Navigation Tabs */}
        <div className="px-3 sm:px-5 pt-2 bg-white border-b border-slate-200 flex items-center gap-1 shrink-0 overflow-x-auto no-scrollbar whitespace-nowrap">
          <button
            type="button"
            onClick={() => setActiveTab('download')}
            className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'download'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh Database</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('restore')}
            className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'restore'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Pulihkan Data</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'attendance'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CalendarCheck2 className="w-3.5 h-3.5" />
            <span>Link App Kehadiran</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('api')}
            className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'api'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Endpoint Live API</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          
          {/* TAB 1: UNDUH DATABASE */}
          {activeTab === 'download' && (
            <div className="space-y-3.5">
              <p className="text-slate-600 leading-relaxed">
                Pilih format unduhan atau backup database yang Anda butuhkan. Tersedia format dokumen <strong>HTML Data Siswa</strong>, lembar presensi siap cetak, format <strong>Excel (.xlsx)</strong> data siswa lengkap dengan foto asli tertanam, serta backup lengkap <strong>JSON</strong>.
              </p>

              {/* Card 0: DATA SISWA ERA Kids (HTML Profil Siswa Tanpa Data Orang Tua) */}
              <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50/80 transition-colors flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 flex-wrap">
                        DATA SISWA ERA Kids (HTML)
                        <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.2 rounded font-semibold">
                          Khusus Data Siswa (Tanpa Data Ortu)
                        </span>
                      </h4>
                      <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">
                        Laporan profil siswa mandiri format web/cetak (.html) yang memuat foto siswa, nomor registrasi, jersey, tempat/tanggal lahir, usia, TB/BB, sekolah, status, dan catatan <strong>tanpa mencantumkan data kontak/wali orang tua</strong>.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    id="btn-download-students-data-html"
                    onClick={downloadStudentsDataHtml}
                    className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh HTML ({registrations.filter(r => (htmlFilterStatus === 'ALL' || r.status === htmlFilterStatus) && (htmlFilterGender === 'ALL' || r.gender === htmlFilterGender)).length})</span>
                  </button>
                </div>

                {/* Filter Dropdown Controls inside HTML Card */}
                <div className="pt-2.5 border-t border-indigo-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <label htmlFor="modal-html-filter-status" className="block text-[10px] font-bold text-slate-700 mb-1">
                      Filter Status Pendaftaran:
                    </label>
                    <select
                      id="modal-html-filter-status"
                      value={htmlFilterStatus}
                      onChange={e => setHtmlFilterStatus(e.target.value)}
                      className="w-full bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="ALL">Semua Status ({registrations.length} Siswa)</option>
                      <option value="Register">Menunggu Verifikasi ({registrations.filter(r => r.status === 'Register').length} Siswa)</option>
                      <option value="Diterima">Diterima ({registrations.filter(r => r.status === 'Diterima').length} Siswa)</option>
                      <option value="Pembatalan Keanggotaan">Dibatalkan ({registrations.filter(r => r.status === 'Pembatalan Keanggotaan').length} Siswa)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="modal-html-filter-gender" className="block text-[10px] font-bold text-slate-700 mb-1">
                      Filter Jenis Kelamin:
                    </label>
                    <select
                      id="modal-html-filter-gender"
                      value={htmlFilterGender}
                      onChange={e => setHtmlFilterGender(e.target.value)}
                      className="w-full bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="ALL">Semua Jenis Kelamin ({registrations.length} Siswa)</option>
                      <option value="L">Laki-laki (L) ({registrations.filter(r => r.gender === 'L').length} Siswa)</option>
                      <option value="P">Perempuan (P) ({registrations.filter(r => r.gender === 'P').length} Siswa)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Card 1: Interactive Offline HTML Attendance Sheet (Printable) */}
              <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/40 hover:bg-teal-50/70 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Printer className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      Lembar Presensi Offline Siap Cetak (HTML)
                      <span className="text-[10px] bg-teal-100 text-teal-800 px-2 py-0.2 rounded font-semibold">
                        Bisa Buka Offline & Cetak
                      </span>
                    </h4>
                    <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">
                      File web mandiri yang memuat foto siswa langsung di dalamnya. Pelatih dapat membuka file ini di browser HP/laptop saat di lapangan tanpa internet atau langsung dicetak ke kertas fisik (Print / PDF).
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  id="btn-download-offline-html"
                  onClick={downloadOfflineAttendanceHtml}
                  className="w-full sm:w-auto px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh HTML / Cetak</span>
                </button>
              </div>

              {/* Card 3: Complete Students Data Excel (.xlsx with photos, without class and schedule) */}
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 hover:bg-blue-50/70 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      Data Siswa Lengkap + Foto (Excel .xlsx)
                      <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.2 rounded font-semibold">
                        Format Excel Resmi
                      </span>
                    </h4>
                    <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">
                      Buku induk registrasi siswa lengkap dengan <strong>foto asli tertanam</strong> di sel Excel. Kolom kelas dan jadwal latihan telah dihilangkan sesuai instruksi.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  id="btn-download-students-excel"
                  onClick={handleDownloadStudentsExcel}
                  disabled={isExportingStudentsExcel}
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 shrink-0"
                >
                  {isExportingStudentsExcel ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4" />
                  )}
                  <span>{isExportingStudentsExcel ? 'Memproses...' : 'Unduh Data Excel'}</span>
                </button>
              </div>

              {/* Card 4: Full JSON Backup */}
              <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50/70 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <FileJson className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      Database Lengkap + Foto (JSON)
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.2 rounded font-semibold">
                        Cadangan Sistem (JSON)
                      </span>
                    </h4>
                    <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">
                      Memuat seluruh profil siswa, nomor jersey, kontak wali, catatan pelatih, serta <strong>foto Base64 asli tanpa kompresi</strong> untuk arsip permanen atau restore database.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  id="btn-download-full-database"
                  onClick={downloadFullDatabaseJson}
                  className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh JSON</span>
                </button>
              </div>

              {/* Card 5: Attendance Roster JSON */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <CalendarCheck2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      Paket Roster Khusus App Kehadiran (JSON)
                      <span className="text-[10px] bg-slate-200 text-slate-800 px-2 py-0.2 rounded font-semibold">
                        Link Siap Pakai
                      </span>
                    </h4>
                    <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">
                      Diformat khusus dengan key `studentId`, `regNumber`, `jerseyNumber`, `photoUrl`, serta template status kehadiran (*Hadir/Izin/Tidak Hadir*).
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  id="btn-download-roster-json"
                  onClick={downloadAttendanceRosterJson}
                  className="w-full sm:w-auto px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-xl font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Roster</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: LINK DENGAN APP KEHADIRAN */}
          {activeTab === 'attendance' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-2">
                <div className="flex items-center gap-2">
                  <EraKidsLogo className="w-6 h-6 shrink-0" />
                  <h4 className="font-bold text-sm">Cara Menghubungkan ke App Daftar Kehadiran Siswa</h4>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Database registrasi ERA Kids ini menyediakan 2 metode integrasi untuk app daftar kehadiran latihan:
                </p>
              </div>

              {/* Method A: File Import */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center">1</span>
                  <h5 className="font-bold text-slate-900">Metode File: Unduh & Unggah Roster</h5>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Klik tombol <strong>&quot;Unduh Roster&quot;</strong> di tab Unduh Database. File JSON yang terunduh sudah memiliki struktur standar yang bisa langsung di-import ke aplikasi presensi Anda.
                </p>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-[11px] font-mono text-slate-700 space-y-1">
                  <div><strong>Key Unik Siswa:</strong> <code>regNumber</code> (contoh: <code>ERA-2026-001</code>)</div>
                  <div><strong>Key Nomor Punggung:</strong> <code>jerseyNumber</code> (contoh: <code>10</code>)</div>
                  <div><strong>Key Foto Siswa:</strong> <code>photoUrl</code> (Base64 data URL siap render langsung di tag <code>&lt;img&gt;</code>)</div>
                </div>
              </div>

              {/* Method B: Live Real-time API */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center">2</span>
                  <h5 className="font-bold text-slate-900">Metode Sinkronisasi Otomatis (Live REST API)</h5>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Aplikasi kehadiran Anda dapat langsung memanggil URL API endpoint secara berkala sehingga setiap ada siswa baru yang mendaftar, otomatis muncul di daftar absensi latihan!
                </p>
                
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    readOnly
                    value={liveRosterApiUrl}
                    className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-slate-800 select-all"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(liveRosterApiUrl, 'roster-url')}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 transition-all shrink-0"
                  >
                    {copiedLink === 'roster-url' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink === 'roster-url' ? 'Disalin!' : 'Salin URL'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ENDPOINT LIVE API */}
          {activeTab === 'api' && (
            <div className="space-y-3.5">
              <p className="text-slate-600 leading-relaxed">
                Gunakan endpoint API berikut jika app daftar kehadiran latihan Anda memiliki fitur <em>&quot;Fetch from URL&quot;</em> atau sinkronisasi cloud:
              </p>

              {/* Endpoint 1: Roster API */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-mono font-bold rounded text-[10px]">
                    GET
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">Format Output: JSON Roster</span>
                </div>
                <div className="font-mono text-[11px] text-indigo-700 bg-white p-2 rounded border border-slate-200 break-all select-all">
                  {liveRosterApiUrl}
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(liveRosterApiUrl, 'api-roster')}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    {copiedLink === 'api-roster' ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedLink === 'api-roster' ? 'Berhasil Disalin!' : 'Salin Link'}</span>
                  </button>
                </div>
              </div>

              {/* Endpoint 2: Full Database API */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-mono font-bold rounded text-[10px]">
                    GET
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">Format Output: Full Database + Photos</span>
                </div>
                <div className="font-mono text-[11px] text-indigo-700 bg-white p-2 rounded border border-slate-200 break-all select-all">
                  {liveBackupApiUrl}
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(liveBackupApiUrl, 'api-backup')}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    {copiedLink === 'api-backup' ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedLink === 'api-backup' ? 'Berhasil Disalin!' : 'Salin Link'}</span>
                  </button>
                </div>
              </div>

              {/* Sample Code Snippet */}
              <div className="p-3 bg-slate-900 rounded-xl text-slate-200 font-mono text-[10.5px] space-y-1 overflow-x-auto">
                <div className="text-slate-400">// Contoh pemanggilan di JavaScript / Node.js app kehadiran:</div>
                <div className="text-amber-300">const response = await fetch(&apos;{liveRosterApiUrl}&apos;);</div>
                <div className="text-indigo-300">const data = await response.json();</div>
                <div className="text-emerald-400">console.log(&apos;Jumlah siswa latihan:&apos;, data.totalActiveStudents);</div>
              </div>
            </div>
          )}

          {/* TAB 4: PULIHKAN DATA (RESTORE & ANTI-DUPLIKAT) */}
          {activeTab === 'restore' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Pemulihan Data Cerdas (Multi-File JSON & Anti-Duplikat)</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Anda dapat memilih <strong>satu atau beberapa file .JSON sekaligus</strong>. Sistem akan otomatis{' '}
                  <strong>menggabungkan seluruh data</strong> dan melakukan deduplikasi cerdas berdasarkan{' '}
                  <em>Nomor Registrasi</em>, <em>ID Siswa</em>, serta <em>Nama Lengkap & Kontak/Tanggal Lahir</em> sehingga{' '}
                  <strong>tidak akan ada data ganda</strong> yang tersimpan di sistem.
                </p>
              </div>

              {restoreMessage && (
                <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 shadow-xs ${
                  restoreMessage.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
                    : 'bg-rose-50 text-rose-900 border-rose-300'
                }`}>
                  {restoreMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold">{restoreMessage.text}</p>
                  </div>
                </div>
              )}

              {/* Parsing Warnings / Errors if any */}
              {parseErrors.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Catatan pembacaan file:</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-0.5 text-amber-800">
                    {parseErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* STEP 1: DROPZONE / FILE SELECTOR */}
              {selectedFiles.length === 0 ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleFilesSelected(e.dataTransfer.files);
                    }
                  }}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                    isDragOver
                      ? 'border-indigo-600 bg-indigo-50/70 scale-[0.99]'
                      : 'border-slate-300 hover:border-indigo-400 bg-slate-50/60'
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto mb-2.5 shadow-xs">
                    <Files className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm mb-1">
                    Pilih Satu atau Beberapa File Cadangan (.JSON)
                  </h4>
                  <p className="text-[11px] text-slate-500 max-w-md mx-auto mb-3.5 leading-relaxed">
                    Tarik dan lepaskan file JSON ke sini, atau klik tombol untuk memilih beberapa file cadangan (misal: arsip bulanan atau backup dari perangkat berbeda).
                  </p>

                  <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs">
                    {isRestoring ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span>{isRestoring ? 'Membaca File...' : 'Pilih File JSON (Bisa Banyak Sekaligus)'}</span>
                    <input
                      type="file"
                      multiple
                      accept=".json,application/json"
                      disabled={isRestoring}
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleFilesSelected(e.target.files);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                /* STEP 2: STAGED FILES & DEDUPLICATION PREVIEW */
                <div className="space-y-3.5 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                        {selectedFiles.length}
                      </span>
                      <h4 className="font-bold text-slate-900 text-xs">
                        File JSON Terpilih Siap Digabungkan
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={handleResetStaging}
                      disabled={isRestoring}
                      className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 hover:underline"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Ganti File</span>
                    </button>
                  </div>

                  {/* List of files with badges */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                    {parseSummaries.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px]"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileJson className="w-4 h-4 text-indigo-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-slate-800 truncate" title={file.fileName}>
                              {file.fileName}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {(file.fileSizeBytes / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-md font-bold text-[10px] shrink-0">
                          {file.extractedCount} Siswa
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Mode Selection */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] font-bold text-slate-700 block">
                      Metode Penggabungan Database:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRestoreMode('merge_with_current')}
                        className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                          restoreMode === 'merge_with_current'
                            ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-indigo-900 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-indigo-600" />
                            Gabung ke Database Saat Ini
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-indigo-100 text-indigo-800">
                            Disarankan
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-normal">
                          Disatukan dengan {registrations.length} siswa saat ini. Data siswa yang sama diperbarui & disempurnakan tanpa menduplikasi data.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRestoreMode('replace_current')}
                        className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                          restoreMode === 'replace_current'
                            ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                            <Database className="w-3.5 h-3.5 text-slate-600" />
                            Ganti Bersih Database
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-normal">
                          Mengganti seluruh data hanya dengan hasil gabungan file JSON yang diunggah. Duplikat antar file tetap disaring bersih.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Deduplication & Summary Statistics Box */}
                  {mergeResult && (
                    <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          Pratinjau Hasil & Proteksi Anti-Duplikat
                        </span>
                        <span className="text-[10px] text-emerald-700 font-semibold">
                          100% Bebas Data Ganda
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                        <div className="bg-white p-2 rounded-lg border border-emerald-100 shadow-2xs">
                          <div className="text-[10px] text-slate-500">File Diproses</div>
                          <div className="text-base font-extrabold text-slate-800">
                            {selectedFiles.length} <span className="text-[10px] font-normal text-slate-500">file</span>
                          </div>
                        </div>

                        <div className="bg-white p-2 rounded-lg border border-emerald-100 shadow-2xs">
                          <div className="text-[10px] text-slate-500">Total Mentah</div>
                          <div className="text-base font-extrabold text-slate-800">
                            {mergeResult.totalRawFound} <span className="text-[10px] font-normal text-slate-500">baris</span>
                          </div>
                        </div>

                        <div className="bg-white p-2 rounded-lg border border-amber-200 shadow-2xs">
                          <div className="text-[10px] text-amber-700 font-medium">Duplikat Dicegah</div>
                          <div className="text-base font-extrabold text-amber-600">
                            {mergeResult.duplicatesResolved} <span className="text-[10px] font-normal text-amber-600">disatukan</span>
                          </div>
                        </div>

                        <div className="bg-emerald-600 text-white p-2 rounded-lg shadow-2xs">
                          <div className="text-[10px] text-emerald-100 font-medium">Hasil Bersih Unik</div>
                          <div className="text-base font-extrabold">
                            {mergeResult.mergedStudents.length} <span className="text-[10px] font-normal text-emerald-200">siswa</span>
                          </div>
                        </div>
                      </div>

                      {mergeResult.duplicatesResolved > 0 && (
                        <p className="text-[10.5px] text-emerald-800 leading-normal flex items-start gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>
                            Sistem berhasil mendeteksi <strong>{mergeResult.duplicatesResolved} data yang sama</strong> di antara file/database. Profil dan foto terlengkap telah disatukan tanpa ada entri yang ganda.
                          </span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleResetStaging}
                      disabled={isRestoring}
                      className="px-3 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors"
                    >
                      Batal
                    </button>

                    <button
                      type="button"
                      id="btn-confirm-restore-merge"
                      onClick={handleExecuteRestore}
                      disabled={isRestoring || !mergeResult || mergeResult.mergedStudents.length === 0}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                    >
                      {isRestoring ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-4 h-4" />
                      )}
                      <span>
                        {isRestoring
                          ? 'Memproses Pemulihan...'
                          : `Pulihkan & Gabungkan (${mergeResult?.mergedStudents.length || 0} Siswa)`}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Modal */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            Sistem: <strong>ERA Kids</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors text-xs"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={downloadFullDatabaseJson}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors text-xs flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Backup Sekarang</span>
            </button>
          </div>
        </div>

        {/* TOAST MESSAGE */}
        {toastMessage && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

      </div>
    </div>
  );
};
