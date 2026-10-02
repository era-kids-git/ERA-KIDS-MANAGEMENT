import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { 
  X, 
  Download, 
  Check, 
  ExternalLink, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Camera, 
  Video,
  FileText,
  Loader2,
  AlertCircle,
  Share2,
  Image as ImageIcon
} from 'lucide-react';
import { TrainingSession } from '../../types.ts';
import { EraKidsLogo } from '../common/EraKidsLogo.tsx';

interface TrainingReportModalProps {
  session: TrainingSession | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TrainingReportModal: React.FC<TrainingReportModalProps> = ({
  session,
  isOpen,
  onClose
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSharingWa, setIsSharingWa] = useState(false);
  const [isSharingImage, setIsSharingImage] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Format Kertas Laporan PDF:
  // 'auto': 1 Lembar Pas Utuh Continuous (Tinggi otomatis sesuai konten, TIDAK PERNAH terpisah/terpotong di WA/HP)
  // 'f4': Kertas F4 / Folio (215 x 330 mm - standar kantor & sekolah Indonesia)
  // 'a4': Kertas A4 (210 x 297 mm)
  // 'multipage': 2 Lembar Cetak A4 Terpisah Rapi (Cetak Fisik)
  const [paperFormat, setPaperFormat] = useState<'auto' | 'f4' | 'a4' | 'multipage'>('auto');

  // Responsive scaling & zoom state for mobile screen fitting
  const [zoomLevel, setZoomLevel] = useState<'fit' | 1 | 1.25 | 1.5>('fit');
  const [containerWidth, setContainerWidth] = useState<number>(760);
  const [reportNaturalHeight, setReportNaturalHeight] = useState<number>(1000);

  const reportRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const PAPER_WIDTH = 760;

  // Track container width for 100% responsive fit on mobile without horizontal scrolling
  useEffect(() => {
    if (!isOpen) return;

    const measureLayout = () => {
      if (scrollContainerRef.current) {
        setContainerWidth(scrollContainerRef.current.clientWidth);
      }
      if (reportRef.current) {
        setReportNaturalHeight(reportRef.current.offsetHeight || 1000);
      }
    };

    measureLayout();
    const timer = setTimeout(measureLayout, 150);
    window.addEventListener('resize', measureLayout);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', measureLayout);
    };
  }, [isOpen, session, zoomLevel]);

  // Compute actual scale factor
  const computedScale = (() => {
    if (zoomLevel === 'fit') {
      // In mobile, container width is typically 320px - 450px
      const usableWidth = Math.max(containerWidth - 8, 260);
      if (usableWidth < PAPER_WIDTH) {
        return Math.min(usableWidth / PAPER_WIDTH, 1);
      }
      return 1;
    }
    return zoomLevel;
  })();

  // Derive URLs
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://era-kids.academy';
  const sessionId = session?.id || '';
  const parentGalleryUrl = `${origin}/?portal=parent&tab=gallery&session=${encodeURIComponent(sessionId)}`;

