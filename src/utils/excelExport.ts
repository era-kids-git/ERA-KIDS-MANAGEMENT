import ExcelJS from 'exceljs';
import { StudentRegistration } from '../types.ts';
import { formatBirthDate } from './dateUtils.ts';

/**
 * Normalizes photo data URL to JPEG/PNG base64 string and extension for ExcelJS
 */
async function getCleanImageData(dataUrl?: string): Promise<{ base64: string; extension: 'jpeg' | 'png' } | null> {
  if (!dataUrl || typeof dataUrl !== 'string' || dataUrl.length < 50) return null;

  // Direct PNG
  if (dataUrl.startsWith('data:image/png')) {
    return { base64: dataUrl, extension: 'png' };
  }
  // Direct JPEG
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) {
    return { base64: dataUrl, extension: 'jpeg' };
  }

  // If it's a data URL of other types (e.g. webp) or image URL, convert via HTML Canvas in browser
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      return await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || 120;
            canvas.height = img.naturalHeight || 150;
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(null);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const jpegData = canvas.toDataURL('image/jpeg', 0.85);
            resolve({ base64: jpegData, extension: 'jpeg' });
          } catch {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = dataUrl;
      });
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * 1. Unduh File Excel Data Siswa Lengkap Termasuk Foto (Tanpa Kelas & Jadwal Latihan)
 */
export async function exportStudentsToExcel(students: StudentRegistration[]): Promise<void> {
  if (students.length === 0) {
    throw new Error('Tidak ada data siswa untuk diekspor.');
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ERA Kids Volleyball Academy';
  workbook.lastModifiedBy = 'Admin ERA Kids';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Data Siswa', {
    views: [{ showGridLines: true }]
  });

  // Setup Column Definitions (Kelas dan Jadwal Latihan dihilangkan sesuai permintaan user)
  worksheet.columns = [
    { header: 'No', key: 'no', width: 6 },
    { header: 'Foto Siswa', key: 'foto', width: 14 },
    { header: 'No. Registrasi', key: 'regNumber', width: 16 },
    { header: 'No. Jersey', key: 'jerseyNumber', width: 13 },
    { header: 'Nama Lengkap Siswa', key: 'studentName', width: 28 },
    { header: 'Panggilan', key: 'nickname', width: 15 },
    { header: 'L/P', key: 'gender', width: 8 },
    { header: 'Tempat Lahir', key: 'birthPlace', width: 18 },
    { header: 'Tanggal Lahir', key: 'birthDate', width: 15 },
    { header: 'Usia (Thn)', key: 'age', width: 12 },
    { header: 'Tinggi (cm)', key: 'height', width: 13 },
    { header: 'Berat (kg)', key: 'weight', width: 13 },
    { header: 'Asal Sekolah', key: 'currentSchool', width: 26 },
    { header: 'Nama Orang Tua', key: 'parentName', width: 24 },
    { header: 'Peran', key: 'parentRole', width: 12 },
    { header: 'WhatsApp', key: 'whatsapp', width: 18 },
    { header: 'Email', key: 'email', width: 26 },
    { header: 'Alamat', key: 'address', width: 32 },
    { header: 'Kelurahan', key: 'subdistrict', width: 18 },
    { header: 'Kecamatan', key: 'district', width: 18 },
    { header: 'Kota/Kabupaten', key: 'city', width: 20 },
    { header: 'Status Siswa', key: 'status', width: 16 },
    { header: 'Catatan Khusus', key: 'specialNotes', width: 28 },
    { header: 'Tanggal Pendaftaran', key: 'createdAt', width: 20 }
  ];

  // Style Header Row
  const headerRow = worksheet.getRow(1);
  headerRow.height = 30;
  headerRow.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' } // Slate 800
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

  // Border Style
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
  };

  for (let i = 1; i <= worksheet.columns.length; i++) {
    const cell = headerRow.getCell(i);
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF475569' } },
      right: { style: 'thin', color: { argb: 'FF475569' } }
    };
  }

  // Add Data Rows & Embed Photos
  for (let idx = 0; idx < students.length; idx++) {
    const student = students[idx];
    const rowIndex = idx + 2; // 1-based, header is row 1

    const row = worksheet.addRow({
      no: idx + 1,
      foto: student.photoUrl ? '' : '(Tidak ada foto)',
      regNumber: student.regNumber,
      jerseyNumber: student.jerseyNumber ? `#${student.jerseyNumber}` : '-',
      studentName: student.studentName,
      nickname: student.nickname || '-',
      gender: student.gender === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)',
      birthPlace: student.birthPlace || '-',
      birthDate: formatBirthDate(student.birthDate),
      age: student.age,
      height: student.height || '-',
      weight: student.weight || '-',
      currentSchool: student.currentSchool,
      parentName: student.parentName,
      parentRole: student.parentRole,
      whatsapp: student.whatsapp,
      email: student.email,
      address: student.address || '-',
      subdistrict: student.subdistrict || '-',
      district: student.district || '-',
      city: student.city || '-',
      status: student.status,
      specialNotes: student.specialNotes || '-',
      createdAt: student.createdAt ? new Date(student.createdAt).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }) : '-'
    });

    row.height = 62; // Sufficient room for thumbnail photo
    row.alignment = { vertical: 'middle', horizontal: 'left' };
    row.font = { name: 'Segoe UI', size: 10 };

    // Set zebra background & cell alignments
    const isEven = idx % 2 === 1;
    const bgArgb = isEven ? 'FFF8FAFC' : 'FFFFFFFF';

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.border = thinBorder;
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgArgb }
      };

      // Center alignments for specific columns
      if ([1, 2, 3, 4, 6, 7, 9, 10, 11, 12, 15, 22, 24].includes(colNumber)) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }
    });

    // Embed student photo if available
    if (student.photoUrl) {
      try {
        const cleanImg = await getCleanImageData(student.photoUrl);
        if (cleanImg) {
          const imageId = workbook.addImage({
            base64: cleanImg.base64,
            extension: cleanImg.extension
          });

          worksheet.addImage(imageId, {
            tl: { col: 1.15, row: rowIndex - 0.9 }, // Col 1 is Column B (Foto)
            ext: { width: 48, height: 58 },
            editAs: 'oneCell'
          });
        }
      } catch (err) {
        console.warn(`Gagal menyematkan foto siswa ${student.studentName}:`, err);
      }
    }
  }

  // Generate and Trigger Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const dateStr = new Date().toISOString().slice(0, 10);
  link.download = `Data_Siswa_ERA_Kids_Lengkap_${dateStr}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

