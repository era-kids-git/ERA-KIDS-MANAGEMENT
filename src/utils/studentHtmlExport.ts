import { StudentRegistration } from '../types.ts';
import { formatBirthDate } from './dateUtils.ts';

export interface StudentHtmlExportOptions {
  title?: string;
  initialStatus?: string; // 'ALL' | 'Register' | 'Diterima' | 'Pembatalan Keanggotaan'
  initialGender?: string; // 'ALL' | 'L' | 'P'
  filteredOnly?: boolean;
  logoSrc?: string;
}

export function generateStudentsDataHtml(
  students: StudentRegistration[],
  options: StudentHtmlExportOptions = {}
): string {
  const printDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const {
    initialStatus = 'ALL',
    initialGender = 'ALL',
    filteredOnly = false,
    logoSrc = 'logo.png'
  } = options;

  // Filter if pre-filtered is requested
  const exportStudents = filteredOnly
    ? students.filter(s => {
        if (initialStatus !== 'ALL' && s.status !== initialStatus) return false;
        if (initialGender !== 'ALL' && s.gender !== initialGender) return false;
        return true;
      })
    : students;

  const totalCount = exportStudents.length;

  const studentsRows = exportStudents.map((s, idx) => {
    const photoTag = s.photoUrl
      ? `<img src="${s.photoUrl}" alt="${s.studentName}" class="student-photo" loading="lazy" />`
      : `<div class="student-avatar-placeholder">${s.gender === 'L' ? '👦' : '👧'}</div>`;

    const statusBadge = s.status === 'Diterima'
      ? `<span class="badge badge-success">Diterima</span>`
      : s.status === 'Register'
      ? `<span class="badge badge-info">Menunggu Verifikasi</span>`
      : `<span class="badge badge-danger">Dibatalkan</span>`;

    const genderBadge = s.gender === 'L'
      ? `<span class="badge badge-gender-l">L (Laki-laki)</span>`
      : `<span class="badge badge-gender-p">P (Perempuan)</span>`;

    const searchBlob = `${s.studentName} ${s.nickname || ''} ${s.regNumber} ${s.jerseyNumber || ''} ${s.currentSchool || ''}`.toLowerCase();

    return `
      <tr data-status="${s.status}" data-gender="${s.gender}" data-search="${searchBlob.replace(/"/g, '&quot;')}">
        <td class="text-center font-bold text-muted row-index">${idx + 1}</td>
        <td class="text-center">${photoTag}</td>
        <td class="text-center">
          <span class="jersey-pill">#${s.jerseyNumber || '-'}</span>
        </td>
        <td class="font-mono font-bold text-center text-primary">${s.regNumber}</td>
        <td>
          <div class="student-name">${s.studentName}</div>
          <div class="student-nickname">Panggilan: <strong>${s.nickname || '-'}</strong></div>
        </td>
        <td class="text-center">${genderBadge}</td>
        <td>
          <div>${s.birthPlace ? `${s.birthPlace}, ` : ''}${formatBirthDate(s.birthDate)}</div>
          <div class="text-muted text-small">${s.age} Tahun</div>
        </td>
        <td class="text-center">
          <div>${s.height ? `${s.height} cm` : '-'}</div>
          <div class="text-muted text-small">${s.weight ? `${s.weight} kg` : '-'}</div>
        </td>
        <td>${s.currentSchool || '-'}</td>
        <td class="text-center">${statusBadge}</td>
        <td class="text-notes">${s.specialNotes || s.adminNotes || '-'}</td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DATA SISWA ERA Kids - Laporan Profil & Status Siswa</title>
  <style>
    :root {
      --primary: #4338ca;
      --primary-dark: #312e81;
      --slate-800: #1e293b;
      --slate-600: #475569;
      --slate-100: #f1f5f9;
      --border: #e2e8f0;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      margin: 0;
      padding: 20px;
      font-size: 12px;
      line-height: 1.4;
    }
    .container {
      max-width: 1380px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05);
      border: 1px solid var(--border);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
      color: #ffffff;
      padding: 20px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .header-title-block h1 {
      margin: 0 0 4px 0;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.02em;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .header-title-block p {
      margin: 0;
      font-size: 12px;
      color: #94a3b8;
    }
    .header-badge {
      background: #3b82f6;
      color: #ffffff;
      padding: 6px 14px;
      border-radius: 9999px;
      font-weight: 700;
      font-size: 12px;
    }
    .filter-panel {
      padding: 14px 24px;
      background: #f1f5f9;
      border-bottom: 1px solid var(--border);
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .filter-group {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
    }
    .filter-label {
      font-size: 11px;
      font-weight: 700;
      color: #334155;
    }
    .filter-select {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 600;
      color: #1e293b;
      cursor: pointer;
      outline: none;
    }
    .filter-select:focus {
      border-color: #4338ca;
      box-shadow: 0 0 0 2px rgba(67, 56, 202, 0.15);
    }
    .filter-search {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 11.5px;
      color: #1e293b;
      width: 180px;
      outline: none;
    }
    .filter-search:focus {
      border-color: #4338ca;
      box-shadow: 0 0 0 2px rgba(67, 56, 202, 0.15);
    }
    .filter-stats {
      font-size: 11.5px;
      color: #475569;
      background: #ffffff;
      padding: 6px 12px;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
      font-weight: 600;
    }
    .filter-stats strong {
      color: #4338ca;
    }
    .btn-reset {
      background: #e2e8f0;
      color: #334155;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-reset:hover {
      background: #cbd5e1;
    }
    .btn-print {
      background: #4338ca;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 12px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.15s ease;
    }
    .btn-print:hover {
      background: #3730a3;
    }
    .table-wrapper {
      overflow-x: auto;
      width: 100%;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    th {
      background: #1e293b;
      color: #ffffff;
      padding: 10px 10px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      border-bottom: 2px solid #0f172a;
      white-space: nowrap;
    }
    td {
      padding: 8px 10px;
      border-bottom: 1px solid var(--border);
      vertical-align: middle;
      font-size: 11.5px;
    }
    tr:nth-child(even) {
      background: #fcfdfe;
    }
    tr:hover {
      background: #f1f5f9;
    }
    .student-photo {
      width: 42px;
      height: 52px;
      object-fit: cover;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
      display: inline-block;
    }
    .student-avatar-placeholder {
      width: 42px;
      height: 52px;
      background: #e2e8f0;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      border: 1px solid #cbd5e1;
    }
    .jersey-pill {
      display: inline-block;
      padding: 2px 7px;
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fde68a;
      border-radius: 4px;
      font-weight: 800;
      font-size: 11px;
    }
    .student-name {
      font-weight: 700;
      color: #0f172a;
      font-size: 12.5px;
    }
    .student-nickname {
      color: #64748b;
      font-size: 10.5px;
      margin-top: 2px;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 9999px;
      font-weight: 700;
      font-size: 10px;
      white-space: nowrap;
    }
    .badge-success { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
    .badge-info { background: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe; }
    .badge-danger { background: #ffe4e6; color: #be123c; border: 1px solid #fecdd3; }
    .badge-gender-l { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; font-weight: bold; }
    .badge-gender-p { background: #fce7f3; color: #be185d; border: 1px solid #fbcfe8; font-weight: bold; }
    .text-center { text-align: center; }
    .font-bold { font-weight: 700; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .text-primary { color: #4338ca; }
    .text-muted { color: #64748b; }
    .text-small { font-size: 10px; }
    .text-notes { color: #475569; font-size: 10.5px; max-width: 180px; }
    .empty-state {
      padding: 36px 20px;
      text-align: center;
      color: #94a3b8;
      font-size: 13px;
      font-weight: 600;
      display: none;
    }
    .footer {
      padding: 14px 24px;
      background: #f8fafc;
      border-top: 1px solid var(--border);
      text-align: center;
      color: #94a3b8;
      font-size: 11px;
    }
    @media print {
      body { background: #ffffff; padding: 0; font-size: 10px; }
      .container { border: none; box-shadow: none; max-width: 100%; border-radius: 0; }
      .no-print { display: none !important; }
      .header { background: #ffffff !important; color: #000000 !important; border-bottom: 2px solid #000000; padding: 10px 0; }
      .header-title-block h1 { color: #000000 !important; font-size: 16px; }
      .header-title-block p { color: #475569 !important; }
      .header-badge { border: 1px solid #000000; color: #000000; background: #ffffff; }
      th { background: #f1f5f9 !important; color: #000000 !important; border: 1px solid #94a3b8 !important; font-size: 9px; }
      td { border: 1px solid #cbd5e1 !important; font-size: 9px; padding: 4px 6px; }
      .student-photo, .student-avatar-placeholder { width: 34px; height: 42px; }
      .jersey-pill, .badge { border: 1px solid #64748b !important; }
      tr[style*="display: none"] { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-title-block">
        <h1><img src="${logoSrc}" alt="Logo" style="width: 36px; height: 36px; object-fit: contain; vertical-align: middle; display: inline-block; margin-right: 10px;" onerror="if(!this.getAttribute('data-err')){this.setAttribute('data-err','1');this.src='logo.png';}" />DATA SISWA ERA Kids</h1>
        <p>Buku Profil & Direktori Siswa ERA Kids • Dicetak pada: <strong>${printDate}</strong></p>
      </div>
      <div>
        <span class="header-badge" id="totalBadge">Total Terdata: ${totalCount} Siswa</span>
      </div>
    </div>

    <!-- Interactive Filter Toolbar (No-Print) -->
    <div class="filter-panel no-print">
      <div class="filter-group">
        <div>
          <span class="filter-label">Status Pendaftaran:</span>
          <select id="filterStatus" class="filter-select" onchange="applyFilters()">
            <option value="ALL">Semua Status</option>
            <option value="Register" ${initialStatus === 'Register' ? 'selected' : ''}>Menunggu Verifikasi</option>
            <option value="Diterima" ${initialStatus === 'Diterima' ? 'selected' : ''}>Diterima</option>
            <option value="Pembatalan Keanggotaan" ${initialStatus === 'Pembatalan Keanggotaan' ? 'selected' : ''}>Dibatalkan</option>
          </select>
        </div>

        <div>
          <span class="filter-label">Jenis Kelamin:</span>
          <select id="filterGender" class="filter-select" onchange="applyFilters()">
            <option value="ALL">Semua Gender</option>
            <option value="L" ${initialGender === 'L' ? 'selected' : ''}>Laki-laki (L)</option>
            <option value="P" ${initialGender === 'P' ? 'selected' : ''}>Perempuan (P)</option>
          </select>
        </div>

        <div>
          <span class="filter-label">Pencarian:</span>
          <input
            type="text"
            id="filterSearch"
            class="filter-search"
            placeholder="Cari nama, no. reg..."
            oninput="applyFilters()"
          />
        </div>

        <button class="btn-reset" onclick="resetFilters()">Reset Filter</button>
      </div>

      <div class="filter-group">
        <div class="filter-stats">
          Menampilkan: <strong id="visibleCount">${totalCount}</strong> dari <strong>${totalCount}</strong> siswa
        </div>
        <button class="btn-print" onclick="window.print()">🖨️ Cetak / Simpan PDF</button>
      </div>
    </div>

    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th style="width: 32px;" class="text-center">No</th>
            <th style="width: 50px;" class="text-center">Foto</th>
            <th style="width: 48px;" class="text-center">Jersey</th>
            <th style="width: 100px;" class="text-center">No. Reg</th>
            <th>Nama Siswa & Panggilan</th>
            <th style="width: 90px;" class="text-center">Jenis Kelamin</th>
            <th>Tempat & Tanggal Lahir (Usia)</th>
            <th style="width: 70px;" class="text-center">TB / BB</th>
            <th>Sekolah Asal</th>
            <th style="width: 100px;" class="text-center">Status</th>
            <th>Catatan Khusus</th>
          </tr>
        </thead>
        <tbody id="studentsTableBody">
          ${studentsRows}
        </tbody>
      </table>
      <div id="emptyState" class="empty-state">
        Tidak ada data siswa yang cocok dengan filter yang dipilih.
      </div>
    </div>

    <div class="footer">
      Laporan Resmi Data Siswa ERA Kids Volleyball Academy • Dilengkapi filter interaktif status pendaftaran & jenis kelamin
    </div>
  </div>

  <script>
    function applyFilters() {
      const status = document.getElementById('filterStatus').value;
      const gender = document.getElementById('filterGender').value;
      const q = (document.getElementById('filterSearch').value || '').toLowerCase().trim();

      const tbody = document.getElementById('studentsTableBody');
      const rows = tbody.querySelectorAll('tr');
      const emptyState = document.getElementById('emptyState');
      let visibleCount = 0;

      rows.forEach(row => {
        const rowStatus = row.getAttribute('data-status');
        const rowGender = row.getAttribute('data-gender');
        const searchBlob = row.getAttribute('data-search') || '';

        const matchStatus = (status === 'ALL') || (rowStatus === status);
        const matchGender = (gender === 'ALL') || (rowGender === gender);
        const matchSearch = !q || searchBlob.includes(q);

        if (matchStatus && matchGender && matchSearch) {
          row.style.display = '';
          visibleCount++;
        } else {
          row.style.display = 'none';
        }
      });

      // Update sequential numbering on visible rows
      let idx = 1;
      rows.forEach(row => {
        if (row.style.display !== 'none') {
          const idxEl = row.querySelector('.row-index');
          if (idxEl) idxEl.textContent = idx++;
        }
      });

      document.getElementById('visibleCount').textContent = visibleCount;
      if (emptyState) {
        emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
      }
    }

    function resetFilters() {
      document.getElementById('filterStatus').value = 'ALL';
      document.getElementById('filterGender').value = 'ALL';
      document.getElementById('filterSearch').value = '';
      applyFilters();
    }

    // Run initial filter on load if pre-set
    window.addEventListener('DOMContentLoaded', () => {
      applyFilters();
    });
  </script>
</body>
</html>`;
}

export async function downloadStudentsDataHtmlFile(
  students: StudentRegistration[],
  options: StudentHtmlExportOptions = {}
): Promise<void> {
  if (students.length === 0) {
    alert('Tidak ada data siswa untuk diunduh.');
    return;
  }

  // Attempt to load logo.png as Base64 Data URL so the saved HTML file displays the logo offline/standalone
  let resolvedLogoSrc = options.logoSrc || 'logo.png';
  try {
    const res = await fetch('/logo.png');
    if (res.ok) {
      const blob = await res.blob();
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve('logo.png');
        reader.readAsDataURL(blob);
      });
      if (dataUrl && dataUrl.startsWith('data:')) {
        resolvedLogoSrc = dataUrl;
      }
    }
  } catch {
    resolvedLogoSrc = options.logoSrc || 'logo.png';
  }

  const htmlContent = generateStudentsDataHtml(students, {
    ...options,
    logoSrc: resolvedLogoSrc
  });
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  const statusSuffix = options.initialStatus && options.initialStatus !== 'ALL'
    ? `_${options.initialStatus}`
    : '';
  const genderSuffix = options.initialGender && options.initialGender !== 'ALL'
    ? `_${options.initialGender}`
    : '';

  link.download = `DATA_SISWA_ERA_Kids${statusSuffix}${genderSuffix}_${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
