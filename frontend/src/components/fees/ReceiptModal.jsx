import React, { useRef } from 'react'
import { Printer, Download, X, CheckCircle, ShieldCheck } from 'lucide-react'

export default function ReceiptModal({ open, onClose, receiptData }) {
  const printRef = useRef(null)

  if (!open || !receiptData) return null

  const { college_info, receipt_info, student_info, fee_breakdown, remarks } = receiptData

  const handlePrint = () => {
    const printContent = printRef.current
    if (!printContent) return
    const win = window.open('', '_blank')
    win.document.write(`
      <html>
        <head>
          <title>Fee Receipt - ${receipt_info?.receipt_no}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #1e293b; }
            .receipt-box { border: 2px solid #991b1b; padding: 24px; border-radius: 12px; max-width: 750px; margin: 0 auto; background: #fff; }
            .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 16px; }
            .title { font-size: 22px; font-weight: 800; color: #7f1d1d; letter-spacing: 0.5px; }
            .subtitle { font-size: 11px; color: #64748b; margin-top: 2px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px; margin-bottom: 16px; }
            .field { margin-bottom: 4px; }
            .label { font-weight: 600; color: #475569; display: inline-block; width: 110px; }
            .val { font-weight: 700; color: #0f172a; }
            .table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
            .table th, .table td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
            .table th { background: #f8fafc; font-weight: 700; color: #334155; }
            .total-row { font-weight: 800; font-size: 15px; background: #fef2f2; }
            .footer { margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 12px; }
            .sig { border-top: 1px solid #94a3b8; width: 180px; text-align: center; padding-top: 4px; font-weight: 600; }
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
      <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]">
        {/* Modal Toolbar */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-gray-900 dark:text-white">Official Fee Receipt #{receipt_info?.receipt_no}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-primary-700 hover:bg-primary-800 text-white rounded-xl font-semibold text-xs flex items-center gap-1.5 shadow-sm transition"
            >
              <Printer className="w-4 h-4" /> Print / Download PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="p-6 overflow-y-auto" ref={printRef}>
          <div className="receipt-box border-2 border-primary-800/30 rounded-2xl p-6 bg-white dark:bg-gray-900 text-gray-900 dark:text-white relative">
            {/* Watermark Logo */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none">
              <img src="/logo.png" alt="Aklank Logo Watermark" className="w-72 h-72 object-contain" />
            </div>

            {/* Header */}
            <div className="header text-center border-b-2 border-gray-100 dark:border-gray-800 pb-4 mb-5">
              <div className="flex items-center justify-center gap-3 mb-2">
                <img src="/logo.png" alt="College Logo" className="w-12 h-12 object-contain" />
                <div>
                  <h2 className="title text-xl font-black text-primary-900 dark:text-primary-400 tracking-wide">{college_info?.name || "AKLANK GIRLS P.G. COLLEGE"}</h2>
                  <p className="subtitle text-xs text-amber-600 font-semibold">{college_info?.tagline}</p>
                </div>
              </div>
              <p className="text-[11px] text-gray-500">{college_info?.address} | {college_info?.contact}</p>
              <div className="inline-block mt-2 px-3 py-0.5 bg-primary-100 dark:bg-primary-900/40 text-primary-800 dark:text-primary-300 font-bold text-xs rounded-full border border-primary-200">
                OFFICIAL FEE RECEIPT
              </div>
            </div>

            {/* Receipt Details Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs mb-5">
              <div>
                <p className="field"><span className="label text-gray-500 font-semibold inline-block w-24">Receipt No:</span> <span className="val font-bold">{receipt_info?.receipt_no}</span></p>
                <p className="field"><span className="label text-gray-500 font-semibold inline-block w-24">Voucher No:</span> <span className="val font-bold">{receipt_info?.voucher_no}</span></p>
                <p className="field"><span className="label text-gray-500 font-semibold inline-block w-24">Date:</span> <span className="val font-bold">{receipt_info?.date}</span></p>
                <p className="field"><span className="label text-gray-500 font-semibold inline-block w-24">Session:</span> <span className="val font-bold">{receipt_info?.session}</span></p>
              </div>
              <div>
                <p className="field"><span className="label text-gray-500 font-semibold inline-block w-24">Student Name:</span> <span className="val font-bold">{student_info?.student_name}</span></p>
                <p className="field"><span className="label text-gray-500 font-semibold inline-block w-24">Father Name:</span> <span className="val font-bold">{student_info?.father_name}</span></p>
                <p className="field"><span className="label text-gray-500 font-semibold inline-block w-24">Scholar No:</span> <span className="val font-bold">{student_info?.scholar_no}</span></p>
                <p className="field"><span className="label text-gray-500 font-semibold inline-block w-24">Course / Class:</span> <span className="val font-bold">{student_info?.class_name} ({student_info?.course})</span></p>
              </div>
            </div>

            {/* Particulars Table */}
            <table className="table w-full border-collapse border border-gray-200 dark:border-gray-700 text-xs mb-4">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                  <th className="border border-gray-200 dark:border-gray-700 p-2.5 text-left">Particulars / Payment Details</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-2.5 text-center">Payment Mode</th>
                  <th className="border border-gray-200 dark:border-gray-700 p-2.5 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-200 dark:border-gray-700 p-2.5">
                    <p className="font-semibold text-gray-900 dark:text-white">Academic Fee Payment</p>
                    <p className="text-[11px] text-gray-500">Ref / Txn ID: {receipt_info?.transaction_id}</p>
                  </td>
                  <td className="border border-gray-200 dark:border-gray-700 p-2.5 text-center font-semibold text-primary-700">{receipt_info?.payment_mode}</td>
                  <td className="border border-gray-200 dark:border-gray-700 p-2.5 text-right font-bold text-gray-900 dark:text-white">₹{fee_breakdown?.paid_amount?.toLocaleString()}</td>
                </tr>
                {fee_breakdown?.discount_amount > 0 && (
                  <tr>
                    <td className="border border-gray-200 dark:border-gray-700 p-2.5 text-amber-700 font-medium">Fee Concession / Discount</td>
                    <td className="border border-gray-200 dark:border-gray-700 p-2.5 text-center">-</td>
                    <td className="border border-gray-200 dark:border-gray-700 p-2.5 text-right font-bold text-amber-700">- ₹{fee_breakdown?.discount_amount?.toLocaleString()}</td>
                  </tr>
                )}
                <tr className="total-row bg-primary-50/50 dark:bg-primary-900/30 font-extrabold text-sm">
                  <td colSpan="2" className="border border-gray-200 dark:border-gray-700 p-2.5 text-right">TOTAL AMOUNT RECEIVED</td>
                  <td className="border border-gray-200 dark:border-gray-700 p-2.5 text-right text-emerald-600">₹{fee_breakdown?.net_total?.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            <p className="text-[11px] text-gray-500 italic mb-6">Remarks: {remarks}</p>

            {/* Footer Signatures */}
            <div className="footer flex justify-between items-end pt-4 mt-6 border-t border-gray-100 dark:border-gray-800 text-xs">
              <div>
                <p className="flex items-center gap-1 text-[11px] text-gray-400"><ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Computer Generated Verified Receipt</p>
                <p className="text-[10px] text-gray-400">Issued by: {receipt_info?.collected_by}</p>
              </div>
              <div className="text-center border-t border-gray-400 w-44 pt-1 font-semibold text-gray-700 dark:text-gray-300">
                Authorised Cashier Signature
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
