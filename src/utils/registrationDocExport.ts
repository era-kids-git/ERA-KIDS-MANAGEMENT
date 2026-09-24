import QRCode from 'qrcode';
import html2canvas from 'html2canvas-pro';
import { StudentRegistration } from '../types';
import { formatIndonesianDate, formatIndonesianDateTime, formatBirthDate } from './dateUtils';

/**
 * Generates an official, beautiful, standalone HTML document for registration proof.
 * This document is guaranteed to render seamlessly in 1 clean sheet on all browsers and devices
 * without any slicing or pagination cut-offs.
 */
export async function generateRegistrationProofHtml(
  registration: StudentRegistration,
  qrCodeUrl?: string
): Promise<string> {
  let qrCodeData = qrCodeUrl;
  if (!qrCodeData) {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const verificationUrl = `${origin}/?tab=status&reg=${encodeURIComponent(registration.regNumber)}`;
      qrCodeData = await QRCode.toDataURL(verificationUrl, {
        width: 180,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });
    } catch {
      qrCodeData = '';
    }
  }

  const genderLabel = registration.gender === 'L' ? 'Laki-laki (Putra)' : 'Perempuan (Putri)';
  const ttlText = `${registration.birthPlace ? registration.birthPlace + ', ' : ''}${formatBirthDate(registration.birthDate)} (${registration.age} Tahun)`;
  const safeReg = (registration.regNumber || 'REG').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeName = (registration.nickname || registration.studentName || 'Siswa').replace(/[^a-zA-Z0-9_-]/g, '_');

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bukti Pendaftaran Resmi ERA Kids - ${registration.regNumber} - ${registration.studentName}</title>
  <style>
    :root {
      --primary: #4338ca;
      --primary-dark: #312e81;
      --slate-900: #0f172a;
      --slate-800: #1e293b;
      --slate-700: #334155;
      --slate-600: #475569;
      --slate-500: #64748b;
      --slate-200: #e2e8f0;
      --slate-100: #f1f5f9;
      --slate-50: #f8fafc;
      --emerald-600: #059669;
      --emerald-50: #ecfdf5;
      --amber-600: #d97706;
      --amber-50: #fffbeb;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      color: var(--slate-800);
      line-height: 1.45;
      padding: 16px 12px;
      -webkit-font-smoothing: antialiased;
    }
    .action-header {
      max-width: 720px;
      margin: 0 auto 16px auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      background: #ffffff;
      padding: 10px 16px;
      border-radius: 12px;
      border: 1px solid var(--slate-200);
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .action-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--slate-800);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .btn-print {
      background: var(--primary);
      color: #ffffff;
      border: none;
      padding: 7px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
      transition: background 0.15s;
    }
    .btn-print:hover {
      background: var(--primary-dark);
    }
    .doc-card {
      max-width: 720px;
      margin: 0 auto;
      background: #ffffff;
      border: 1.5px solid #cbd5e1;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);
      page-break-inside: avoid;
      break-inside: avoid;
    }
    /* Kop Surat */
    .kop-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid var(--slate-900);
      padding-bottom: 12px;
      margin-bottom: 14px;
      gap: 12px;
    }
    .kop-brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .kop-logo {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: linear-gradient(135deg, #f59e0b, #ec4899, #4f46e5);
      color: #ffffff;
      font-size: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
      flex-shrink: 0;
    }
    .kop-name {
      font-size: 22px;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: var(--slate-900);
      font-family: monospace, sans-serif;
      line-height: 1.1;
    }
    .kop-sub {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--slate-700);
      margin-top: 2px;
    }
    .kop-info {
      font-size: 10.5px;
      color: var(--slate-500);
      margin-top: 1px;
    }
    .kop-code {
      text-align: right;
      flex-shrink: 0;
    }
    .kop-code-label {
      font-size: 9px;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--slate-500);
      letter-spacing: 0.5px;
    }
    .kop-code-val {
      font-size: 11px;
      font-weight: 800;
      font-family: monospace;
      color: var(--slate-800);
    }

    /* Banner Judul & No Reg */
    .banner-reg {
      background: var(--slate-50);
      border: 1px solid var(--slate-200);
      border-radius: 10px;
      padding: 10px 14px;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .banner-tag {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--primary);
      margin-bottom: 2px;
    }
    .banner-title {
      font-size: 12.5px;
      font-weight: 800;
      color: var(--slate-900);
    }
    .banner-time {
      font-size: 10px;
      color: var(--slate-500);
      margin-top: 2px;
    }
    .reg-num-block {
      text-align: right;
    }
    .reg-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--slate-500);
    }
    .reg-num {
      font-size: 18px;
      font-weight: 900;
      font-family: monospace;
      color: var(--primary);
      line-height: 1.1;
    }
    .badge-status {
      display: inline-block;
      font-size: 9.5px;
      font-weight: 700;
      padding: 1.5px 7px;
      border-radius: 4px;
      margin-top: 3px;
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
    }

    /* Grid Siswa & Foto */
    .student-grid {
      display: grid;
      grid-template-columns: 110px 1fr;
      gap: 14px;
      margin-bottom: 14px;
      align-items: start;
    }
    .photo-box {
      width: 110px;
      height: 135px;
      border: 2px solid #c7d2fe;
      border-radius: 8px;
      background: var(--slate-100);
      overflow: hidden;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .photo-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .photo-fallback {
      font-size: 32px;
      text-align: center;
    }
    .photo-jersey {
      position: absolute;
      bottom: 4px;
      right: 4px;
      background: var(--primary);
      color: #ffffff;
      font-family: monospace;
      font-weight: 900;
      font-size: 10px;
      padding: 1px 5px;
      border-radius: 4px;
    }
    .photo-caption {
      font-size: 9px;
      font-weight: 700;
      color: var(--slate-500);
      text-align: center;
      margin-top: 4px;
      text-transform: uppercase;
    }
    .section-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--slate-900);
      border-bottom: 1px solid var(--slate-200);
      padding-bottom: 4px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .fields-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 12px;
      font-size: 11px;
    }
    .field-item {
      display: flex;
      flex-direction: column;
    }
    .field-full {
      grid-column: span 2;
    }
    .field-label {
      font-size: 9.5px;
      color: var(--slate-500);
      margin-bottom: 1px;
    }
    .field-val {
      font-weight: 700;
      color: var(--slate-900);
    }
    .jersey-tag {
      display: inline-block;
      font-family: monospace;
      font-weight: 900;
      color: var(--primary);
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 11px;
      width: fit-content;
    }

    /* Sub Grids */
    .two-col-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 14px;
    }
    .col-box {
      background: var(--slate-50);
      border: 1px solid var(--slate-200);
      border-radius: 10px;
      padding: 10px 12px;
      font-size: 10.5px;
    }
    .col-box-program {
      background: #f8fafc;
      border-color: #c7d2fe;
    }
    .col-list {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .col-item-label {
      color: var(--slate-500);
    }
    .col-item-val {
      color: var(--slate-900);
      font-weight: 700;
    }

    /* Footer & Verification */
    .doc-footer {
      border-top: 1px solid var(--slate-200);
      padding-top: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
    }
    .qr-block {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .qr-img {
      width: 58px;
      height: 58px;
      border: 1px solid var(--slate-200);
      border-radius: 6px;
      padding: 2px;
      background: #ffffff;
      flex-shrink: 0;
    }
    .qr-desc {
      max-width: 270px;
      font-size: 9px;
      color: var(--slate-500);
      line-height: 1.35;
    }
    .qr-desc strong {
      display: block;
      color: var(--slate-800);
      font-size: 9.5px;
      margin-bottom: 1px;
    }
    .stamp-block {
      text-align: right;
      flex-shrink: 0;
    }
    .stamp-sub {
      font-size: 9px;
      color: var(--slate-500);
    }
    .stamp-name {
      font-size: 11.5px;
      font-weight: 900;
      font-family: monospace;
      color: var(--slate-900);
      margin-top: 1px;
    }
    .stamp-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 9px;
      font-weight: 700;
      color: var(--emerald-600);
      background: var(--emerald-50);
      border: 1px solid #a7f3d0;
      padding: 1.5px 6px;
      border-radius: 4px;
      margin-top: 3px;
    }

    /* Print Styles: Fits seamlessly onto 1 A4 Page without splitting or cutting */
    @media print {
      @page {
        size: A4 portrait;
        margin: 8mm;
      }
      body {
        background: #ffffff !important;
        padding: 0 !important;
      }
      .no-print {
        display: none !important;
      }
      .doc-card {
        border: 1.5px solid #0f172a !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        padding: 16px !important;
        width: 100% !important;
        max-width: 100% !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .banner-reg, .col-box {
        background-color: #f8fafc !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .badge-status, .jersey-tag, .stamp-badge {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }

    @media (max-width: 600px) {
      body {
        padding: 8px 6px;
      }
      .doc-card {
        padding: 14px 10px;
        border-radius: 12px;
      }
      .two-col-grid {
        grid-template-columns: 1fr;
      }
      .banner-reg {
        flex-direction: column;
        align-items: flex-start;
      }
      .reg-num-block {
        text-align: left;
      }
      .doc-footer {
        flex-direction: column;
        align-items: flex-start;
      }
      .stamp-block {
        text-align: left;
      }
    }
  </style>
</head>
<body>

  <!-- Top Action Bar (Disembunyikan saat dicetak) -->
  <div class="action-header no-print">
    <div class="action-title">
      <span>📄</span>
      <span>Dokumen Bukti Pendaftaran Resmi ERA Kids</span>
    </div>
    <div style="display: flex; gap: 8px;">
      <button type="button" class="btn-print" onclick="window.print()">
        <span>🖨️</span>
        <span>Cetak / Simpan PDF</span>
      </button>
    </div>
  </div>

  <!-- Dokumen Bukti Utama: 1 Lembar Utuh -->
  <div class="doc-card" id="proof-doc-card">
    
    <!-- 1. KOP SURAT RESMI - CLEAN SIMPLE -->
    <div class="kop-header">
      <div class="kop-brand">
        <div class="kop-logo">🏐</div>
        <div class="kop-name">ERA Kids</div>
      </div>
    </div>

    <!-- 2. BANNER REGISTRASI -->
    <div class="banner-reg">
      <div>
        <div class="banner-tag">Dokumen Resmi Pendaftaran</div>
        <div class="banner-title">BUKTI PENDAFTARAN RESMI CALON SISWA</div>
        <div class="banner-time">Waktu Terdaftar: ${formatIndonesianDateTime(registration.createdAt)}</div>
      </div>
      <div class="reg-num-block">
        <div class="reg-label">Nomor Registrasi</div>
        <div class="reg-num">${registration.regNumber}</div>
        <span class="badge-status">Status: ${registration.status}</span>
      </div>
    </div>

    <!-- 3. DATA UTAMA SISWA & PAS FOTO -->
    <div class="student-grid">
      <div>
        <div class="photo-box">
          ${registration.photoUrl 
            ? `<img src="${registration.photoUrl}" alt="${registration.studentName}" class="photo-img" />` 
            : `<div class="photo-fallback">${registration.gender === 'L' ? '👦' : '👧'}</div>`
          }
          ${registration.jerseyNumber ? `<div class="photo-jersey">#${registration.jerseyNumber}</div>` : ''}
        </div>
        <div class="photo-caption">Pas Foto Resmi</div>
      </div>

      <div>
        <div class="section-title">
          <span>👤</span>
          <span>Data Calon Siswa</span>
        </div>

        <div class="fields-grid">
          <div class="field-item field-full">
            <span class="field-label">Nama Lengkap Siswa:</span>
            <span class="field-val" style="font-size: 13px;">${registration.studentName}</span>
          </div>

          <div class="field-item">
            <span class="field-label">Nama Panggilan:</span>
            <span class="field-val">${registration.nickname || '-'}</span>
          </div>

          <div class="field-item">
            <span class="field-label">Jenis Kelamin:</span>
            <span class="field-val">${genderLabel}</span>
          </div>

          <div class="field-item">
            <span class="field-label">Nomor Jersey Siswa:</span>
            <div><span class="jersey-tag">#${registration.jerseyNumber || '-'}</span></div>
          </div>

          <div class="field-item">
            <span class="field-label">Tempat, Tanggal Lahir (Usia):</span>
            <span class="field-val">${ttlText}</span>
          </div>

          <div class="field-item">
            <span class="field-label">Tinggi / Berat Badan:</span>
            <span class="field-val">${registration.height ? registration.height + ' cm' : '-'} / ${registration.weight ? registration.weight + ' kg' : '-'}</span>
          </div>

          <div class="field-item field-full">
            <span class="field-label">Asal Sekolah:</span>
            <span class="field-val">${registration.currentSchool || '-'}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 4. DATA ORANG TUA & PROGRAM LATIHAN -->
    <div class="two-col-grid">
      <!-- Data Orang Tua -->
      <div class="col-box">
        <div class="section-title">
          <span>📞</span>
          <span>Data Orang Tua / Wali</span>
        </div>
        <div class="col-list">
          <div>
            <span class="col-item-label">Nama Orang Tua:</span>{' '}
            <strong class="col-item-val">${registration.parentName}</strong> (${registration.parentRole})
          </div>
          <div>
            <span class="col-item-label">No. WhatsApp:</span>{' '}
            <strong style="color: #059669; font-family: monospace;">${registration.whatsapp}</strong>
          </div>
          ${registration.email ? `<div><span class="col-item-label">Email:</span> <span class="col-item-val">${registration.email}</span></div>` : ''}
          <div>
            <span class="col-item-label">Alamat Domisili:</span>{' '}
            <span class="col-item-val">${registration.address || '-'}${registration.subdistrict ? ', Kel. ' + registration.subdistrict : ''}${registration.district ? ', Kec. ' + registration.district : ''}${registration.city ? ', ' + registration.city : ''}</span>
          </div>
        </div>
      </div>

      <!-- Jadwal & Lokasi Program -->
      <div class="col-box col-box-program">
        <div class="section-title">
          <span>📅</span>
          <span>Program & Jadwal Latihan</span>
        </div>
        <div class="col-list">
          <div>
            <span class="col-item-label">Program:</span>{' '}
            <strong style="color: #312e81;">Volleyball Training for Kids</strong>
          </div>
          <div>
            <span class="col-item-label">Hari & Jam:</span>{' '}
            <strong style="color: #1e1b4b;">Rabu & Jum'at (18.45 - 21.00 WIB)</strong>
          </div>
          <div>
            <span class="col-item-label">Lokasi Latihan:</span>{' '}
            <span class="col-item-val">GOR Voli Kuba, Kota Bekasi</span>
          </div>
          <div style="font-size: 9.5px; color: #4338ca; margin-top: 2px; line-height: 1.3;">
            ℹ️ Siswa diharapkan hadir 15 menit sebelum latihan, berseragam olahraga, dan membawa botol air minum.
          </div>
        </div>
      </div>
    </div>

    <!-- 5. VERIFIKASI KEABSAHAN & TANDA DIGITAL SISTEM -->
    <div class="doc-footer">
      <div class="qr-block">
        ${qrCodeData ? `<img src="${qrCodeData}" alt="QR Code Verifikasi" class="qr-img" />` : ''}
        <div class="qr-desc">
          <strong>Verifikasi Keabsahan Dokumen</strong>
          Pindai kode QR untuk memeriksa status pendaftaran resmi ananda di Portal ERA Kids secara real-time.
        </div>
      </div>

      <div class="stamp-block">
        <div class="stamp-sub">Diterbitkan Secara Digital:</div>
        <div class="stamp-name">ERA Kids Management</div>
        <div class="stamp-badge">
          <span>✓</span>
          <span>Terverifikasi Sistem</span>
        </div>
      </div>
    </div>

  </div>

</body>
</html>`;
}

/**
 * Downloads the official, intact registration proof document as a standalone HTML file.
 * Opens seamlessly in all mobile browsers (Chrome, Safari, etc.) and desktop.
 */
export async function downloadRegistrationProofHtml(
  registration: StudentRegistration,
  qrCodeUrl?: string
): Promise<string> {
  const htmlContent = await generateRegistrationProofHtml(registration, qrCodeUrl);
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const safeReg = (registration.regNumber || 'REG').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeName = (registration.nickname || registration.studentName || 'Siswa').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Bukti_Pendaftaran_ERAKids_${safeReg}_${safeName}.html`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return filename;
}

/**
 * Downloads the official registration proof as a single, seamless, high-resolution PNG image.
 * This guarantees the document is 1 whole continuous sheet with ZERO pagination cut-offs.
 */
export async function downloadRegistrationProofImage(
  element: HTMLElement,
  registration: StudentRegistration
): Promise<string> {
  const prevTransform = element.style.transform;
  const prevTransformOrigin = element.style.transformOrigin;
  element.style.transform = 'none';
  element.style.transformOrigin = 'initial';

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0
    });

    element.style.transform = prevTransform;
    element.style.transformOrigin = prevTransformOrigin;

    const imgData = canvas.toDataURL('image/png');
    const safeReg = (registration.regNumber || 'REG').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeName = (registration.nickname || registration.studentName || 'Siswa').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Bukti_Pendaftaran_ERAKids_${safeReg}_${safeName}.png`;

    const link = document.createElement('a');
    link.href = imgData;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return filename;
  } catch (err) {
    element.style.transform = prevTransform;
    element.style.transformOrigin = prevTransformOrigin;
    throw err;
  }
}
