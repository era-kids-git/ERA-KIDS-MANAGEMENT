import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { StudentRegistration } from '../types';

/**
 * Generates and downloads an official A4 PDF of the student's registration proof.
 */
export async function downloadRegistrationProofPdf(
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
      backgroundColor: '#ffffff'
    });

    element.style.transform = prevTransform;
    element.style.transformOrigin = prevTransformOrigin;

    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    // Single continuous page PDF matching exact canvas aspect ratio (NEVER sliced or cut across pages)
    const pageWidth = 210;
    const pageHeight = Math.max(297, (canvas.height * pageWidth) / canvas.width);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pageWidth, pageHeight]
    });

    const printWidth = pageWidth - 16;
    const printHeight = (canvas.height * printWidth) / canvas.width;
    const marginX = 8;
    const marginY = 8;

    pdf.addImage(imgData, 'JPEG', marginX, marginY, printWidth, printHeight);

    const safeReg = (registration.regNumber || 'REG').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeName = (registration.nickname || registration.studentName || 'Siswa').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Bukti_Pendaftaran_ERAKids_${safeReg}_${safeName}.pdf`;

    pdf.save(filename);
    return filename;
  } catch (err) {
    element.style.transform = prevTransform;
    element.style.transformOrigin = prevTransformOrigin;
    throw err;
  }
}
