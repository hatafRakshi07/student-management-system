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
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #0f172a; }
            .slip-box { border: 2px solid #024794; padding: 26px; border-radius: 14px; max-width: 780px; margin: 0 auto; background: #fff; position: relative; }
            .header { text-align: center; border-bottom: 2px solid #cbd5e1; padding-bottom: 12px; margin-bottom: 18px; }
            .title { font-size: 22px; font-weight: 900; color: #024794; }
            .subtitle { font-size: 11px; color: #d97706; font-weight: 700; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 12px; margin-bottom: 18px; }
            .field { margin-bottom: 3px; }
            .label { font-weight: 600; color: #475569; display: inline-block; width: 120px; }
            .val { font-weight: 700; color: #0f172a; }
            .table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
            .table th, .table td { border: 1px solid #cbd5e1; padding: 8px 10px; }
            .table th { background: #f8fafc; font-weight: 800; color: #334155; text-transform: uppercase; font-size: 11px; }
            .total-row { font-weight: 800; font-size: 13px; background: #f0fdf4; }
            .footer { margin-top: 36px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; }
            .sig { border-top: 1px solid #64748b; width: 180px; text-align: center; padding-top: 4px; font-weight: 700; }
            @media print {
              .no-print { display: none !important; }
              body { padding: 0; }
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
              className="px-3.5 py-1.5 bg-primary-700 hover:bg-primary-800 text-white rounded-xl font-semibold text-xs flex items-center gap-1.5 shadow-sm transition"
            >
              <Printer className="w-4 h-4" /> Print Salary Slip / PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Payslip Printable Area */}
        <div className="p-6 overflow-y-auto" ref={printRef}>
          <div className="slip-box border-2 border-primary-800/40 rounded-2xl p-6 bg-white dark:bg-gray-900 text-gray-900 dark:text-white relative">
            {/* Watermark Logo */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
              <img src="/logo.png" alt="Aklank Emblem Watermark" className="w-72 h-72 object-contain" />
            </div>

            {/* Header */}
            <div className="header text-center border-b-2 border-gray-200 dark:border-gray-700 pb-4 mb-4">
              <div className="flex items-center justify-center gap-3 mb-1">
                <img src="/logo.png" alt="College Logo" className="w-12 h-12 object-contain" />
                <div>
                  <h2 className="title text-xl font-black text-primary-900 dark:text-primary-400">{college_info?.name || "AKLANK GIRLS P.G. COLLEGE"}</h2>
                  <p className="subtitle text-xs text-amber-600 font-bold">{college_info?.tagline}</p>
                </div>
              </div>
              <p className="text-[11px] text-gray-500">{college_info?.address} | {college_info?.contact}</p>
              <div className="inline-block mt-2 px-3.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs rounded-full border border-emerald-300">
                SALARY SLIP FOR THE MONTH OF {payslip_info?.month_year?.toUpperCase()}
              </div>
            </div>

            {/* Staff Demographic Details Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs mb-4 p-3.5 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-700">
              <div>
                <p className="field"><span className="label text-gray-500 font-semibold inline-block w-28">Employee Name:</span> <span className="val font-bold text-gray-900 dark:text-white">{employee_info?.full_name}</span></p>
                <p className="field"><span className="label text-gray-500 font-semibold inline-block w-28">Employee ID:</span> <span className="val font-bold font-mono">{employee_info?.employee_id}</span></p>
                <p className="field"><span className="label text-gray-500 font-semibold inline-block w-28">Department:</span> <span className="val font-bold">{employee_info?.department}</span></p>
                <p className="field"><span className="label text-gray-500 font-semibold inline-block w-28">Designation:</span> <span className="val font-bold">{employee_info?.designation}</span></p>
              </div>
              <div>
                <p className="field"><span className="label text-gray-500 font-semibold inline-block w-28">Bank Name:</span> <span className="val font-bold">{employee_info?.bank_name}</span></p>
                <p className="field"><span className="label text-gray-500 font-semibold inline-block w-28">Account Number:</span> <span className="val font-bold font-mono">{employee_info?.account_number}</span></p>
                <p className="field"><span className="label text-gray-500 font-semibold inline-block w-28">PF / ESIC No:</span> <span className="val font-bold font-mono">{employee_info?.pf_number}</span></p>
                <p className="field"><span className="label text-gray-500 font-semibold inline-block w-28">Disbursement Date:</span> <span className="val font-bold">{payslip_info?.payment_date}</span></p>
              </div>
            </div>

            {/* Earnings & Deductions Split Table */}
            <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
              {/* Earnings Table */}
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-2 text-[11px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Earnings Particulars</h4>
                <table className="table w-full border-collapse border border-gray-200 dark:border-gray-700">
                  <tbody>
                    <tr>
                      <td className="p-2 text-gray-600">Basic Pay</td>
                      <td className="p-2 text-right font-bold text-gray-900 dark:text-white">₹{salary_breakdown?.earnings?.basic_pay?.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-gray-600">Dearness Allowance (DA)</td>
                      <td className="p-2 text-right font-bold text-gray-900 dark:text-white">₹{salary_breakdown?.earnings?.da?.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-gray-600">House Rent Allowance (HRA)</td>
                      <td className="p-2 text-right font-bold text-gray-900 dark:text-white">₹{salary_breakdown?.earnings?.hra?.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-gray-600">Transport & Medical</td>
                      <td className="p-2 text-right font-bold text-gray-900 dark:text-white">₹{((salary_breakdown?.earnings?.ta || 0) + (salary_breakdown?.earnings?.medical || 0)).toLocaleString()}</td>
                    </tr>
                    <tr className="bg-emerald-50 dark:bg-emerald-950/30 font-bold">
                      <td className="p-2 text-emerald-800 dark:text-emerald-300">GROSS EARNINGS</td>
                      <td className="p-2 text-right text-emerald-700 font-black">₹{salary_breakdown?.earnings?.gross_salary?.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Deductions Table */}
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-2 text-[11px] uppercase tracking-wider text-red-700 dark:text-red-400">Deductions Particulars</h4>
                <table className="table w-full border-collapse border border-gray-200 dark:border-gray-700">
                  <tbody>
                    <tr>
                      <td className="p-2 text-gray-600">Provident Fund (PF)</td>
                      <td className="p-2 text-right font-bold text-red-600">₹{salary_breakdown?.deductions?.pf?.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-gray-600">ESIC Contribution</td>
                      <td className="p-2 text-right font-bold text-red-600">₹{salary_breakdown?.deductions?.esic?.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-gray-600">Professional Tax</td>
                      <td className="p-2 text-right font-bold text-red-600">₹{salary_breakdown?.deductions?.prof_tax?.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-gray-600">Income Tax (TDS)</td>
                      <td className="p-2 text-right font-bold text-red-600">₹{salary_breakdown?.deductions?.income_tax?.toLocaleString()}</td>
                    </tr>
                    <tr className="bg-red-50 dark:bg-red-950/30 font-bold">
                      <td className="p-2 text-red-800 dark:text-red-300">TOTAL DEDUCTIONS</td>
                      <td className="p-2 text-right text-red-700 font-black">₹{salary_breakdown?.deductions?.total_deductions?.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Net Salary Disbursed Banner */}
            <div className="p-4 bg-emerald-500 text-white rounded-2xl flex items-center justify-between shadow-sm mb-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider opacity-90">NET DISBURSED SALARY</p>
                <p className="text-2xl font-black">₹{salary_breakdown?.net_salary?.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 bg-white/20 text-white font-extrabold text-xs rounded-full">PAID & CREDITED</span>
              </div>
            </div>

            {/* Footer Signatures */}
            <div className="footer flex justify-between items-end pt-4 border-t border-gray-200 dark:border-gray-700 text-xs">
              <div>
                <p className="flex items-center gap-1 text-[11px] text-gray-500 font-mono"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Token: {payslip_info?.payslip_token}</p>
                <p className="text-[10px] text-gray-400">Mode: {payslip_info?.payment_mode} | Computer Generated Payslip</p>
              </div>
              <div className="text-center border-t-2 border-gray-500 w-48 pt-1 font-bold text-gray-800 dark:text-gray-200">
                Finance & Accounts Officer
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
