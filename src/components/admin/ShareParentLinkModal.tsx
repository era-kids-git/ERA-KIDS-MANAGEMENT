import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  X, 
  Copy, 
  Check, 
  Share2, 
  QrCode, 
  MessageSquare, 
  ExternalLink, 
  Download, 
  Printer, 
  Sparkles,
  ShieldCheck,
  Smartphone
} from 'lucide-react';

interface ShareParentLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareParentLinkModal: React.FC<ShareParentLinkModalProps> = ({
  isOpen,
  onClose
}) => {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Derive full URL for parents
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://era-kids.academy';
  const parentUrl = `${baseUrl}?portal=parent`;

  useEffect(() => {
    if (isOpen) {
      QRCode.toDataURL(parentUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#1e1b4b', // deep indigo
          light: '#ffffff'
        }
      })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('QR Code generation error:', err));
    }
  }, [isOpen, parentUrl]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(parentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = 'QR_Pendaftaran_ERA_Kids.png';
    a.click();
  };

  const handleShareWhatsApp = () => {
    const message = `*PENDAFTARAN SISWA BARU - ERA KIDS* 🌟

Halo Ayah & Bunda,

Kami mengundang ananda untuk bergabung dalam program minat bakat unggulan ERA Kids (Robotics & STEM, Coding, Super Math, English Phonics, Digital Art & Little Explorers).

Silakan isi formulir pendaftaran mandiri & pemesanan sesi Free Trial / Placement Test melalui tautan resmi kami:
👉 ${parentUrl}

Keunggulan ERA Kids:
✅ Kurikulum standar internasional & kurasi mentor berpengalaman
✅ Sesi Observasi / Free Trial gratis
✅ Pantau status pendaftaran mandiri secara real-time via WhatsApp

Untuk informasi lebih lanjut, silakan hubungi tim konselor kami. Terima kasih!`;

    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto overflow-x-hidden">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-full sm:max-w-lg shadow-2xl border-0 sm:border border-slate-200 overflow-hidden my-0 sm:my-6 max-h-[96vh] sm:max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-indigo-300 shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base truncate">Bagikan Link ke Orang Tua</h3>
              <p className="text-xs text-indigo-200 truncate">Tautan Khusus Portal Mandiri Calon Siswa / Atlet</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto overflow-x-hidden flex-1">
          {/* Explanation Banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-900 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Aman & Terisolasi Hanya untuk Orang Tua</p>
              <p className="text-emerald-800 text-[11px] mt-0.5">
                Dengan tautan ini (<code className="font-mono bg-emerald-100/70 px-1 rounded">?portal=parent</code>), orang tua akan langsung membuka <strong>Portal Pendaftaran</strong> tanpa melihat tombol menu admin atau data pribadi siswa lain.
              </p>
            </div>
          </div>

          {/* QR Code & Direct Scan */}
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="p-2 bg-white rounded-xl shadow-xs border border-slate-200 shrink-0 text-center">
              {qrDataUrl ? (
                <img 
                  src={qrDataUrl} 
                  alt="QR Code Pendaftaran ERA Kids" 
                  className="w-36 h-36 mx-auto rounded-lg"
                />
              ) : (
                <div className="w-36 h-36 flex items-center justify-center text-slate-400 text-xs">
                  Membuat QR...
                </div>
              )}
              <span className="text-[10px] text-slate-400 font-semibold block mt-1">
                Scan via Kamera HP
              </span>
            </div>

            <div className="flex-1 space-y-2 text-center sm:text-left">
              <h4 className="font-bold text-sm text-slate-800 flex items-center justify-center sm:justify-start gap-1.5">
                <QrCode className="w-4 h-4 text-indigo-600" />
                QR Code Brosur & Resepsionis
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Unduh gambar QR Code ini untuk dicetak pada banner pameran, brosur, atau meja depan resepsionis ERA Kids.
              </p>
              <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <button
                  type="button"
                  onClick={handleDownloadQR}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  Unduh Gambar QR (.png)
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  Cetak Lembar QR
                </button>
              </div>
            </div>
          </div>

          {/* Copy Direct Link URL */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              URL Khusus Orang Tua:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={parentUrl}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-700 select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 shadow-xs ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Tersalin!' : 'Salin Link'}
              </button>
            </div>
          </div>

          {/* WhatsApp Broadcast CTA */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="text-left">
                <h5 className="font-bold text-xs text-emerald-950">Kirim Siaran WhatsApp Langsung</h5>
                <p className="text-[11px] text-emerald-800">
                  Kirim draf undangan pendaftaran resmi ke grup orang tua / calon murid.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs whitespace-nowrap"
            >
              <Share2 className="w-3.5 h-3.5" />
              Buka WhatsApp
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <a
            href={parentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:underline font-semibold flex items-center gap-1"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Uji Tampilan Orang Tua di Tab Baru
          </a>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-slate-600 hover:bg-slate-200 rounded-xl font-semibold transition-colors"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
