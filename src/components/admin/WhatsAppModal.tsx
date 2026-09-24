import React, { useState, useEffect } from 'react';
import { 
  X, 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  Copy, 
  ExternalLink,
  Smartphone,
  Settings2,
  RotateCcw,
  Edit3,
  Info
} from 'lucide-react';
import { StudentRegistration, WhatsAppNotificationType } from '../../types.ts';
import { 
  generateWhatsAppMessage, 
  normalizeWhatsAppNumber,
  getStoredWhatsAppTemplates,
  saveStoredWhatsAppTemplates,
  resetStoredWhatsAppTemplates,
  DEFAULT_WHATSAPP_TEMPLATES,
  WhatsAppTemplatesMap,
  interpolateTemplate
} from '../../utils/whatsapp.ts';
import { useRealtime } from '../../context/RealtimeContext.tsx';

interface WhatsAppModalProps {
  student: StudentRegistration | null;
  onClose: () => void;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({ student, onClose }) => {
  const { sendWhatsAppNotification, updateRegistration } = useRealtime();

  // Active view: 'compose' (tulis & kirim pesan siswa) or 'templates' (edit template bawaan)
  const [activeTab, setActiveTab] = useState<'compose' | 'templates'>('compose');

  // Compose State
  const [notificationType, setNotificationType] = useState<WhatsAppNotificationType>('REGISTRATION_CONFIRMATION');
  const [messageDraft, setMessageDraft] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [isLogged, setIsLogged] = useState(false);

  // Template Manager State
  const [editingTemplateKey, setEditingTemplateKey] = useState<keyof WhatsAppTemplatesMap>('REGISTRATION_CONFIRMATION');
  const [templateDrafts, setTemplateDrafts] = useState<WhatsAppTemplatesMap>(() => getStoredWhatsAppTemplates());
  const [templateSaveSuccess, setTemplateSaveSuccess] = useState(false);

  // Refresh messageDraft whenever notificationType or student changes
  useEffect(() => {
    if (student) {
      const generated = generateWhatsAppMessage(student, notificationType);
      setMessageDraft(generated.message);
      setIsLogged(false);
    }
  }, [student, notificationType]);

  if (!student) return null;

  const cleanPhone = normalizeWhatsAppNumber(student.whatsapp);
  const encodedMessage = encodeURIComponent(messageDraft);
  const waLink = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`;

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(messageDraft);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleResetToTemplate = () => {
    const generated = generateWhatsAppMessage(student, notificationType);
    setMessageDraft(generated.message);
  };

  const handleLogAndSend = async () => {
    let title = 'Notifikasi Resmi ERA Kids';
    if (notificationType === 'REGISTRATION_CONFIRMATION') title = 'Konfirmasi Pendaftaran';
    else if (notificationType === 'ACCEPTANCE_WELCOME') title = 'Pengumuman Resmi Siswa Diterima';
    else if (notificationType === 'MEMBERSHIP_CANCELLATION') title = 'Pembatalan Keanggotaan';
    else if (notificationType === 'CUSTOM') title = 'Pesan Khusus Manajemen';

    // 1. Catat notifikasi ke database
    await sendWhatsAppNotification(student.id, {
      type: notificationType,
      title,
      message: messageDraft,
      targetNumber: student.whatsapp,
      sentBy: 'Admin Volleyball Training'
    });

    // 2. Sinkronkan status otomatis bila sesuai
    if (notificationType === 'ACCEPTANCE_WELCOME' && student.status !== 'Diterima') {
      await updateRegistration(student.id, {
        status: 'Diterima'
      });
    } else if (notificationType === 'MEMBERSHIP_CANCELLATION' && student.status !== 'Pembatalan Keanggotaan') {
      await updateRegistration(student.id, {
        status: 'Pembatalan Keanggotaan'
      });
    }

    setIsLogged(true);

    // 3. Buka WhatsApp Web
    window.open(waLink, '_blank', 'noopener,noreferrer');
  };

  // Handler untuk menyimpan template bawaan
  const handleSaveCustomTemplates = () => {
    saveStoredWhatsAppTemplates(templateDrafts);
    setTemplateSaveSuccess(true);
    // Regenerate current draft if same type
    if (editingTemplateKey === notificationType) {
      setMessageDraft(interpolateTemplate(templateDrafts[editingTemplateKey], student));
    }
    setTimeout(() => setTemplateSaveSuccess(false), 3000);
  };

  // Handler reset template ke bawaan pabrik
  const handleResetTemplatesToFactory = () => {
    if (confirm('Kembalikan semua template pesan ke teks bawaan awal sistem?')) {
      const resetMap = resetStoredWhatsAppTemplates();
      setTemplateDrafts(resetMap);
      if (editingTemplateKey === notificationType) {
        setMessageDraft(interpolateTemplate(resetMap[editingTemplateKey], student));
      }
      setTemplateSaveSuccess(true);
      setTimeout(() => setTemplateSaveSuccess(false), 3000);
    }
  };

  const insertVariableTag = (tag: string) => {
    setTemplateDrafts(prev => ({
      ...prev,
      [editingTemplateKey]: (prev[editingTemplateKey] || '') + tag
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto overflow-x-hidden">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-full sm:max-w-4xl shadow-xl border-0 sm:border border-slate-200 overflow-hidden my-0 sm:my-6 max-h-[96vh] sm:max-h-[90vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-white/10 rounded-xl shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-lg truncate">Kirim Notifikasi WhatsApp Orang Tua</h3>
              <p className="text-xs text-emerald-100 truncate">
                Penerima: {student.parentName} ({student.parentRole}) • Siswa: {student.studentName} (#{student.jerseyNumber || '-'})
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Compose vs Template Settings */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-4 sm:px-6 pt-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('compose')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'compose'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>1. Kirim & Edit Pesan Siswa</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'templates'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>2. Pengaturan Template Bawaan (Default)</span>
          </button>
        </div>

        {/* TAB 1: COMPOSE & LIVE EDIT */}
        {activeTab === 'compose' && (
          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 overflow-y-auto overflow-x-hidden flex-1">
            
            {/* Left Column: Template Selection & Live Draft Editor */}
            <div className="md:col-span-6 space-y-4 flex flex-col">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Pilih Jenis Pesan:
                  </label>
                  <button
                    type="button"
                    onClick={() => setActiveTab('templates')}
                    className="text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
                  >
                    <Settings2 className="w-3 h-3" />
                    Ubah Template Bawaan
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      type: 'REGISTRATION_CONFIRMATION' as WhatsAppNotificationType,
                      label: 'Konfirmasi Registrasi',
                      shortDesc: 'Kirim bukti formulir masuk'
                    },
                    {
                      type: 'ACCEPTANCE_WELCOME' as WhatsAppNotificationType,
                      label: 'Siswa Diterima',
                      shortDesc: 'Resmi diterima di kelas'
                    },
                    {
                      type: 'MEMBERSHIP_CANCELLATION' as WhatsAppNotificationType,
                      label: 'Pembatalan Member',
                      shortDesc: 'Konfirmasi pelepasan jersey'
                    },
                    {
                      type: 'CUSTOM' as WhatsAppNotificationType,
                      label: 'Pesan Khusus / Bebas',
                      shortDesc: 'Pesan manual admin'
                    }
                  ].map(item => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setNotificationType(item.type)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        notificationType === item.type
                          ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-200'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-xs text-slate-900 truncate">{item.label}</span>
                        {notificationType === item.type && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight truncate">{item.shortDesc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Editable Textarea for the Admin */}
              <div className="flex-1 flex flex-col min-h-[220px]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                    Edit Isi Chat Sebelum Dikirim:
                  </span>
                  <button
                    type="button"
                    onClick={handleResetToTemplate}
                    className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
                    title="Kembalikan pesan ke template bawaan"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Muat Ulang Template
                  </button>
                </div>
                
                <textarea
                  value={messageDraft}
                  onChange={e => setMessageDraft(e.target.value)}
                  rows={8}
                  placeholder="Ketik atau sesuaikan pesan WhatsApp di sini..."
                  className="w-full flex-1 p-3 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 rounded-xl text-xs leading-relaxed font-sans transition-all resize-y"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  💡 Tip: Anda dapat langsung mengubah salam, jadwal, atau menambahkan catatan khusus sebelum menekan tombol kirim.
                </p>
              </div>

              {/* Recipient Details */}
              <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-700 mr-1.5">Kirim ke:</span>
                  <span className="font-mono text-slate-900 font-bold">{student.whatsapp}</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  (+{cleanPhone})
                </span>
              </div>
            </div>

            {/* Right Column: WhatsApp Live Mockup Preview */}
            <div className="md:col-span-6 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  Pratinjau Tampilan di WhatsApp
                </span>
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {isCopied ? 'Tersalin!' : 'Salin Teks'}
                </button>
              </div>

              {/* WhatsApp Chat Bubble Mockup */}
              <div className="flex-1 bg-[#efeae2] p-4 rounded-2xl border border-slate-300 relative flex flex-col justify-between min-h-[280px] sm:min-h-[340px] overflow-hidden shadow-inner">
                {/* WhatsApp chat bubble */}
                <div className="bg-white rounded-2xl rounded-tr-xs p-3.5 shadow-xs border border-emerald-100 max-w-full text-slate-800 text-xs leading-relaxed whitespace-pre-wrap font-sans select-text">
                  {messageDraft}
                  <div className="flex justify-end items-center gap-1 mt-2 text-[10px] text-slate-400">
                    <span>{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="text-emerald-500 font-bold">✓✓</span>
                  </div>
                </div>

                {isLogged && (
                  <div className="mt-3 p-2 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Notifikasi berhasil dicatat ke riwayat log database siswa!
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Tutup
                </button>

                <button
                  type="button"
                  id="btn-dispatch-whatsapp"
                  onClick={handleLogAndSend}
                  className="flex-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-emerald-200 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Kirim via WhatsApp Web
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DEFAULT TEMPLATE SETTINGS */}
        {activeTab === 'templates' && (
          <div className="p-4 sm:p-6 overflow-y-auto overflow-x-hidden flex-1 space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 sm:p-4 text-xs text-emerald-950 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-bold text-xs mb-0.5">Pengaturan Format Pesan Bawaan (Default Template)</h5>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Ubah kata-kata bawaan di bawah ini. Teks yang Anda simpan di sini akan otomatis digunakan setiap kali membuka menu kirim WhatsApp untuk semua siswa. Anda dapat menggunakan kata kunci dinamis (placeholder) agar nama, no. registrasi, dan data siswa terisi otomatis.
                </p>
              </div>
            </div>

            {/* Template Selector Pills */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {[
                { key: 'REGISTRATION_CONFIRMATION' as const, label: '1. Konfirmasi Registrasi' },
                { key: 'ACCEPTANCE_WELCOME' as const, label: '2. Siswa Diterima' },
                { key: 'MEMBERSHIP_CANCELLATION' as const, label: '3. Pembatalan Keanggotaan' },
                { key: 'CUSTOM' as const, label: '4. Pesan Khusus' }
              ].map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setEditingTemplateKey(t.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    editingTemplateKey === t.key
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Template Text Editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  Isi Template: <span className="text-emerald-700 font-semibold">{editingTemplateKey}</span>
                </span>
                <span className="text-[10px] text-slate-400">
                  Gunakan format WhatsApp standar seperti *teks tebal* atau _teks miring_
                </span>
              </div>

              <textarea
                rows={10}
                value={templateDrafts[editingTemplateKey] || ''}
                onChange={e => {
                  const val = e.target.value;
                  setTemplateDrafts(prev => ({
                    ...prev,
                    [editingTemplateKey]: val
                  }));
                }}
                className="w-full p-3.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 rounded-xl text-xs leading-relaxed font-mono"
              />
            </div>

            {/* Variable Tags Inserter */}
            <div>
              <span className="block text-[11px] font-bold text-slate-700 mb-1.5">
                Klik variabel untuk menyisipkan ke dalam template:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { tag: '{parentName}', label: 'Nama Orang Tua' },
                  { tag: '{studentName}', label: 'Nama Siswa' },
                  { tag: '{nickname}', label: 'Nama Panggilan' },
                  { tag: '{regNumber}', label: 'No. Registrasi' },
                  { tag: '{jerseyNumber}', label: 'No. Jersey' },
                  { tag: '{gender}', label: 'Jenis Kelamin' },
                  { tag: '{status}', label: 'Status' },
                  { tag: '{branch}', label: 'Cabang/Kelas' },
                  { tag: '{preferredSchedule}', label: 'Jadwal' },
                  { tag: '{adminWhatsApp}', label: 'No. WA Admin (081519660119)' }
                ].map(v => (
                  <button
                    key={v.tag}
                    type="button"
                    onClick={() => insertVariableTag(v.tag)}
                    className="px-2 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 rounded-md text-[11px] font-mono text-slate-700 transition-colors"
                    title={`Sisipkan ${v.label}`}
                  >
                    + {v.tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Controls for Template Settings */}
            <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleResetTemplatesToFactory}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 self-start sm:self-center"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Kembalikan Semua Template ke Standar Pabrik
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('compose')}
                  className="flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Kembali ke Kirim Pesan
                </button>

                <button
                  type="button"
                  onClick={handleSaveCustomTemplates}
                  className="flex-1 sm:flex-initial px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Simpan Template Default
                </button>
              </div>
            </div>

            {templateSaveSuccess && (
              <div className="p-3 bg-emerald-100 text-emerald-800 text-xs font-medium rounded-xl flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Template berhasil disimpan! Pesan berikutnya akan otomatis menggunakan format ini.
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
