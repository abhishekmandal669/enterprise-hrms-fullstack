import React from 'react';
import { X, Printer, Award, Building2 } from 'lucide-react';

interface OfferLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  offerData: any;
}

export const OfferLetterModal: React.FC<OfferLetterModalProps> = ({
  isOpen,
  onClose,
  offerData
}) => {
  if (!isOpen || !offerData) return null;

  const {
    company = {},
    candidate = {},
    job = {},
    offer = {},
    compensationBreakdown = {}
  } = offerData;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden my-8 border border-slate-200 print:m-0 print:p-0 print:border-none print:shadow-none">
        {/* Action Controls (Hidden on Print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold">Lexvera Employment Offer Letter</h2>
            <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
              Official & Confidential
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Download PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 sm:p-12 space-y-8 bg-white text-slate-900 font-sans leading-relaxed">
          {/* Corporate Header */}
          <div className="flex items-start justify-between border-b-2 border-indigo-600 pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-lg">
                  L
                </div>
                <div>
                  <h1 className="text-xl font-extrabold tracking-tight text-slate-900 uppercase">
                    {company.name || 'Lexvera Technologies Private Limited'}
                  </h1>
                  <span className="text-[11px] font-semibold text-indigo-600 tracking-wider uppercase">
                    Enterprise Cloud & Workforce Solutions
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 pt-1">
                CIN: {company.cin || 'U72200KA2024PTC189201'} | GSTIN: 29AABCL9821K1ZM
              </p>
              <p className="text-[11px] text-slate-500 max-w-lg">
                {company.registeredAddress || 'Prestige Tech Park, Outer Ring Road, Marathahalli, Bangalore, Karnataka 560103'}
              </p>
            </div>

            <div className="text-right space-y-1">
              <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                LETTER OF OFFER
              </span>
              <p className="text-xs text-slate-600 font-medium pt-1">
                Date: <span className="font-bold text-slate-900">{formatDate(offer.issuedAt || new Date().toISOString())}</span>
              </p>
              <p className="text-xs text-slate-500 font-mono">
                Ref: LEX-OFF/{new Date().getFullYear()}/{candidate.id?.slice(0, 6).toUpperCase()}
              </p>
            </div>
          </div>

          {/* Candidate Salutation */}
          <div className="space-y-1 text-sm">
            <p className="text-slate-500 text-xs">To,</p>
            <p className="font-bold text-base text-slate-900">{candidate.fullName}</p>
            <p className="text-slate-600 text-xs">{candidate.email} | {candidate.phone || 'N/A'}</p>
            {candidate.currentCompany && (
              <p className="text-slate-500 text-xs">Current Org: {candidate.currentCompany}</p>
            )}
          </div>

          {/* Subject Line */}
          <div className="py-2 px-4 bg-indigo-50/60 rounded-lg border border-indigo-100 text-sm font-bold text-indigo-900">
            Subject: Formal Offer of Employment for the position of "{offer.offeredRole || job.title}"
          </div>

          {/* Opening Paragraph */}
          <div className="text-xs text-slate-700 space-y-3 leading-relaxed">
            <p>
              Dear <strong>{candidate.fullName}</strong>,
            </p>
            <p>
              Following our recent discussions and assessment process, the leadership team at <strong>Lexvera Technologies Private Limited</strong> is delighted to offer you the position of <strong>{offer.offeredRole || job.title}</strong> in our <strong>{job.department?.name || 'Engineering'}</strong> department.
            </p>
            <p>
              Your official date of joining will be <strong>{formatDate(offer.joiningDate)}</strong>. You will be based at our <strong>{job.location || 'Bangalore HQ'}</strong> office under our standard enterprise work model.
            </p>
          </div>

          {/* Annexure A: Compensation Breakdown Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-indigo-600" />
                Annexure A — Structured Annual Compensation Package
              </h3>
              <span className="text-xs font-bold text-indigo-700">
                Annual CTC: ₹{(compensationBreakdown.annualCtc || offer.offeredCtc || 0).toLocaleString('en-IN')}
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Salary Component</th>
                    <th className="py-2.5 px-4 text-right">Monthly (INR)</th>
                    <th className="py-2.5 px-4 text-right">Annual (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="py-2 px-4 font-medium">Basic Salary (50%)</td>
                    <td className="py-2 px-4 text-right font-mono">₹{(compensationBreakdown.basic || 0).toLocaleString('en-IN')}</td>
                    <td className="py-2 px-4 text-right font-mono">₹{((compensationBreakdown.basic || 0) * 12).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 font-medium">House Rent Allowance (HRA 40%)</td>
                    <td className="py-2 px-4 text-right font-mono">₹{(compensationBreakdown.hra || 0).toLocaleString('en-IN')}</td>
                    <td className="py-2 px-4 text-right font-mono">₹{((compensationBreakdown.hra || 0) * 12).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 font-medium">Special Allowance</td>
                    <td className="py-2 px-4 text-right font-mono">₹{(compensationBreakdown.specialAllowance || 0).toLocaleString('en-IN')}</td>
                    <td className="py-2 px-4 text-right font-mono">₹{((compensationBreakdown.specialAllowance || 0) * 12).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr className="bg-slate-50/80 font-bold text-slate-900">
                    <td className="py-2.5 px-4">Gross Earnings (A)</td>
                    <td className="py-2.5 px-4 text-right font-mono">₹{(compensationBreakdown.monthlyGross || 0).toLocaleString('en-IN')}</td>
                    <td className="py-2.5 px-4 text-right font-mono">₹{((compensationBreakdown.monthlyGross || 0) * 12).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 text-slate-500">Provident Fund (Employer + Employee statutory)</td>
                    <td className="py-2 px-4 text-right font-mono text-slate-500">₹{(compensationBreakdown.pfEmployee || 1800).toLocaleString('en-IN')}</td>
                    <td className="py-2 px-4 text-right font-mono text-slate-500">₹{((compensationBreakdown.pfEmployee || 1800) * 12).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 text-slate-500">Professional Tax (Karnataka PT)</td>
                    <td className="py-2 px-4 text-right font-mono text-slate-500">₹200</td>
                    <td className="py-2 px-4 text-right font-mono text-slate-500">₹2,400</td>
                  </tr>
                  <tr className="bg-emerald-50/60 font-bold text-emerald-900 border-t border-emerald-200">
                    <td className="py-2.5 px-4">Estimated Take-Home (Net Payout)</td>
                    <td className="py-2.5 px-4 text-right font-mono">₹{(compensationBreakdown.estimatedNetMonthly || 0).toLocaleString('en-IN')}</td>
                    <td className="py-2.5 px-4 text-right font-mono">₹{((compensationBreakdown.estimatedNetMonthly || 0) * 12).toLocaleString('en-IN')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Standard Terms */}
          <div className="space-y-2 text-[11px] text-slate-600 leading-relaxed border-t border-slate-200 pt-4">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">General Employment Terms:</h4>
            <p>1. <strong>Probation & Confirmation:</strong> You will be on probation for a period of 90 days from the date of joining, post which employment will be confirmed based on performance.</p>
            <p>2. <strong>Offer Validity:</strong> This offer is valid until <strong>{formatDate(offer.expiryDate || '2026-10-31')}</strong>. Please sign and return a duplicate copy of this letter as confirmation of your acceptance.</p>
            <p>3. <strong>Background Verification:</strong> This offer is subject to satisfactory verification of professional credentials, educational qualifications, and reference checks.</p>
          </div>

          {/* Signatures Block */}
          <div className="pt-8 border-t-2 border-slate-200 flex items-end justify-between">
            <div className="space-y-2 text-xs">
              <div className="w-40 border-b border-slate-400 pb-8 text-slate-400 font-mono text-[10px]">
                (Candidate Signature)
              </div>
              <p className="font-bold text-slate-900">{candidate.fullName}</p>
              <p className="text-slate-500 text-[11px]">Accepted & Acknowledged</p>
            </div>

            <div className="text-right space-y-1">
              <div className="inline-block p-2 rounded-lg border border-indigo-100 bg-indigo-50/50 mb-2">
                <span className="text-[10px] font-bold text-indigo-700 tracking-wider uppercase block">
                  LEXVERA TECHNOLOGIES PVT LTD
                </span>
                <span className="text-[9px] text-slate-400 block">OFFICIALLY SEALED & VERIFIED</span>
              </div>
              <p className="font-bold text-xs text-slate-900">Dr. Rajeshwari Krishnan</p>
              <p className="text-[11px] text-slate-500">Vice President — Human Capital & Talent</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
