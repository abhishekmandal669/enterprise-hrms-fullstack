import React from 'react';
import {
  X,
  Printer,
  ShieldCheck
} from 'lucide-react';

interface PayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  payslipData: any;
}

export const PayslipModal: React.FC<PayslipModalProps> = ({
  isOpen,
  onClose,
  payslipData
}) => {
  if (!isOpen || !payslipData) return null;

  const {
    month,
    year,
    employee = {},
    metrics = {},
    financials = {},
    runStatus,
    finalizedAt
  } = payslipData;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthName = monthNames[(month || 1) - 1];

  const earnings = financials.earnings || {};
  const deductions = financials.deductions || {};

  const grossEarnings = financials.grossEarnings || 0;
  const totalDeductions = financials.totalDeductions || 0;
  const netPay = financials.netPay || 0;

  const handlePrint = () => {
    window.print();
  };

  // Convert number to Indian words
  const numberToWords = (num: number): string => {
    const a = [
      '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
      'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
    ];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const formatHundreds = (n: number) => {
      let str = '';
      if (n > 99) {
        str += a[Math.floor(n / 100)] + 'Hundred ';
        n %= 100;
      }
      if (n > 19) {
        str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
      } else {
        str += a[n];
      }
      return str;
    };

    let n = Math.floor(num);
    if (n === 0) return 'Zero';

    let str = '';
    const crore = Math.floor(n / 10000000);
    n %= 10000000;
    const lakh = Math.floor(n / 100000);
    n %= 100000;
    const thousand = Math.floor(n / 1000);
    n %= 1000;

    if (crore > 0) str += formatHundreds(crore) + 'Crore ';
    if (lakh > 0) str += formatHundreds(lakh) + 'Lakh ';
    if (thousand > 0) str += formatHundreds(thousand) + 'Thousand ';
    if (n > 0) str += formatHundreds(n);

    return str.trim() + ' Rupees Only';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 print:p-0 print:bg-white">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col print:border-none print:shadow-none print:max-w-none print:w-full">
        
        {/* Top Control Bar (Hidden on Print) */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-2.5 py-0.5 rounded-full border border-indigo-200/60 dark:border-indigo-800/60">
              Salary Statement
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {monthName} {year}
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

        {/* Printable Payslip Document */}
        <div className="p-6 sm:p-8 space-y-6 text-slate-800 dark:text-slate-200 print:p-8 print:text-black">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-md">
                NX
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                  NEXUS TECHNOLOGIES PRIVATE LIMITED
                </h2>
                <p className="text-[11px] text-slate-400">
                  CIN: U72900DL2024PTC123456 &bull; GSTIN: 07AAACL1234F1Z8
                </p>
                <p className="text-[11px] text-slate-400">
                  Nexus Towers, Cyber City, Phase-II, New Delhi - 110037
                </p>
              </div>
            </div>
            <div className="sm:text-right">
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                PAYSLIP FOR {monthName.toUpperCase()} {year}
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Status: <strong className="text-emerald-600 font-semibold">{runStatus || 'FINALIZED'}</strong>
              </span>
              {finalizedAt && (
                <span className="text-[10px] text-slate-400 block font-mono">
                  Disbursed: {new Date(finalizedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          {/* Employee & Attendance Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800/80 text-xs">
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Employee Name</span>
              <span className="font-bold text-slate-900 dark:text-white block mt-0.5">{employee.name || 'N/A'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Employee Code</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono block mt-0.5">{employee.employeeCode || 'N/A'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Designation</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">{employee.designation || 'N/A'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Department</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">{employee.department || 'General'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Bank Account</span>
              <span className="font-mono text-slate-700 dark:text-slate-300 block mt-0.5">HDFC •••• 4092</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">PAN / UAN</span>
              <span className="font-mono text-slate-700 dark:text-slate-300 block mt-0.5">ABCDE1234F / 1009823412</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Worked / Total Days</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">
                {metrics.presentDays || 0} / {metrics.workingDays || 22} Days
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">LOP (Loss of Pay)</span>
              <span className="font-semibold text-rose-600 dark:text-rose-400 block mt-0.5">
                {metrics.unpaidLeaveDays || 0} Days
              </span>
            </div>
          </div>

          {/* Earnings vs Deductions Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
            <div className="grid grid-cols-2 bg-slate-100 dark:bg-slate-800/80 font-bold border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-300">
              <div className="p-3 border-r border-slate-200 dark:border-slate-800">Earnings (In INR)</div>
              <div className="p-3">Deductions (In INR)</div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-800">
              {/* Earnings Column */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                <div className="flex justify-between p-2.5">
                  <span className="text-slate-600 dark:text-slate-400">Basic Salary</span>
                  <span className="font-semibold">₹{(earnings.basic || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between p-2.5">
                  <span className="text-slate-600 dark:text-slate-400">House Rent Allowance (HRA)</span>
                  <span className="font-semibold">₹{(earnings.hra || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between p-2.5">
                  <span className="text-slate-600 dark:text-slate-400">Dearness Allowance (DA)</span>
                  <span className="font-semibold">₹{(earnings.da || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between p-2.5">
                  <span className="text-slate-600 dark:text-slate-400">Special Allowance</span>
                  <span className="font-semibold">₹{(earnings.specialAllowance || 0).toLocaleString('en-IN')}</span>
                </div>
                {(earnings.overtimePay || 0) > 0 && (
                  <div className="flex justify-between p-2.5 bg-amber-50/40 dark:bg-amber-950/20">
                    <span className="text-amber-700 dark:text-amber-400 font-medium">Overtime Compensation ({metrics.overtimeHours || 0} hrs)</span>
                    <span className="font-semibold text-amber-700 dark:text-amber-400">₹{(earnings.overtimePay || 0).toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>

              {/* Deductions Column */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                <div className="flex justify-between p-2.5">
                  <span className="text-slate-600 dark:text-slate-400">Provident Fund (Employee PF)</span>
                  <span className="font-semibold">₹{(deductions.pfEmployee || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between p-2.5">
                  <span className="text-slate-600 dark:text-slate-400">Professional Tax (PT)</span>
                  <span className="font-semibold">₹{(deductions.professionalTax || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between p-2.5">
                  <span className="text-slate-600 dark:text-slate-400">Income Tax (TDS)</span>
                  <span className="font-semibold">₹{(deductions.tds || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between p-2.5">
                  <span className="text-slate-600 dark:text-slate-400">ESI Contribution</span>
                  <span className="font-semibold">₹{(deductions.esi || 0).toLocaleString('en-IN')}</span>
                </div>
                {(deductions.lopDeduction || 0) > 0 && (
                  <div className="flex justify-between p-2.5 bg-rose-50/40 dark:bg-rose-950/20">
                    <span className="text-rose-600 dark:text-rose-400 font-medium">Loss of Pay ({metrics.unpaidLeaveDays || 0} Days)</span>
                    <span className="font-semibold text-rose-600 dark:text-rose-400">₹{(deductions.lopDeduction || 0).toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Total Strip */}
            <div className="grid grid-cols-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 font-bold text-xs">
              <div className="p-3 flex justify-between border-r border-slate-200 dark:border-slate-800">
                <span>Gross Earnings</span>
                <span className="text-indigo-600 dark:text-indigo-400">₹{grossEarnings.toLocaleString('en-IN')}</span>
              </div>
              <div className="p-3 flex justify-between">
                <span>Total Deductions</span>
                <span className="text-rose-600 dark:text-rose-400">₹{totalDeductions.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Net Take-Home Pay Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-emerald-50 dark:from-indigo-950/40 dark:to-emerald-950/40 border border-indigo-200/80 dark:border-indigo-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <span className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                Net Take-Home Pay
              </span>
              <p className="text-xs italic text-slate-600 dark:text-slate-300 mt-0.5">
                {numberToWords(netPay)}
              </p>
            </div>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
              ₹{netPay.toLocaleString('en-IN')}
            </div>
          </div>

          {/* Legal / Verification Footer */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-400 gap-2">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
              <span>Electronically generated and digitally stamped by Nexus Payroll Core.</span>
            </div>
            <span>CONFIDENTIAL &bull; FOR RECIPIENT ONLY</span>
          </div>

        </div>
      </div>
    </div>
  );
};
