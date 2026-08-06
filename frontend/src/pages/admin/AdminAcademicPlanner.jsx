import React, { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Calendar, Clock, MapPin, Users, BookOpen, Plus, Download, ShieldCheck, AlertCircle } from 'lucide-react'

export default function AdminAcademicPlanner() {
  const [stats, setStats] = useState(null)
  const [timetable, setTimetable] = useState([])
  const [rooms, setRooms] = useState([])
  const [calendarEvents, setCalendarEvents] = useState([])
  const [loading, setLoading] = useState(true)

  // Slot Modal Form State
  const [slotModalOpen, setSlotModalOpen] = useState(false)
  const [day, setDay] = useState('MONDAY')
  const [timeSlot, setTimeSlot] = useState('09:00 AM - 10:00 AM')
  const [className, setClassName] = useState('B.A. I-SEM')
  const [section, setSection] = useState('A')
  const [subjectId, setSubjectId] = useState(1)
  const [facultyId, setFacultyId] = useState(1)
  const [roomId, setRoomId] = useState(1)

  const loadData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      const [statsRes, ttRes, roomsRes, calRes] = await Promise.all([
        axios.get('/api/academic/admin/dashboard', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/academic/timetable', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/academic/rooms', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/academic/calendar', { headers: { Authorization: `Bearer ${token}` } })
      ])

      setStats(statsRes.data)
      setTimetable(ttRes.data.timetable || [])
      setRooms(roomsRes.data || [])
      setCalendarEvents(calRes.data || [])
    } catch {
      toast.error('Failed to load Academic Planner & Timetable data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreateSlot = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('access_token')
      const res = await axios.post('/api/academic/timetable/slot', {
        day_of_week: day,
        time_slot: timeSlot,
        class_name: className,
        section: section,
        semester: 1,
        subject_id: subjectId,
        faculty_user_id: facultyId,
        room_id: roomId
      }, { headers: { Authorization: `Bearer ${token}` } })

      toast.success(res.data.message || 'Timetable Slot Created!')
      setSlotModalOpen(false)
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Conflict Detected! Could not create timetable slot.')
    }
  }

  const exportCSV = () => {
    let csv = "data:text/csv;charset=utf-8,Day,Time Slot,Class,Section,Subject,Faculty,Room\n"
    timetable.forEach(t => {
      csv += `"${t.day}","${t.time_slot}","${t.class_name}","${t.section}","${t.subject_name}","${t.faculty_name}","${t.room_number}"\n`
    })
    const link = document.createElement("a")
    link.setAttribute("href", encodeURI(csv))
    link.setAttribute("download", `master_timetable_grid.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6 animate-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Calendar className="w-7 h-7 text-primary-700" /> Academic Planner & Timetable Command Center
          </h1>
          <p className="page-subtitle">Master Weekly Schedule, Conflict Prevention Engine, Room Allocation & Academic Calendar</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="btn-secondary text-xs flex items-center gap-1.5">
            <Download className="w-4 h-4" /> Export Timetable CSV
          </button>
          <button onClick={() => setSlotModalOpen(true)} className="btn-primary text-xs flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Schedule Timetable Slot
          </button>
        </div>
      </div>

      {/* Gauges */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-4 border border-blue-100 dark:border-blue-900/40">
            <p className="text-xl font-black text-blue-700 dark:text-blue-300">{stats.total_timetable_slots || 0}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase">Active Timetable Slots</p>
          </div>
          <div className="card p-4 border border-emerald-100 dark:border-emerald-900/40">
            <p className="text-xl font-black text-emerald-600">{stats.active_rooms || 0}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase">Configured Classrooms / Labs</p>
          </div>
          <div className="card p-4 border border-purple-100 dark:border-purple-900/40">
            <p className="text-xl font-black text-purple-600">{stats.total_calendar_events || 0}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase">Academic Calendar Events</p>
          </div>
          <div className="card p-4 border border-amber-100 dark:border-amber-900/40">
            <p className="text-sm font-black text-emerald-600 flex items-center gap-1"><ShieldCheck className="w-4 h-4 text-emerald-600" /> {stats.conflict_status}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase">AI Conflict Engine</p>
          </div>
        </div>
      )}

      {/* Master Timetable Grid */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary-700" /> Master Weekly Timetable Register
          </h3>
          <span className="badge badge-green text-xs font-mono">0 Conflicts</span>
        </div>

        <div className="table-container max-h-[450px] overflow-y-auto">
          <table className="table w-full text-left border-collapse">
            <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 z-10 text-xs font-bold text-gray-700 dark:text-gray-300">
              <tr>
                <th className="p-3">Day</th>
                <th className="p-3">Time Slot</th>
                <th className="p-3">Course & Class</th>
                <th className="p-3">Subject</th>
                <th className="p-3">Assigned Faculty</th>
                <th className="p-3">Room / Lab</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
              {timetable.map(t => (
                <tr key={t.slot_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="p-3 font-bold text-primary-700 dark:text-primary-400">{t.day}</td>
                  <td className="p-3 font-mono text-gray-600 dark:text-gray-300">{t.time_slot}</td>
                  <td className="p-3 font-bold text-gray-900 dark:text-white">{t.class_name} <span className="font-normal text-gray-400">({t.section})</span></td>
                  <td className="p-3 text-purple-700 dark:text-purple-300 font-bold">{t.subject_name}</td>
                  <td className="p-3 font-semibold text-gray-800 dark:text-gray-200">{t.faculty_name}</td>
                  <td className="p-3"><span className="badge badge-blue">{t.room_number}</span></td>
                </tr>
              ))}
              {!timetable.length && (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-gray-400">No timetable slots scheduled yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Classrooms & Academic Calendar Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Classrooms List */}
        <div className="card p-5 space-y-3">
          <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" /> Classroom & Laboratory Inventory
          </h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto text-xs">
            {rooms.map(r => (
              <div key={r.id} className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">{r.room_number} — <span className="text-gray-500 font-normal">{r.building} ({r.floor})</span></p>
                  <p className="text-gray-500 font-semibold">{r.room_type} | Capacity: {r.capacity} Students</p>
                </div>
                <span className="badge badge-green">ACTIVE</span>
              </div>
            ))}
          </div>
        </div>

        {/* Academic Calendar */}
        <div className="card p-5 space-y-3">
          <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-600" /> Academic Calendar & Events
          </h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto text-xs">
            {calendarEvents.map(e => (
              <div key={e.id} className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-xl flex items-center justify-between border border-purple-100 dark:border-purple-900/40">
                <div>
                  <p className="font-bold text-purple-900 dark:text-purple-200">{e.title}</p>
                  <p className="text-purple-600 dark:text-purple-400 font-semibold">{e.start_date} to {e.end_date}</p>
                </div>
                <span className="badge badge-purple">{e.category}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Schedule Slot Modal */}
      {slotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 space-y-4">
            <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary-700" /> Schedule New Timetable Slot
            </h3>
            <form onSubmit={handleCreateSlot} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Day of Week</label>
                <select value={day} onChange={e => setDay(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-800">
                  {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Time Slot</label>
                <select value={timeSlot} onChange={e => setTimeSlot(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-800">
                  <option value="09:00 AM - 10:00 AM">09:00 AM - 10:00 AM</option>
                  <option value="10:00 AM - 11:00 AM">10:00 AM - 11:00 AM</option>
                  <option value="11:30 AM - 12:30 PM">11:30 AM - 12:30 PM</option>
                  <option value="01:30 PM - 02:30 PM">01:30 PM - 02:30 PM</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Course & Class Name</label>
                <input type="text" value={className} onChange={e => setClassName(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-800" />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setSlotModalOpen(false)} className="btn-secondary py-2 px-4 text-xs">Cancel</button>
                <button type="submit" className="btn-primary py-2 px-4 text-xs">Create Slot</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
