import React from 'react';
import { X, Printer, Award } from 'lucide-react';

interface RelievingLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  letterData: any;
}

export const RelievingLetterModal: React.FC<RelievingLetterModalProps> = ({
  isOpen,
  onClose,
  letterData
}) => {
  if (!isOpen || !letterData) return null;

  const { employee = {}, exit = {} } = letterData;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const refNumber = `LX/HR/REL/${new Date().getFullYear()}/${employee.employeeCode?.replace(/\D/g, '') || '042'}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 print:p-0 print:bg-white">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col print:border-none print:shadow-none print:max-w-none print:w-full">
        
        {/* Top Control Bar (Hidden on Print) */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
              Official Service Certificate
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Ref: {refNumber}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-lg shadow-2xs transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Certificate Document */}
        <div className="p-8 sm:p-12 space-y-8 text-slate-800 dark:text-slate-200 print:p-10 print:text-black leading-relaxed font-serif">
          
          {/* Letterhead */}
          <div className="flex items-center justify-between pb-6 border-b-2 border-indigo-600 font-sans">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-md">
                LX
              </div>
              <div>
                <h1 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                  LEXVERA TECHNOLOGIES PRIVATE LIMITED
                </h1>
                <p className="text-[11px] text-slate-400 font-normal">
                  CIN: U72900DL2024PTC123456 &bull; GSTIN: 07AAACL1234F1Z8
                </p>
                <p className="text-[11px] text-slate-400 font-normal">
                  Lexvera Towers, Cyber City, Phase-II, New Delhi - 110037
                </p>
              </div>
            </div>
            <div className="text-right text-xs text-slate-500">
              <span className="block font-bold text-slate-800 dark:text-slate-200">HUMAN RESOURCES</span>
              <span className="block font-mono text-[11px]">Date: {exit.issuedDate || new Date().toLocaleDateString('en-GB')}</span>
            </div>
          </div>

          {/* Reference & Title */}
          <div className="text-center space-y-2 pt-2">
            <span className="text-xs font-mono text-slate-500 font-sans tracking-wider block">
              REF: {refNumber}
            </span>
            <h2 className="text-sm sm:text-base font-bold uppercase tracking-widest text-slate-900 dark:text-white font-sans underline underline-offset-8 decoration-indigo-500">
              Relieving & Experience Certificate
            </h2>
            <p className="text-xs italic text-slate-500 pt-1 font-sans">
              TO WHOMSOEVER IT MAY CONCERN
            </p>
          </div>

          {/* Body Content */}
          <div className="space-y-4 text-xs sm:text-sm text-justify font-sans leading-relaxed text-slate-700 dark:text-slate-300">
            <p>
              This is to formally certify that <strong className="text-slate-900 dark:text-white font-semibold">{employee.name}</strong> (Employee Identification Code: <strong className="font-mono text-indigo-600 dark:text-indigo-400">{employee.employeeCode}</strong>) was employed with <strong className="text-slate-900 dark:text-white">Lexvera Technologies Private Limited</strong> from <strong className="text-slate-900 dark:text-white">{formatDate(employee.joiningDate)}</strong> to <strong className="text-slate-900 dark:text-white">{formatDate(exit.lastWorkingDate)}</strong>.
            </p>

            <p>
              During the tenure with our organization, they served in the role of <strong className="text-slate-900 dark:text-white">{employee.designation}</strong> within the <strong className="text-slate-900 dark:text-white">{employee.department}</strong> department. Their responsibilities encompassed vital technical leadership, system architecture, deliverable governance, and peer collaboration.
            </p>

            <p>
              During their term of service with us, we found them to be sincere, diligent, and result-oriented. Their character and professional conduct have been exemplary throughout their employment.
            </p>

            <p>
              They have been formally relieved of their duties effective the close of business hours on <strong className="text-slate-900 dark:text-white">{formatDate(exit.lastWorkingDate)}</strong>, following satisfactory handover of organizational responsibilities, return of digital and hardware assets, and clearance of all Full & Final (FnF) obligations.
            </p>

            <p className="pt-2">
              We express our sincere appreciation for their contributions to Lexvera and wish them continued growth and success in all their future professional endeavors.
            </p>
          </div>

          {/* Signatures & Seal */}
          <div className="pt-12 flex items-end justify-between font-sans border-t border-slate-200 dark:border-slate-800">
            <div className="space-y-1">
              <div className="w-28 h-10 border-b border-dashed border-slate-400 flex items-center justify-center text-xs italic text-indigo-600 font-mono">
                [Digitally Signed]
              </div>
              <strong className="text-xs font-bold text-slate-900 dark:text-white block pt-1">
                Authorized Signatory
              </strong>
              <span className="text-[11px] text-slate-400 block">
                Department of People & Culture
              </span>
              <span className="text-[10px] text-slate-400 block font-semibold">
                Lexvera Technologies Pvt. Ltd.
              </span>
            </div>

            {/* Digital Stamp */}
            <div className="flex items-center gap-2 p-3 rounded-xl border border-indigo-200/80 dark:border-indigo-800/80 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400">
              <Award className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              <div className="text-[10px] leading-tight">
                <span className="font-bold uppercase block tracking-wider">Digitally Verified</span>
                <span className="text-slate-500 font-mono block">Hash: {employee.id?.substring(0, 12)}</span>
                <span className="text-slate-400 block">Security Class 3 Certification</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-[10px] text-slate-400 text-center pt-4 font-sans">
            This certificate is system verified. Any verification queries may be directed to <span className="text-indigo-600 font-mono">hr@lexvera.internal</span> referencing document ID <span className="font-mono">{refNumber}</span>.
          </div>

        </div>
      </div>
    </div>
  );
};
