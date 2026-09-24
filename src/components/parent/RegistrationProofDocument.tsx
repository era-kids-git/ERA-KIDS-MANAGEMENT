import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { 
  ShieldCheck, 
  Calendar, 
  User, 
  Shirt, 
  Phone, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Sparkles,
  QrCode
} from 'lucide-react';
import { StudentRegistration } from '../../types';
import { formatIndonesianDate, formatIndonesianDateTime } from '../../utils/dateUtils';

interface RegistrationProofDocumentProps {
  registration: StudentRegistration;
  id?: string;
  isPdfMode?: boolean;
}

export const RegistrationProofDocument: React.FC<RegistrationProofDocumentProps> = ({
  registration,
  id = 'registration-proof-document',
  isPdfMode = false
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  useEffect(() => {
    // Generate official verification QR code containing link to check registration status
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const verificationUrl = `${origin}/?tab=status&reg=${encodeURIComponent(registration.regNumber)}`;

    QRCode.toDataURL(verificationUrl, {
      width: 200,
      margin: 1,
      color: {
        dark: '#1e1b4b',
        light: '#ffffff'
      }
    })
      .then(url => setQrCodeDataUrl(url))
      .catch(err => console.error('Failed to generate QR Code:', err));
  }, [registration.regNumber]);

  const genderLabel = registration.gender === 'L' ? 'Laki-laki' : 'Perempuan';
  const ttlText = `${registration.birthPlace ? registration.birthPlace + ', ' : ''}${formatIndonesianDate(registration.birthDate)} (${registration.age} Tahun)`;

  return (
    <div
      id={id}
      className={`bg-white text-slate-800 font-sans border border-slate-300 rounded-xl overflow-hidden shadow-xs ${
        isPdfMode ? 'w-[794px] min-h-[1050px] p-8' : 'w-full max-w-full sm:max-w-2xl mx-auto p-2.5 sm:p-6 overflow-x-hidden'
      }`}
      style={{ backgroundColor: '#ffffff' }}
    >
      {/* 1. HEADER ERA KIDS - CLEAN & SIMPLE */}
      <div className="border-b border-slate-200 pb-3 mb-4 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center text-white text-lg font-black shadow-2xs shrink-0">
          🏐
        </div>
        <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 font-mono">
          ERA Kids
        </span>
      </div>

      {/* 2. JUDUL DOKUMEN & NOMOR REGISTRASI */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="text-[9.5px] font-bold text-indigo-600 uppercase tracking-wider block mb-0.5">
            Dokumen Resmi Pendaftaran
          </span>
          <h2 className="text-xs sm:text-sm font-bold text-slate-800 tracking-normal">
            BUKTI PENDAFTARAN RESMI CALON SISWA
          </h2>
          <span className="text-[10.5px] text-slate-500 block mt-0.5">
            Waktu Daftar: {formatIndonesianDateTime(registration.createdAt)}
          </span>
        </div>

        <div className="text-left sm:text-right">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Nomor Registrasi
          </span>
          <span className="text-lg sm:text-xl font-black text-indigo-700 font-mono tracking-tight">
            {registration.regNumber}
          </span>
          <div>
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 mt-0.5">
              Status: {registration.status}
            </span>
          </div>
        </div>
      </div>

      {/* 3. DATA UTAMA SISWA & PAS FOTO */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
        {/* Pas Foto 3x4 Calon Siswa */}
        <div className="sm:col-span-1 flex flex-col items-center text-center">
          <div className="relative w-28 sm:w-32 h-36 sm:h-40 rounded-lg border-2 border-indigo-200 p-1 bg-slate-100 shadow-2xs overflow-hidden flex items-center justify-center">
            {registration.photoUrl ? (
              <img
                src={registration.photoUrl}
                alt={registration.studentName}
                crossOrigin="anonymous"
                className="w-full h-full object-cover rounded"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 p-2">
                <User className="w-10 h-10 mb-1" />
                <span className="text-[10px] font-medium leading-tight">Pas Foto 3x4</span>
              </div>
            )}
            {registration.jerseyNumber && (
              <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-indigo-600 text-white font-mono font-black text-[10px] rounded shadow-xs">
                #{registration.jerseyNumber}
              </div>
            )}
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase mt-1">
            Foto Resmi Siswa
          </span>
        </div>

        {/* Tabel Data Diri Calon Siswa */}
        <div className="sm:col-span-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1 mb-2 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-indigo-600" />
            <span>Data Calon Siswa</span>
          </h3>

          <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 block">Nama Lengkap:</span>
              <span className="font-bold text-slate-900 text-xs sm:text-sm">
                {registration.studentName}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 block">Nama Panggilan:</span>
              <span className="font-semibold text-slate-800">
                {registration.nickname || '-'}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 block">Jenis Kelamin:</span>
              <span className="font-semibold text-slate-800">
                {genderLabel}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 block">No. Jersey Terpilih:</span>
              <span className="font-mono font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded text-[11px] inline-block">
                #{registration.jerseyNumber || '-'}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 block">Tempat, Tanggal Lahir (Usia):</span>
              <span className="font-medium text-slate-800">
                {ttlText}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 block">Tinggi / Berat Badan:</span>
              <span className="font-medium text-slate-800">
                {registration.height ? `${registration.height} cm` : '-'} / {registration.weight ? `${registration.weight} kg` : '-'}
              </span>
            </div>

            <div className="col-span-2">
              <span className="text-[10px] text-slate-500 block">Asal Sekolah:</span>
              <span className="font-medium text-slate-800">
                {registration.currentSchool || '-'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. DATA ORANG TUA / WALI & PROGRAM */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {/* Data Orang Tua / Wali */}
        <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200 text-xs">
          <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1 mb-1.5 flex items-center gap-1.5">
            <Phone className="w-3 h-3 text-indigo-600" />
            <span>Data Orang Tua / Wali</span>
          </h3>

          <div className="space-y-1 text-[11px]">
            <div>
              <span className="text-slate-500">Nama Orang Tua/Wali:</span>{' '}
              <strong className="text-slate-900">{registration.parentName}</strong> ({registration.parentRole})
            </div>
            <div>
              <span className="text-slate-500">No. WhatsApp:</span>{' '}
              <strong className="text-emerald-700 font-mono">{registration.whatsapp}</strong>
            </div>
            {registration.email && (
              <div>
                <span className="text-slate-500">Email:</span>{' '}
                <span className="text-slate-800">{registration.email}</span>
              </div>
            )}
            <div>
              <span className="text-slate-500">Alamat Domisili:</span>{' '}
              <span className="text-slate-800">
                {registration.address}
                {registration.subdistrict && `, Kel. ${registration.subdistrict}`}
                {registration.district && `, Kec. ${registration.district}`}
                {registration.city && `, ${registration.city}`}
              </span>
            </div>
          </div>
        </div>

        {/* Informasi Program & Jadwal Latihan */}
        <div className="bg-indigo-50/70 rounded-lg p-2.5 border border-indigo-200 text-xs">
          <h3 className="text-[11px] font-bold text-indigo-950 uppercase tracking-wide border-b border-indigo-200/80 pb-1 mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-indigo-600" />
            <span>Program & Jadwal Latihan</span>
          </h3>

          <div className="space-y-1 text-[11px] text-indigo-950">
            <div>
              <span className="text-indigo-700 font-medium">Program:</span>{' '}
              <strong className="text-indigo-900">Volleyball Training for Kids</strong>
            </div>
            <div>
              <span className="text-indigo-700 font-medium">Hari & Jam:</span>{' '}
              <strong className="text-indigo-900">Rabu & Jum'at (18.45 - 21.00 WIB)</strong>
            </div>
            <div>
              <span className="text-indigo-700 font-medium">Lokasi:</span>{' '}
              <span className="text-indigo-900 font-medium">GOR Voli Kuba, Kota Bekasi</span>
            </div>
            <div className="pt-0.5 text-[10px] text-indigo-800 leading-tight">
              ℹ️ Siswa diharapkan hadir 15 menit sebelum latihan dengan berpakaian olahraga rapi & membawa botol air minum.
            </div>
          </div>
        </div>
      </div>

      {/* 5. VERIFIKASI KEABSAHAN & TANDA DIGITAL SISTEM */}
      <div className="border-t border-slate-200 pt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* QR Code Verifikasi */}
        <div className="flex items-center gap-2.5">
          <div className="w-16 h-16 rounded border border-slate-300 p-0.5 bg-white shrink-0 flex items-center justify-center">
            {qrCodeDataUrl ? (
              <img
                src={qrCodeDataUrl}
                alt="QR Code Verifikasi"
                className="w-full h-full object-contain"
              />
            ) : (
              <QrCode className="w-10 h-10 text-slate-300" />
            )}
          </div>
          <div className="max-w-xs text-[9.5px] text-slate-500 leading-snug">
            <span className="font-bold text-slate-700 block text-[10px]">
              Verifikasi Keabsahan Dokumen
            </span>
            Pindai kode QR untuk memeriksa status pendaftaran resmi ananda di Portal Orang Tua ERA Kids secara real-time.
          </div>
        </div>

        {/* Tanda Tangan / Cap Resmi Manajemen */}
        <div className="text-right shrink-0">
          <div className="text-[10px] font-medium text-slate-600">
            Diterbitkan oleh:
          </div>
          <div className="text-xs font-black text-slate-900 font-mono">
            ERA Kids Management
          </div>
          <div className="inline-flex items-center gap-1 text-[9.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded mt-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>Terverifikasi Digital</span>
          </div>
        </div>
      </div>
    </div>
  );
};
