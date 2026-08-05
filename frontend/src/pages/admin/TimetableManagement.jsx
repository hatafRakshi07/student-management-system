import React, { useEffect, useState } from 'react'
import { timetableAPI } from '../../services/api'
import toast from 'react-hot-toast'
import Modal from '../../components/common/Modal'
import { Plus, Trash2, Clock, MapPin, Calendar } from 'lucide-react'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const dayColors = {
  Monday: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
  Tuesday: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
  Wednesday: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30',
  Thursday: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
  Friday: 'text-rose-600 bg-rose-100 dark:bg-rose-900/30',
  Saturday: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30',
}

export default function TimetableManagement() {
  const [entries, setEntries] = useState([])
  const [modal, setModal] = useState(false)
  const [classFilter, setClassFilter] = useState('CS-3A')
  const [form, setForm] = useState({ class_name: 'CS-3A', section: 'A', day_of_week: 'Monday', start_time: '09:00', end_time: '10:00', room: '', subject_id: '', teacher_id: '' })
  const [loading, setLoading] = useState(false)

  const load = (cls = classFilter) =>
    timetableAPI.get({ class_name: cls }).then(r => setEntries(r.data.timetable || [])).catch(() => {})
  useEffect(() => { load() }, [])

  const create = async () => {
    setLoading(true)
    try {
      await timetableAPI.create({ ...form, subject_id: form.subject_id ? Number(form.subject_id) : null, teacher_id: form.teacher_id ? Number(form.teacher_id) : null })
      toast.success('Entry added!')
      setModal(false)
      load()
    } catch { toast.error('Failed') } finally { setLoading(false) }
  }

  const del = async (id) => {
    await timetableAPI.delete(id)
    toast.success('Entry deleted')
    load()
  }

  const activeDays = DAYS.filter(d => entries.some(e => e.day_of_week === d))

  return (
    <div className="space-y-5 animate-page">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="page-title">Timetable Management</h1>
          <p className="page-subtitle">Schedule classes for each day of the week</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2 self-start">
          <Plus className="h-4 w-4" /> Add Entry
        </button>
      </div>

      {/* Class filter */}
      <div className="card">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">Class</label>
            <input className="input w-32" value={classFilter} onChange={e => setClassFilter(e.target.value)} placeholder="CS-3A" />
          </div>
          <button onClick={() => { load(classFilter); setForm(p => ({ ...p, class_name: classFilter })) }} className="btn-secondary">
            Load Timetable
          </button>
          <p className="text-sm text-gray-500 mt-auto">{entries.length} entries for {classFilter}</p>
        </div>
      </div>

      {/* Timetable grid */}
      {entries.length === 0 ? (
        <div className="card text-center py-12">
          <Calendar className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500">No timetable entries for this class.</p>
          <button onClick={() => setModal(true)} className="btn-primary mt-3 mx-auto">Add First Entry</button>
        </div>
      ) : (
        DAYS.map(day => {
          const dayEntries = entries.filter(e => e.day_of_week === day).sort((a, b) => a.start_time.localeCompare(b.start_time))
          if (!dayEntries.length) return null
          return (
            <div key={day} className="card">
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${dayColors[day]}`}>{day}</span>
                <span className="text-xs text-gray-400">{dayEntries.length} class{dayEntries.length > 1 ? 'es' : ''}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {dayEntries.map(e => (
                  <div key={e.id} className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600 group hover:border-primary-300 dark:hover:border-primary-600 transition-colors">
                    <div>
                      <p className="font-medium text-sm text-gray-900 dark:text-white">
                        {e.subject_name || `Subject #${e.subject_id || 'N/A'}`}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{e.start_time} – {e.end_time}</span>
                        {e.room && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{e.room}</span>}
                      </div>
                    </div>
                    <button onClick={() => del(e.id)} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-600 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        })
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Add Timetable Entry">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Class</label>
            <input className="input" value={form.class_name} onChange={e => setForm(p => ({ ...p, class_name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Section</label>
            <input className="input" value={form.section} onChange={e => setForm(p => ({ ...p, section: e.target.value }))} />
          </div>
          <div>
            <label className="label">Day</label>
            <select className="input" value={form.day_of_week} onChange={e => setForm(p => ({ ...p, day_of_week: e.target.value }))}>
              {DAYS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Room</label>
            <input className="input" value={form.room} onChange={e => setForm(p => ({ ...p, room: e.target.value }))} placeholder="e.g. Lab-3" />
          </div>
          <div>
            <label className="label">Start Time</label>
            <input type="time" className="input" value={form.start_time} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} />
          </div>
          <div>
            <label className="label">End Time</label>
            <input type="time" className="input" value={form.end_time} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} />
          </div>
          <div>
            <label className="label">Subject ID</label>
            <input type="number" className="input" value={form.subject_id} onChange={e => setForm(p => ({ ...p, subject_id: e.target.value }))} />
          </div>
          <div>
            <label className="label">Teacher ID</label>
            <input type="number" className="input" value={form.teacher_id} onChange={e => setForm(p => ({ ...p, teacher_id: e.target.value }))} />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={() => setModal(false)} className="btn-secondary flex-1">Cancel</button>
          <button onClick={create} disabled={loading} className="btn-primary flex-1">{loading ? 'Adding…' : 'Add Entry'}</button>
        </div>
      </Modal>
    </div>
  )
}