  // Generate QR Code on open (compact, high quality)
  useEffect(() => {
    if (isOpen && session) {
      QRCode.toDataURL(parentGalleryUrl, {
        width: 180,
        margin: 1,
        color: {
          dark: '#0f172a', // slate-900
          light: '#ffffff'
        }
      })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('Error generating QR code for report:', err));
    }
  }, [isOpen, session, parentGalleryUrl]);

  if (!isOpen || !session) return null;

  // Format date nicely in Indonesian
  const formatIndonesianDate = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Helper to build formatted WhatsApp summary text
  const buildWhatsAppSummaryText = (): string => {
    const s = session;
    const formattedDate = formatIndonesianDate(s.date);
    const summary = {
      total: s.records.length,
      hadir: s.records.filter(r => r.status === 'Hadir').length,
      izin: s.records.filter(r => r.status === 'Izin').length,
      tidakHadir: s.records.filter(r => r.status !== 'Hadir' && r.status !== 'Izin').length,
    };
    const rate = summary.total > 0 ? Math.round((summary.hadir / summary.total) * 100) : 0;

    return `🏐 *LAPORAN RESMI LATIHAN ERA KIDS* 🏐
*ERA Kids - Volleyball Training for Kids*

Halo Ayah & Bunda, berikut rangkuman sesi latihan anak-anak:

📅 *Hari / Tanggal:* ${formattedDate}
⏰ *Waktu:* ${s.timeRange || '18.45 - 21.00 WIB'}
📍 *Lokasi:* ${s.location || 'GOR VOLI KUBA'}
📋 *Penanggung Jawab:* Admin ERA Kids
🏐 *Sesi:* ${s.sessionTitle}

📊 *Ringkasan Kehadiran:*
• Total Siswa Terdaftar: *${summary.total} Siswa*
• ✅ Hadir: *${summary.hadir} Siswa*
• ℹ️ Izin: *${summary.izin} Siswa*
• ❌ Tidak Hadir: *${summary.tidakHadir} Siswa*
• 📈 Tingkat Kehadiran: *${rate}%*

📸 *Akses & Unduh Foto/Video Dokumentasi Latihan (HD):*
👉 ${parentGalleryUrl}

📑 *Dokumen Laporan PDF Resmi:*
File PDF laporan resmi presensi & dokumentasi terlampir bersama pesan ini.

Terima kasih banyak atas dukungan Ayah & Bunda untuk kemajuan ananda! Salam olahraga dan semangat juara! 🏐✨
*Admin & Manajemen ERA Kids*`;
  };

  // Helper to generate full-resolution Image Blob (JPEG & PNG)
  const generateImageBlob = async (): Promise<{ jpegBlob: Blob; pngBlob: Blob; dataUrl: string; filename: string }> => {
    const element = reportRef.current || document.getElementById('printable-training-report');
    if (!element) {
      throw new Error('Dokumen laporan tidak ditemukan.');
    }

    const prevTransform = element.style.transform;
    const prevTransformOrigin = element.style.transformOrigin;
    element.style.transform = 'none';
    element.style.transformOrigin = 'initial';

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    element.style.transform = prevTransform;
    element.style.transformOrigin = prevTransformOrigin;

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

    const jpegBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Gagal konversi ke JPEG'))), 'image/jpeg', 0.95);
    });

    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Gagal konversi ke PNG'))), 'image/png');
    });

    const safeDate = session.date || new Date().toISOString().split('T')[0];
    const safeTitle = (session.sessionTitle || 'Laporan_Latihan').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Laporan_Latihan_ERAKids_${safeDate}_${safeTitle}.jpg`;

    return { jpegBlob, pngBlob, dataUrl, filename };
  };

  // Generate jsPDF instance and PDF Blob with high resolution and customizable paper format
  const generatePdfInstance = async (formatOverride?: 'auto' | 'f4' | 'a4' | 'multipage'): Promise<{ pdf: jsPDF; blob: Blob; filename: string; text: string }> => {
    const selectedFormat = formatOverride || paperFormat;
    const element = reportRef.current || document.getElementById('printable-training-report');
    if (!element) {
      throw new Error('Dokumen laporan tidak ditemukan.');
    }

    // Temporarily remove transform to guarantee 100% full-resolution capture
    const prevTransform = element.style.transform;
    const prevTransformOrigin = element.style.transformOrigin;
    element.style.transform = 'none';
    element.style.transformOrigin = 'initial';

    // Capture element using html2canvas with high scale for crisp text & crisp logos
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    // Restore transform
    element.style.transform = prevTransform;
    element.style.transformOrigin = prevTransformOrigin;

    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    let pdf: jsPDF;

    if (selectedFormat === 'auto') {
      // 1. AUTO 1 LEMBAR PAS UTUH (CONTINUOUS) - SANGAT DIANJURKAN UNTUK WA / PDF DIGITAL
      // Menyesuaikan tinggi kertas dengan tepat sesuai panjang konten (canvas height).
      // DIJAMIN 100% TIDAK PERNAH TERPOTONG / TERBELAH MENJADI BEBERAPA HALAMAN!
      const pageWidth = 210; // 210mm (standar lebar portrait A4)
      const margin = 6; // 6mm margin
      const printWidth = pageWidth - (margin * 2); // 198mm
      const printHeight = (canvas.height * printWidth) / canvas.width;
      const totalPageHeight = printHeight + (margin * 2);

      pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pageWidth, totalPageHeight],
        compress: true
      });

      pdf.addImage(imgData, 'JPEG', margin, margin, printWidth, printHeight, undefined, 'FAST');
    } else if (selectedFormat === 'f4') {
      // 2. KERTAS F4 / FOLIO INDONESIA (215 x 330 mm)
      // Ukuran standar instansi pendidikan & olahraga di Indonesia (lebih panjang 33mm dari A4)
      const pageWidth = 215;
      const pageHeight = 330;
      const margin = 6;
      const availableWidth = pageWidth - (margin * 2);
      const availableHeight = pageHeight - (margin * 2);
      const rawRatio = canvas.width / canvas.height;

      let finalPrintWidth = availableWidth;
      let finalPrintHeight = availableWidth / rawRatio;

      if (finalPrintHeight > availableHeight) {
        finalPrintHeight = availableHeight;
        finalPrintWidth = availableHeight * rawRatio;
      }

      const offsetX = margin + (availableWidth - finalPrintWidth) / 2;
      const offsetY = margin + (availableHeight - finalPrintHeight) / 2;

      pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pageWidth, pageHeight],
        compress: true
      });

      pdf.addImage(imgData, 'JPEG', offsetX, offsetY, finalPrintWidth, finalPrintHeight, undefined, 'FAST');
    } else if (selectedFormat === 'multipage') {
      // 3. MULTI-HALAMAN RAPI (2 LEMBAR A4 TERSTRUKTUR BERSIH)
      // Khusus cetak printer fisik: Halaman 1 (Presensi) & Halaman 2 (Dokumentasi Foto & Link)
      const pageWidth = 210;
      const margin = 6;
      const availableWidth = pageWidth - (margin * 2);

      pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const sliceHeightPx = Math.floor(canvas.height * 0.52);

      // Canvas Halaman 1
      const c1 = document.createElement('canvas');
      c1.width = canvas.width;
      c1.height = sliceHeightPx;
      const ctx1 = c1.getContext('2d');
      if (ctx1) {
        ctx1.drawImage(canvas, 0, 0, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);
      }
      const img1 = c1.toDataURL('image/jpeg', 0.95);
      const h1Mm = (sliceHeightPx * availableWidth) / canvas.width;
      pdf.addImage(img1, 'JPEG', margin, margin, availableWidth, h1Mm, undefined, 'FAST');

      // Canvas Halaman 2
      pdf.addPage('a4', 'portrait');
      const c2 = document.createElement('canvas');
      c2.width = canvas.width;
      c2.height = canvas.height - sliceHeightPx;
      const ctx2 = c2.getContext('2d');
      if (ctx2) {
        ctx2.drawImage(canvas, 0, sliceHeightPx, canvas.width, canvas.height - sliceHeightPx, 0, 0, canvas.width, canvas.height - sliceHeightPx);
      }
      const img2 = c2.toDataURL('image/jpeg', 0.95);
      const h2Mm = ((canvas.height - sliceHeightPx) * availableWidth) / canvas.width;
      pdf.addImage(img2, 'JPEG', margin, margin, availableWidth, h2Mm, undefined, 'FAST');
    } else {
      // 4. KERTAS A4 STANDAR (210 x 297 mm)
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 6;
      const availableWidth = pageWidth - (margin * 2);
      const availableHeight = pageHeight - (margin * 2);
      const rawRatio = canvas.width / canvas.height;

      let finalPrintWidth = availableWidth;
      let finalPrintHeight = availableWidth / rawRatio;

      if (finalPrintHeight > availableHeight) {
        finalPrintHeight = availableHeight;
        finalPrintWidth = availableHeight * rawRatio;
      }

      const offsetX = margin + (availableWidth - finalPrintWidth) / 2;
      const offsetY = margin + (availableHeight - finalPrintHeight) / 2;

      pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      pdf.addImage(imgData, 'JPEG', offsetX, offsetY, finalPrintWidth, finalPrintHeight, undefined, 'FAST');
    }

    const safeDate = session.date || new Date().toISOString().split('T')[0];
    const safeTitle = (session.sessionTitle || 'Laporan_Latihan').replace(/[^a-zA-Z0-9_-]/g, '_');
    const formatLabel = selectedFormat === 'auto' ? '1Lembar_Pas' : selectedFormat.toUpperCase();
    const filename = `Laporan_Latihan_ERAKids_${safeDate}_${safeTitle}_${formatLabel}.pdf`;

    const blob = pdf.output('blob');
    const text = buildWhatsAppSummaryText();

    return { pdf, blob, filename, text };
  };

  // Direct High-Resolution Image Download (JPG)
  const handleDownloadImage = async () => {
    if (isGeneratingPdf || isSharingWa || isSharingImage) return;
    setIsGeneratingPdf(true);
    setDownloadError(null);
    setDownloadSuccess(false);

    try {
      const { jpegBlob, filename } = await generateImageBlob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(jpegBlob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 5000);
    } catch (err: any) {
      console.error('Gagal unduh gambar laporan:', err);
      setDownloadError('Gagal mengunduh gambar: ' + (err?.message || ''));
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Direct Share High-Resolution Image (JPG) to WhatsApp
  // Sangat disukai karena gambar laporan langsung muncul di chat WhatsApp tanpa orang tua perlu unduh file PDF!
  const handleShareImageToWhatsApp = async () => {
    if (isSharingImage || isGeneratingPdf) return;
    setIsSharingImage(true);
    setShareMessage(null);

    try {
      const { jpegBlob, pngBlob, filename } = await generateImageBlob();
      const text = buildWhatsAppSummaryText();
      const file = new File([jpegBlob], filename, { type: 'image/jpeg' });

      // 1. Mobile & Web Share API support with File
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function' && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `Laporan Latihan ERA Kids - ${session.sessionTitle}`,
            text: text
          });
          setShareMessage({
            type: 'success',
            text: '✓ Gambar laporan dan ringkasan pesan berhasil dibagikan langsung ke WhatsApp!'
          });
          setTimeout(() => setShareMessage(null), 5000);
          return;
        } catch (shareErr: any) {
          if (shareErr.name === 'AbortError') return;
          console.warn('Navigator share error, falling back:', shareErr);
        }
      }

      // 2. Desktop Fallback:
      // A. Try copying image to clipboard for instant Ctrl+V
      try {
        if (navigator.clipboard && typeof (window as any).ClipboardItem !== 'undefined') {
          const item = new (window as any).ClipboardItem({ 'image/png': pngBlob });
          await navigator.clipboard.write([item]);
        }
      } catch (e) {
        // ignore
      }

      // B. Save the image file to device downloads
      const link = document.createElement('a');
      link.href = URL.createObjectURL(jpegBlob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);

      // C. Copy text to clipboard so it's ready to paste
      try {
        await navigator.clipboard.writeText(text);
      } catch (clipErr) {
        console.warn('Clipboard write error:', clipErr);
      }

      // D. Open WhatsApp with pre-filled text
      const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');

      setShareMessage({
        type: 'success',
        text: '✓ Gambar laporan (JPG HD) otomatis terunduh & WhatsApp terbuka! Anda juga dapat langsung menempelkan gambar (Ctrl+V) ke chat WhatsApp.'
      });
      setTimeout(() => setShareMessage(null), 8000);
    } catch (err: any) {
      console.error('Error sharing image to WhatsApp:', err);
      setShareMessage({
        type: 'error',
        text: 'Gagal membagikan gambar laporan: ' + (err?.message || 'Terjadi kesalahan.')
      });
      setTimeout(() => setShareMessage(null), 5000);
    } finally {
      setIsSharingImage(false);
    }
  };

  // Direct PDF generation and download
  const handleDownloadPdf = async (overrideFormat?: 'auto' | 'f4' | 'a4' | 'multipage') => {
    if (isGeneratingPdf || isSharingWa || isSharingImage) return;
    setIsGeneratingPdf(true);
    setDownloadError(null);
    setDownloadSuccess(false);

    try {
      const { pdf, filename } = await generatePdfInstance(overrideFormat);
      pdf.save(filename);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 5000);
    } catch (err: any) {
      console.error('Gagal generate PDF langsung via html2canvas:', err);
      setDownloadError('Gagal mengunduh file secara otomatis. Mencoba membuka dialog cetak browser...');
      setTimeout(() => {
        try {
          window.print();
        } catch (e) {
          console.error('Fallback print error:', e);
        }
      }, 500);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Direct Share PDF to WhatsApp (Mobile Web Share with PDF file, or Desktop auto-download + WA Web)
  const handleShareToWhatsApp = async () => {
    if (isSharingWa || isGeneratingPdf || isSharingImage) return;
    setIsSharingWa(true);
    setShareMessage(null);

    try {
      const { pdf, blob, filename, text } = await generatePdfInstance();
      const file = new File([blob], filename, { type: 'application/pdf' });

      // 1. Mobile & Web Share API support with File
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function' && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `Laporan Latihan ERA Kids - ${session.sessionTitle}`,
            text: text
          });
          setShareMessage({
            type: 'success',
            text: '✓ Laporan PDF dan ringkasan pesan berhasil dibagikan!'
          });
          setTimeout(() => setShareMessage(null), 4500);
          return;
        } catch (shareErr: any) {
          if (shareErr.name === 'AbortError') return;
          console.warn('Navigator share error, falling back to download + WhatsApp:', shareErr);
        }
      }

      // 2. Fallback for Desktop browsers or browsers without direct file sharing:
      // A. Save the PDF file to user's downloads so they have it ready
      pdf.save(filename);

      // B. Copy text to clipboard so it's ready to paste
      try {
        await navigator.clipboard.writeText(text);
      } catch (clipErr) {
        console.warn('Clipboard write error:', clipErr);
      }

      // C. Open WhatsApp with pre-filled message text
      const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');

      const formatNotice = paperFormat === 'auto' ? '1 Lembar Pas' : paperFormat.toUpperCase();
      setShareMessage({
        type: 'success',
        text: `✓ File PDF (${formatNotice}) otomatis terunduh & WhatsApp telah dibuka! Silakan lampirkan file PDF tersebut ke chat WhatsApp.`
      });
      setTimeout(() => setShareMessage(null), 7000);
    } catch (err: any) {
      console.error('Error sharing PDF to WhatsApp:', err);
      setShareMessage({
        type: 'error',
        text: 'Gagal membagikan laporan: ' + (err?.message || 'Terjadi kesalahan.')
      });
      setTimeout(() => setShareMessage(null), 5000);
    } finally {
      setIsSharingWa(false);
    }
  };

  const records = session.records || [];
  const mediaList = session.documentationMedia || (session.photos || []).map((p, idx) => ({
    id: `photo_${idx}`,
    type: 'photo' as const,
    url: p,
    name: `Foto Dokumentasi ${idx + 1}`,
    sizeFormatted: 'Standar',
    uploadedAt: session.createdAt
  }));

  // Only take the first row of media (up to 4 items in a 4-column row), rest is excluded from PDF
  const firstRowMedia = mediaList.slice(0, 4);

  const summary = {
    total: records.length,
    hadir: records.filter(r => r.status === 'Hadir').length,
    izin: records.filter(r => r.status === 'Izin').length,
    tidakHadir: records.filter(r => r.status !== 'Hadir' && r.status !== 'Izin').length,
  };
  const rate = summary.total > 0 ? Math.round((summary.hadir / summary.total) * 100) : 0;

  return (
    <div id="printable-modal-overlay" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto overflow-x-hidden print:static print:inset-auto print:p-0 print:m-0 print:overflow-visible print:bg-white">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border-0 sm:border border-slate-200 w-full min-w-full sm:min-w-0 sm:max-w-4xl overflow-hidden my-0 sm:my-auto animate-in fade-in zoom-in-95 duration-200 print:shadow-none print:border-none print:m-0 print:p-0 print:w-full print:max-w-none max-h-[98vh] sm:max-h-[90vh] flex flex-col">
        
        {/* MODAL CONTROL HEADER (Hidden on Print) */}
        <div className="bg-slate-900 text-white px-3 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between gap-2 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-white truncate">
                Laporan Sesi Latihan
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                {session.sessionTitle} • {formatIndonesianDate(session.date)}
              </p>
            </div>
          </div>

          {/* Clean Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Banners (Hidden on Print) */}
        {shareMessage && (
          <div className={`px-4 py-2 border-b text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in duration-150 print:hidden ${
            shareMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <span className="flex items-center gap-1.5">
              {shareMessage.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{shareMessage.text}</span>
            </span>
            <button
              type="button"
              onClick={() => setShareMessage(null)}
              className="p-0.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {downloadSuccess && (
          <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in duration-150 print:hidden">
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>File berhasil diunduh ke perangkat Anda.</span>
            </span>
            <button
              type="button"
              onClick={() => setDownloadSuccess(false)}
              className="p-0.5 text-emerald-600 hover:text-emerald-800"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {downloadError && (
          <div className="px-4 py-2 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between gap-1.5 animate-in fade-in duration-150 print:hidden">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{downloadError}</span>
            </span>
            <button
              type="button"
              onClick={() => setDownloadError(null)}
              className="p-0.5 text-rose-400 hover:text-rose-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* TOOLBAR: FORMAT KERTAS & ZOOM VIEW (Clean & Simple) */}
        <div className="bg-slate-50 px-4 sm:px-6 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs print:hidden">
          {/* Format Kertas */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 text-xs">
              Ukuran Kertas:
            </span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setPaperFormat('auto')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                  paperFormat === 'auto'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="1 Lembar Utuh Pas Konten (Anti-Terpotong)"
              >
                Auto 1 Lembar
              </button>
              <button
                type="button"
                onClick={() => setPaperFormat('f4')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                  paperFormat === 'f4'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Kertas F4 / Folio (215 x 330 mm)"
              >
                F4
              </button>
              <button
                type="button"
                onClick={() => setPaperFormat('a4')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                  paperFormat === 'a4'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Kertas A4 (210 x 297 mm)"
              >
                A4
              </button>
            </div>
          </div>

          {/* Zoom view */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setZoomLevel('fit')}
              className={`px-2.5 py-1 rounded-md text-xs transition-all ${
                zoomLevel === 'fit'
                  ? 'bg-slate-200 text-slate-900 font-bold'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Pas Layar
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(1)}
              className={`px-2.5 py-1 rounded-md text-xs transition-all ${
                zoomLevel === 1
                  ? 'bg-slate-200 text-slate-900 font-bold'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              100%
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* PRINTABLE REPORT DOCUMENT (Rendered and Exported to PDF) */}
        {/* ======================================================== */}
        <div 
          ref={scrollContainerRef}
          className={`max-h-[75vh] sm:max-h-[75vh] w-full ${zoomLevel === 'fit' ? 'overflow-x-hidden' : 'overflow-x-auto'} overflow-y-auto p-1 sm:p-6 bg-slate-100/70 print:max-h-none print:overflow-visible print:p-0 print:bg-white flex flex-col items-center`}
        >
          {/* Scaling wrapper to fit mobile width cleanly */}
          <div
            style={{
              width: `${PAPER_WIDTH * computedScale}px`,
              height: `${reportNaturalHeight * computedScale}px`,
            }}
            className="relative shrink-0 transition-[width,height] duration-150 print:!w-full print:!h-auto print:!m-0"
          >
            <div 
              ref={reportRef}
              id="printable-training-report" 
              style={{
                width: `${PAPER_WIDTH}px`,
                transform: `scale(${computedScale})`,
                transformOrigin: 'top left',
              }}
              className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 sm:p-7 text-slate-900 absolute top-0 left-0 print:static print:transform-none print:!w-full print:shadow-none print:border-none print:p-0"
            >
            {/* 1. OFFICIAL KOP / HEADER */}
            <div className="border-b-2 border-slate-900 pb-3.5 mb-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <EraKidsLogo className="w-14 h-14 shrink-0" />
                  <div>
                    <div className="font-black text-xl sm:text-2xl tracking-tight text-slate-950 leading-none flex items-center gap-2">
                      <span>ERA KIDS</span>
                    </div>
                    <div className="text-[11px] font-bold text-blue-900 uppercase tracking-wide mt-1">
                      Akademi Pembinaan Bola Voli Usia Dini
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      Official Training Session Report & Student Attendance
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="inline-block px-3 py-1 bg-slate-900 text-white text-[11px] font-black rounded-md tracking-wider uppercase shadow-xs">
                    LAPORAN SESI LATIHAN
                  </span>
                  <p className="text-[9.5px] text-slate-500 font-mono mt-1">
                    KODE: <span className="font-bold text-slate-800">{session.id}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* 2. SESSION METADATA GRID */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 mb-4 print:border-slate-300">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div>
                  <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider block">
                    Hari / Tanggal
                  </span>
                  <div className="font-bold text-slate-900 mt-0.5 flex items-center gap-1 text-[11px]">
                    <Calendar className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="truncate">{formatIndonesianDate(session.date)}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider block">
                    Waktu Latihan
                  </span>
                  <div className="font-bold text-slate-900 mt-0.5 flex items-center gap-1 text-[11px]">
                    <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                    <span>{session.timeRange || '18.45 - 21.00 WIB'}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider block">
                    Lokasi / Lapangan
                  </span>
                  <div className="font-bold text-slate-900 mt-0.5 flex items-center gap-1 text-[11px]">
                    <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                    <span className="truncate">{session.location || 'GOR VOLI KUBA'}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider block">
                    Penanggung Jawab
                  </span>
                  <div className="font-bold text-indigo-900 mt-0.5 flex items-center gap-1 text-[11px]">
                    <User className="w-3 h-3 text-indigo-600 shrink-0" />
                    <span className="truncate">Admin ERA Kids</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. STATISTIK RINGKASAN KEHADIRAN */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <span>📊</span>
                  <span>Ringkasan Kehadiran Siswa</span>
                </h4>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                  Tingkat Kehadiran: {rate}%
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-slate-100 border border-slate-200">
                  <span className="text-[9px] font-semibold text-slate-500 block">Total Siswa</span>
                  <span className="text-sm font-black text-slate-900">{summary.total}</span>
                </div>

                <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900">
                  <span className="text-[9px] font-semibold text-emerald-700 block">Hadir</span>
                  <span className="text-sm font-black text-emerald-700">{summary.hadir}</span>
                </div>

                <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-900">
                  <span className="text-[9px] font-semibold text-blue-700 block">Izin</span>
                  <span className="text-sm font-black text-blue-700">{summary.izin}</span>
                </div>

                <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-900">
                  <span className="text-[9px] font-semibold text-rose-700 block">Tidak Hadir</span>
                  <span className="text-sm font-black text-rose-700">{summary.tidakHadir}</span>
                </div>
              </div>
            </div>

            {/* 4. TABEL PRESENSI SISWA */}
            <div className="mb-4 print-page-break-inside-avoid">
              <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-800 mb-1.5 flex items-center gap-1.5">
                <span>📋</span>
                <span>Daftar Kehadiran Siswa</span>
              </h4>

              <div className="overflow-hidden border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold text-[10px]">
                      <th className="py-1.5 px-2 w-8 text-center">No</th>
                      <th className="py-1.5 px-2 w-16 text-center">Jersey</th>
                      <th className="py-1.5 px-3 w-28">No. Reg</th>
                      <th className="py-1.5 px-3">Nama Siswa</th>
                      <th className="py-1.5 px-3 w-24 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {records.map((rec, idx) => {
                      const isHadir = rec.status === 'Hadir';
                      const isIzin = rec.status === 'Izin';
                      const statusLabel = isHadir ? 'Hadir' : isIzin ? 'Izin' : 'Tidak Hadir';

                      return (
                        <tr 
                          key={rec.studentId || idx}
                          className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}
                        >
                          <td className="py-1.5 px-2 text-center font-semibold text-slate-500 text-[10px]">
                            {idx + 1}
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            {rec.jerseyNumber ? (
                              <span className="font-mono font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-1 py-0.2 rounded text-[9.5px]">
                                #{rec.jerseyNumber}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono text-[9.5px]">-</span>
                            )}
                          </td>
                          <td className="py-1.5 px-3 font-mono text-[9.5px] font-bold text-slate-700">
                            {rec.regNumber}
                          </td>
                          <td className="py-1.5 px-3 font-semibold text-slate-900 text-[11px]">
                            {rec.studentName}
                            {rec.nickname && (
                              <span className="text-slate-500 text-[10px] font-normal ml-1">
                                ({rec.nickname})
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 px-3 text-center">
                            <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-extrabold ${
                              isHadir
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : isIzin
                                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}>
                              {statusLabel}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {records.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-5 text-center text-slate-400 text-xs">
                          Belum ada data presensi yang tercatat untuk sesi ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 5. DOKUMENTASI FOTO & VIDEO (HANYA 1 BARIS AWAL, SISANYA DIHILANGKAN DARI PDF) */}
            {firstRowMedia.length > 0 && (
              <div className="mb-4 print-page-break-inside-avoid">
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Dokumentasi Foto Latihan ({mediaList.length} Total File)</span>
                  </h4>
                  <span className="text-[9.5px] text-slate-500 font-medium">
                    Lampiran 1 baris cuplikan ({firstRowMedia.length} item)
                  </span>
                </div>

                {/* Exactly 1 row of up to 4 items */}
                <div className="grid grid-cols-4 gap-2">
                  {firstRowMedia.map((media, i) => {
                    const isVideo = media.type === 'video';
                    return (
                      <div 
                        key={media.id || i}
                        className="rounded-lg overflow-hidden border border-slate-200 bg-slate-50 relative"
                      >
                        <div className="aspect-video bg-slate-950 relative overflow-hidden flex items-center justify-center">
                          {isVideo ? (
                            <div className="flex flex-col items-center justify-center text-white p-1 text-center">
                              <Video className="w-4 h-4 text-amber-400 mb-0.5" />
                              <span className="text-[7.5px] font-bold uppercase tracking-wider text-amber-200">VIDEO</span>
                            </div>
                          ) : (
                            <img 
                              src={media.url} 
                              alt={media.name || `Dokumentasi ${i + 1}`}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="p-1 bg-white border-t border-slate-100 flex items-center justify-between text-[8.5px]">
                          <span className="font-semibold text-slate-700 truncate max-w-[65%]">
                            {media.name || `Foto ${i + 1}`}
                          </span>
                          <span className="text-[7.5px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200 shrink-0">
                            {isVideo ? 'VIDEO' : 'FOTO'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {mediaList.length > firstRowMedia.length && (
                  <p className="text-[9px] text-slate-400 italic mt-1 text-right">
                    *+{mediaList.length - firstRowMedia.length} foto & video lainnya tidak dimuat di PDF (dapat diunduh lengkap via portal orang tua di bawah).
                  </p>
                )}
              </div>
            )}



            {/* 7. BAGIAN DOWNLOAD DOKUMENTASI (LINK & QR CODE) - DI PALING BAWAH & TIDAK TERLALU BESAR */}
            <div className="mt-4 p-2.5 sm:p-3 rounded-xl bg-slate-900 text-white border border-slate-800 shadow-xs print-page-break-inside-avoid">
              <div className="flex items-center gap-3">
                {/* Compact QR Code */}
                <div className="bg-white p-1 rounded-lg shrink-0 flex flex-col items-center shadow-xs">
                  {qrDataUrl ? (
                    <img 
                      src={qrDataUrl} 
                      alt="QR Akses Unduh Foto" 
                      className="w-14 h-14 object-contain"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-slate-100 flex items-center justify-center text-slate-400 text-[9px]">
                      QR
                    </div>
                  )}
                  <span className="text-[7px] font-extrabold text-slate-900 tracking-tight mt-0.5 uppercase">
                    SCAN HP
                  </span>
                </div>

                {/* Compact Text & Direct Download Link */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-[11px] font-black text-amber-300">
                    <Download className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>Akses Unduh Foto & Video Dokumentasi Asli (HD)</span>
                  </div>
                  <p className="text-[9.5px] text-slate-300 mt-0.5 leading-snug line-clamp-2">
                    Orang tua dapat melihat seluruh album dokumentasi dan mengunduh foto anak kualitas jernih (HD) melalui scan QR di samping atau klik tautan:
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <a
                      href={parentGalleryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-200 hover:text-white underline underline-offset-2 truncate max-w-full"
                    >
                      <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      <span className="truncate">{parentGalleryUrl}</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            </div>
          </div>
        </div>

        {/* MODAL FOOTER CONTROLS - SIMPLE, CLEAN & ESSENTIAL */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3 text-xs print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors text-xs sm:text-sm"
          >
            Tutup
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-download-img"
              onClick={handleDownloadImage}
              disabled={isGeneratingPdf || isSharingWa || isSharingImage}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 disabled:opacity-60 text-slate-700 font-bold rounded-lg transition-all text-xs sm:text-sm flex items-center gap-1.5"
              title="Unduh file gambar (JPG HD)"
            >
              <ImageIcon className="w-4 h-4 text-slate-600" />
              <span>Unduh Gambar</span>
            </button>

            <button
              type="button"
              id="btn-download-pdf"
              onClick={() => handleDownloadPdf()}
              disabled={isGeneratingPdf || isSharingWa || isSharingImage}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 disabled:opacity-60 text-slate-700 font-bold rounded-lg transition-all text-xs sm:text-sm flex items-center gap-1.5"
              title={`Unduh file PDF (${paperFormat === 'auto' ? '1 Lembar Pas' : paperFormat.toUpperCase()})`}
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              ) : (
                <Download className="w-4 h-4 text-indigo-600" />
              )}
              <span>Unduh PDF</span>
            </button>

            <button
              type="button"
              id="btn-share-wa"
              onClick={handleShareImageToWhatsApp}
              disabled={isSharingImage || isGeneratingPdf || isSharingWa}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-60 text-white font-bold rounded-lg transition-all text-xs sm:text-sm flex items-center gap-1.5 shadow-sm"
              title="Kirim laporan ke WhatsApp"
            >
              {isSharingImage ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengirim...</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>Share ke WA</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

