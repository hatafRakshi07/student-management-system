import React, { useRef } from 'react'
import { Printer, Download, X, Award, ShieldCheck, CheckCircle2 } from 'lucide-react'

export default function MarksheetModal({ open, onClose, marksheetData }) {
  const printRef = useRef(null)

  if (!open || !marksheetData) return null

  const { college_info, student_info, result_summary, subject_marks } = marksheetData

  const handlePrint = () => {
    const printContent = printRef.current
    if (!printContent) return
    const win = window.open('', '_blank')
    win.document.write(`
      <html>
        <head>
          <title>Official Marksheet - ${student_info?.student_name}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #0f172a; }
            .sheet-box { border: 3px double #024794; padding: 28px; border-radius: 16px; max-width: 800px; margin: 0 auto; background: #fff; position: relative; }
            .header { text-align: center; border-bottom: 2px solid #024794; padding-bottom: 14px; margin-bottom: 20px; }
            .title { font-size: 24px; font-weight: 900; color: #024794; letter-spacing: 0.5px; }
            .subtitle { font-size: 12px; color: #d97706; font-weight: 700; margin-top: 2px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; font-size: 13px; margin-bottom: 20px; }
            .field { margin-bottom: 4px; }
            .label { font-weight: 600; color: #475569; display: inline-block; width: 120px; }
            .val { font-weight: 700; color: #0f172a; }
            .table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 12px; }
            .table th, .table td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: center; }
            .table th { background: #f1f5f9; font-weight: 800; color: #1e293b; text-transform: uppercase; font-size: 11px; }
            .total-row { font-weight: 800; font-size: 14px; background: #eff6ff; }
            .footer { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 12px; }
            .sig { border-top: 1px solid #64748b; width: 200px; text-align: center; padding-top: 4px; font-weight: 700; color: #334155; }
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
            <Award className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-gray-900 dark:text-white">Official Statement of Marks — Semester {student_info?.semester}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-primary-700 hover:bg-primary-800 text-white rounded-xl font-semibold text-xs flex items-center gap-1.5 shadow-sm transition"
            >
              <Printer className="w-4 h-4" /> Print Marksheet / PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Marksheet Printable Area */}
        <div className="p-6 overflow-y-auto" ref={printRef}>
          <div className="sheet-box border-4 border-double border-primary-800/40 rounded-2xl p-6 bg-white dark:bg-gray-900 text-gray-900 dark:text-white relative">
            {/* Watermark Logo */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
              <img src="/logo.png" alt="Aklank Emblem Watermark" className="w-80 h-80 object-contain" />
            </div>

            {/* Header */}
            <div className="header text-center border-b-2 border-primary-800/20 pb-4 mb-5">
              <div className="flex items-center justify-center gap-4 mb-2">
                <img src="/logo.png" alt="College Logo" className="w-14 h-14 object-contain" />
                <div>
                  <h2 className="title text-2xl font-black text-primary-900 dark:text-primary-400 tracking-wide">{college_info?.name || "AKLANK GIRLS P.G. COLLEGE"}</h2>
                  <p className="subtitle text-xs text-amber-600 font-bold">{college_info?.tagline}</p>
                </div>
              </div>
              <p className="text-[11px] text-gray-500">{college_info?.address} | {college_info?.affiliation}</p>
              <div className="inline-block mt-2 px-4 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-extrabold text-xs rounded-full border border-amber-300">
                OFFICIAL GRADE CARD & STATEMENT OF MARKS
              </div>
            </div>

            {/* Student Demographic Info Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs mb-5 p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-700">
              <div>
                <p className="field"><span className="label text-gray-500 font-semibold inline-block w-28">Student Name:</span> <span className="val font-bold text-sm text-gray-900 dark:text-white">{student_info?.student_name}</span></p>
                <p className="field"><span className="label text-gray-500 font-semibold inline-block w-28">Father Name:</span> <span className="val font-bold">{student_info?.father_name}</span></p>
                <p className="field"><span className="label text-gray-500 font-semibold inline-block w-28">Scholar / Roll No:</span> <span className="val font-bold font-mono">{student_info?.scholar_no}</span></p>
              </div>
              <div>
                <p className="field"><span className="label text-gray-500 font-semibold inline-block w-28">Class / Course:</span> <span className="val font-bold">{student_info?.class_name} ({student_info?.course})</span></p>
                <p className="field"><span className="label text-gray-500 font-semibold inline-block w-28">Semester / Session:</span> <span className="val font-bold">Semester {student_info?.semester} ({student_info?.session_year})</span></p>
                <p className="field"><span className="label text-gray-500 font-semibold inline-block w-28">Enrollment No:</span> <span className="val font-bold font-mono">{student_info?.reg_no || '-'}</span></p>
              </div>
            </div>

            {/* Subject Marks Table */}
            <table className="table w-full border-collapse border border-gray-200 dark:border-gray-700 text-xs mb-5">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                  <th className="p-2.5 text-left">Subject Code & Title</th>
                  <th className="p-2.5 text-center">Theory</th>
                  <th className="p-2.5 text-center">Internal</th>
                  <th className="p-2.5 text-center">Practical</th>
                  <th className="p-2.5 text-center">Total</th>
                  <th className="p-2.5 text-center">Max</th>
                  <th className="p-2.5 text-center">Grade</th>
                </tr>
              </thead>
              <tbody>
                {subject_marks?.map((sub, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-2.5 text-left font-semibold">
                      <span className="font-mono text-gray-400 mr-2">[{sub.subject_code}]</span>
                      <span className="text-gray-900 dark:text-white">{sub.subject_name}</span>
                    </td>
                    <td className="p-2.5 text-center font-mono">{sub.theory_marks}</td>
                    <td className="p-2.5 text-center font-mono">{sub.internal_marks}</td>
                    <td className="p-2.5 text-center font-mono">{sub.practical_marks}</td>
                    <td className="p-2.5 text-center font-bold text-gray-900 dark:text-white">{sub.total_obtained}</td>
                    <td className="p-2.5 text-center text-gray-500">{sub.max_marks}</td>
                    <td className="p-2.5 text-center"><span className="badge badge-blue font-bold">{sub.letter_grade}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Results Summary Box */}
            <div className="p-4 bg-primary-50/60 dark:bg-primary-950/30 rounded-2xl border border-primary-200/60 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center mb-5">
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase">Grand Total</p>
                <p className="text-lg font-black text-gray-900 dark:text-white">{result_summary?.total_obtained_marks} / {result_summary?.total_max_marks}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase">Percentage / Grade</p>
                <p className="text-lg font-black text-primary-700 dark:text-primary-400">{result_summary?.percentage}% ({result_summary?.letter_grade})</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase">SGPA / CGPA</p>
                <p className="text-lg font-black text-emerald-600">{result_summary?.sgpa} / {result_summary?.cgpa}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase">Division & Status</p>
                <span className="badge badge-green font-extrabold">{result_summary?.result_status}</span>
                <p className="text-[10px] font-bold text-gray-600 mt-0.5">{result_summary?.division}</p>
              </div>
            </div>

            {/* Footer Signatures */}
            <div className="footer flex justify-between items-end pt-4 mt-6 border-t border-gray-200 dark:border-gray-700 text-xs">
              <div>
                <p className="flex items-center gap-1 text-[11px] text-gray-500 font-mono"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Token: {result_summary?.qr_token}</p>
                <p className="text-[10px] text-gray-400">Class Rank: #{result_summary?.class_rank} | Result Verified</p>
              </div>
              <div className="text-center border-t-2 border-gray-500 w-52 pt-1 font-bold text-gray-800 dark:text-gray-200">
                Controller of Examinations
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
