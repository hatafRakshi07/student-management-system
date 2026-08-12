import React, { useRef } from 'react'
import { Printer, Download, X, DollarSign, ShieldCheck, CheckCircle2 } from 'lucide-react'

export default function PayslipModal({ open, onClose, payslipData }) {
  const printRef = useRef(null)

  if (!open || !payslipData) return null

  const { college_info, payslip_info, employee_info, salary_breakdown } = payslipData

  const handlePrint = () => {
    const printContent = printRef.current
    if (!printContent) return
    const win = window.open('', '_blank')
    win.document.write(`
      <html>
        <head>
          <title>Salary Slip - ${employee_info?.full_name} (${payslip_info?.month_year})</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif; padding: 24px; color: #0f172a; background: #f8fafc; }
            .slip-box { border: 2px solid #024794; padding: 24px; border-radius: 12px; max-width: 800px; margin: 0 auto; background: #fff; position: relative; }
            .header { text-align: center; border-bottom: 2px solid #cbd5e1; padding-bottom: 14px; margin-bottom: 16px; }
            .title { font-size: 20px; font-weight: 800; color: #024794; text-transform: uppercase; }
            .subtitle { font-size: 11px; color: #d97706; font-weight: 700; margin-top: 2px; }
            .badge-month { display: inline-block; margin-top: 8px; padding: 3px 12px; background: #ecfdf5; color: #065f46; font-weight: 800; font-size: 11px; border-radius: 9999px; border: 1px solid #a7f3d0; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 12px; margin-bottom: 16px; background: #f8fafc; padding: 12px 16px; border-radius: 10px; border: 1px solid #e2e8f0; }
            .info-row { display: flex; justify-content: space-between; padding: 2px 0; }
            .info-label { color: #64748b; font-weight: 600; }
            .info-val { font-weight: 700; color: #0f172a; }
            .tables-container { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px; }
            .table-block { border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; }
            .table-head-e { background: #ecfdf5; padding: 8px 10px; font-size: 11px; font-weight: 800; color: #065f46; border-bottom: 1px solid #cbd5e1; text-transform: uppercase; }
            .table-head-d { background: #fef2f2; padding: 8px 10px; font-size: 11px; font-weight: 800; color: #991b1b; border-bottom: 1px solid #cbd5e1; text-transform: uppercase; }
            .slip-table { width: 100%; border-collapse: collapse; font-size: 12px; }
            .slip-table td { padding: 6px 10px; border-bottom: 1px solid #f1f5f9; }
            .slip-table tr:last-child td { border-bottom: none; }
            .slip-table .total-row-e { background: #f0fdf4; font-weight: 800; color: #065f46; border-top: 1px solid #bbf7d0; }
            .slip-table .total-row-d { background: #fef2f2; font-weight: 800; color: #991b1b; border-top: 1px solid #fecaca; }
            .net-banner { background: #10b981; color: #ffffff; padding: 12px 18px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
            .net-banner .amount { font-size: 22px; font-weight: 900; }
            .footer-sig { display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
            .sig-line { border-top: 1px solid #475569; width: 180px; text-align: center; padding-top: 4px; font-weight: 700; color: #1e293b; }
            @media print {
              body { padding: 0; background: #fff; }
              .slip-box { border-color: #000; box-shadow: none; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close(); }, 300)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col max-h-[92vh]">
        {/* Modal Toolbar */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-gray-900 dark:text-white">Official Salary Slip — {payslip_info?.month_year}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-primary-700 hover:bg-primary-800 text-white rounded-xl font-semibold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print Salary Slip / PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Payslip Printable Area */}
        <div className="p-6 overflow-y-auto" ref={printRef}>
          <div className="slip-box border-2 border-primary-800/40 rounded-2xl p-6 bg-white dark:bg-gray-900 text-gray-900 dark:text-white relative">
            {/* Header */}
            <div className="header text-center border-b-2 border-gray-200 dark:border-gray-700 pb-4 mb-4">
              <div className="flex items-center justify-center gap-3 mb-1">
                <img src="/logo.png" alt="" className="w-12 h-12 object-contain" />
                <div>
                  <h2 className="title text-xl font-black text-primary-900 dark:text-primary-400 tracking-wide">{college_info?.name || "AKLANK GIRLS P.G. COLLEGE"}</h2>
                  <p className="subtitle text-xs text-amber-600 font-bold">{college_info?.tagline || "Affiliated to University of Kota"}</p>
                </div>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">{college_info?.address || "Basant Vihar, Kota, Rajasthan - 324009"} | {college_info?.contact || "Ph: 0744-2402123"}</p>
              <div className="badge-month inline-block mt-2 px-3.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs rounded-full border border-emerald-300">
                SALARY SLIP FOR THE MONTH OF {payslip_info?.month_year?.toUpperCase()}
              </div>
            </div>

            {/* Staff Demographic Details Grid */}
            <div className="info-grid grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-xs mb-4 p-4 bg-slate-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="space-y-1.5">
                <div className="info-row flex justify-between border-b border-gray-100 dark:border-gray-700/50 pb-1">
                  <span className="info-label text-gray-500 dark:text-gray-400 font-medium">Employee Name:</span>
                  <span className="info-val font-bold text-gray-900 dark:text-white">{employee_info?.full_name || 'N/A'}</span>
                </div>
                <div className="info-row flex justify-between border-b border-gray-100 dark:border-gray-700/50 pb-1">
                  <span className="info-label text-gray-500 dark:text-gray-400 font-medium">Employee ID:</span>
                  <span className="info-val font-mono font-bold text-gray-900 dark:text-white">{employee_info?.employee_id || 'N/A'}</span>
                </div>
                <div className="info-row flex justify-between border-b border-gray-100 dark:border-gray-700/50 pb-1">
                  <span className="info-label text-gray-500 dark:text-gray-400 font-medium">Department:</span>
                  <span className="info-val font-bold text-gray-900 dark:text-white">{employee_info?.department || 'General'}</span>
                </div>
                <div className="info-row flex justify-between">
                  <span className="info-label text-gray-500 dark:text-gray-400 font-medium">Designation:</span>
                  <span className="info-val font-bold text-gray-900 dark:text-white">{employee_info?.designation || 'Faculty'}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="info-row flex justify-between border-b border-gray-100 dark:border-gray-700/50 pb-1">
                  <span className="info-label text-gray-500 dark:text-gray-400 font-medium">Bank Name:</span>
                  <span className="info-val font-bold text-gray-900 dark:text-white">{employee_info?.bank_name || 'HDFC Bank'}</span>
                </div>
                <div className="info-row flex justify-between border-b border-gray-100 dark:border-gray-700/50 pb-1">
                  <span className="info-label text-gray-500 dark:text-gray-400 font-medium">Account Number:</span>
                  <span className="info-val font-mono font-bold text-gray-900 dark:text-white">{employee_info?.account_number || '••••••••1234'}</span>
                </div>
                <div className="info-row flex justify-between border-b border-gray-100 dark:border-gray-700/50 pb-1">
                  <span className="info-label text-gray-500 dark:text-gray-400 font-medium">PF / ESIC No:</span>
                  <span className="info-val font-mono font-bold text-gray-900 dark:text-white">{employee_info?.pf_number || 'RJ/KOT/98212/001'}</span>
                </div>
                <div className="info-row flex justify-between">
                  <span className="info-label text-gray-500 dark:text-gray-400 font-medium">Disbursement Date:</span>
                  <span className="info-val font-bold text-gray-900 dark:text-white">{payslip_info?.payment_date || 'Current Month'}</span>
                </div>
              </div>
            </div>

            {/* Earnings & Deductions Tables Container */}
            <div className="tables-container grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Earnings Table */}
              <div className="table-block border border-emerald-200 dark:border-emerald-800/60 rounded-xl overflow-hidden bg-white dark:bg-gray-800/30">
                <div className="table-head-e bg-emerald-50 dark:bg-emerald-950/60 px-3 py-2 border-b border-emerald-200 dark:border-emerald-800/60 font-bold text-[11px] uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  Earnings Particulars
                </div>
                <table className="slip-table w-full text-xs">
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                    <tr>
                      <td className="p-2 text-gray-600 dark:text-gray-300">Basic Pay</td>
                      <td className="p-2 text-right font-bold text-gray-900 dark:text-white">₹{salary_breakdown?.earnings?.basic_pay?.toLocaleString() || '0'}</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-gray-600 dark:text-gray-300">Dearness Allowance (DA)</td>
                      <td className="p-2 text-right font-bold text-gray-900 dark:text-white">₹{salary_breakdown?.earnings?.da?.toLocaleString() || '0'}</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-gray-600 dark:text-gray-300">House Rent Allowance (HRA)</td>
                      <td className="p-2 text-right font-bold text-gray-900 dark:text-white">₹{salary_breakdown?.earnings?.hra?.toLocaleString() || '0'}</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-gray-600 dark:text-gray-300">Transport & Medical</td>
                      <td className="p-2 text-right font-bold text-gray-900 dark:text-white">₹{((salary_breakdown?.earnings?.ta || 0) + (salary_breakdown?.earnings?.medical || 0)).toLocaleString()}</td>
                    </tr>
                    <tr className="total-row-e bg-emerald-50/90 dark:bg-emerald-950/40 border-t-2 border-emerald-200 dark:border-emerald-800 font-extrabold">
                      <td className="p-2.5 text-emerald-900 dark:text-emerald-200">GROSS EARNINGS</td>
                      <td className="p-2.5 text-right text-emerald-700 dark:text-emerald-400 font-black text-sm">₹{salary_breakdown?.earnings?.gross_salary?.toLocaleString() || '0'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Deductions Table */}
              <div className="table-block border border-red-200 dark:border-red-800/60 rounded-xl overflow-hidden bg-white dark:bg-gray-800/30">
                <div className="table-head-d bg-red-50 dark:bg-red-950/60 px-3 py-2 border-b border-red-200 dark:border-red-800/60 font-bold text-[11px] uppercase tracking-wider text-red-800 dark:text-red-300">
                  Deductions Particulars
                </div>
                <table className="slip-table w-full text-xs">
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                    <tr>
                      <td className="p-2 text-gray-600 dark:text-gray-300">Provident Fund (PF)</td>
                      <td className="p-2 text-right font-bold text-red-600 dark:text-red-400">₹{salary_breakdown?.deductions?.pf?.toLocaleString() || '0'}</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-gray-600 dark:text-gray-300">ESIC Contribution</td>
                      <td className="p-2 text-right font-bold text-red-600 dark:text-red-400">₹{salary_breakdown?.deductions?.esic?.toLocaleString() || '0'}</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-gray-600 dark:text-gray-300">Professional Tax</td>
                      <td className="p-2 text-right font-bold text-red-600 dark:text-red-400">₹{salary_breakdown?.deductions?.prof_tax?.toLocaleString() || '0'}</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-gray-600 dark:text-gray-300">Income Tax (TDS)</td>
                      <td className="p-2 text-right font-bold text-red-600 dark:text-red-400">₹{salary_breakdown?.deductions?.income_tax?.toLocaleString() || '0'}</td>
                    </tr>
                    <tr className="total-row-d bg-red-50/90 dark:bg-red-950/40 border-t-2 border-red-200 dark:border-red-800 font-extrabold">
                      <td className="p-2.5 text-red-900 dark:text-red-200">TOTAL DEDUCTIONS</td>
                      <td className="p-2.5 text-right text-red-700 dark:text-red-400 font-black text-sm">₹{salary_breakdown?.deductions?.total_deductions?.toLocaleString() || '0'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Net Salary Disbursed Banner */}
            <div className="net-banner p-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl flex items-center justify-between shadow-md mb-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider opacity-90">NET DISBURSED SALARY</p>
                <p className="amount text-2xl font-black">₹{salary_breakdown?.net_salary?.toLocaleString() || '0'}</p>
              </div>
              <div className="text-right">
                <span className="px-3.5 py-1 bg-white/20 backdrop-blur-sm text-white font-extrabold text-xs rounded-full border border-white/30">
                  PAID & CREDITED
                </span>
              </div>
            </div>

            {/* Footer Signatures */}
            <div className="footer-sig flex justify-between items-end pt-4 border-t border-gray-200 dark:border-gray-700 text-xs">
              <div>
                <p className="flex items-center gap-1 text-[11px] text-gray-500 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Token: {payslip_info?.payslip_token || 'AKL-PAY-VERIFIED'}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">Mode: {payslip_info?.payment_mode || 'BANK_TRANSFER'} | Computer Generated Payslip</p>
              </div>
              <div className="sig-line text-center border-t-2 border-gray-600 dark:border-gray-400 w-48 pt-1 font-bold text-gray-800 dark:text-gray-200">
                Finance & Accounts Officer
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
