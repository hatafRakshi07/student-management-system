import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Home, Users, BedDouble, AlertCircle, Plus, Search, CheckCircle, Shield, Phone, FileText } from 'lucide-react'

const DEMO_DATA = {
  total_rooms: 48, occupied_rooms: 41, available_rooms: 7, total_capacity: 192, total_residents: 164,
  pending_complaints: 5, total_fees_collected: 824000, pending_dues: 96000,
  rooms: [
    { room_number: 'A-101', block_wing: 'Block A', capacity: 4, occupied: 4, type: 'General', warden: 'Mrs. Savita Jain', fees: 8500 },
    { room_number: 'A-102', block_wing: 'Block A', capacity: 4, occupied: 3, type: 'General', warden: 'Mrs. Savita Jain', fees: 8500 },
    { room_number: 'A-201', block_wing: 'Block A', capacity: 2, occupied: 2, type: 'AC Double', warden: 'Mrs. Savita Jain', fees: 14000 },
    { room_number: 'B-101', block_wing: 'Block B', capacity: 4, occupied: 4, type: 'General', warden: 'Mrs. Rekha Sharma', fees: 8500 },
    { room_number: 'B-102', block_wing: 'Block B', capacity: 4, occupied: 2, type: 'General', warden: 'Mrs. Rekha Sharma', fees: 8500 },
    { room_number: 'B-201', block_wing: 'Block B', capacity: 1, occupied: 1, type: 'Single AC', warden: 'Mrs. Rekha Sharma', fees: 18000 },
    { room_number: 'C-101', block_wing: 'Block C', capacity: 6, occupied: 6, type: 'Economy', warden: 'Mrs. Usha Gupta', fees: 6000 },
    { room_number: 'C-102', block_wing: 'Block C', capacity: 6, occupied: 4, type: 'Economy', warden: 'Mrs. Usha Gupta', fees: 6000 },
  ],
  complaints: [
    { id: 1, room: 'A-101', issue: 'Water leakage in bathroom', status: 'Pending', date: '2024-08-10', priority: 'High' },
    { id: 2, room: 'B-201', issue: 'AC not working properly', status: 'In Progress', date: '2024-08-09', priority: 'Medium' },
    { id: 3, room: 'C-101', issue: 'Broken window latch', status: 'Resolved', date: '2024-08-07', priority: 'Low' },
    { id: 4, room: 'A-201', issue: 'Wi-Fi connectivity issue', status: 'Pending', date: '2024-08-11', priority: 'Medium' },
    { id: 5, room: 'B-102', issue: 'Mattress replacement needed', status: 'Resolved', date: '2024-08-05', priority: 'Low' },
  ]
}

export default function AdminHostelHub() {
  const [data, setData] = useState(DEMO_DATA)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('rooms') // 'rooms' | 'complaints'

  useEffect(() => {
    // Demo data loaded above; real backend endpoint can be integrated later
  }, [])


  const rooms = (data?.rooms || []).filter(r => 
    r.room_number.toLowerCase().includes(search.toLowerCase()) ||
    r.block_wing.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Home className="w-7 h-7 text-primary-700 dark:text-primary-400" /> Hostel & Mess Management ERP
          </h1>
          <p className="page-subtitle">Aklank Girls P.G. College – Block Allotment, Bed Capacity, Fees & Maintenance</p>
        </div>
        <button onClick={() => toast.success('Room allotment dialog opened')} className="btn-primary flex items-center gap-2 self-start">
          <Plus className="w-4 h-4" /> Allot New Room
        </button>
      </div>

      {/* Metrics */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-4 border border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-black text-blue-700 dark:text-blue-300">{data.total_rooms}</p>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Total Hostel Rooms</p>
              </div>
              <Home className="w-8 h-8 text-blue-500/40" />
            </div>
          </div>
          <div className="card p-4 border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-black text-emerald-600">{data.occupied_beds} / {data.total_capacity}</p>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Occupied Beds</p>
              </div>
              <BedDouble className="w-8 h-8 text-emerald-500/40" />
            </div>
          </div>
          <div className="card p-4 border border-purple-100 dark:border-purple-900/40 bg-purple-50/50 dark:bg-purple-950/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-black text-purple-600">{data.available_beds}</p>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Available Beds</p>
              </div>
              <Users className="w-8 h-8 text-purple-500/40" />
            </div>
          </div>
          <div className="card p-4 border border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-black text-amber-600">{data.active_complaints} Pending</p>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Maintenance Tickets</p>
              </div>
              <AlertCircle className="w-8 h-8 text-amber-500/40" />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="card">
        <div className="flex items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-700/60 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('rooms')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'rooms'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              Hostel Rooms & Allotments
            </button>
            <button
              onClick={() => setActiveTab('complaints')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'complaints'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              Maintenance Logs & Mess Details
            </button>
          </div>

          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search room no, wing…"
              className="input pl-9 text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {activeTab === 'rooms' ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Room No</th>
                  <th>Wing / Block</th>
                  <th>Floor</th>
                  <th>Capacity</th>
                  <th>Monthly Rent</th>
                  <th>Facilities</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map(r => (
                  <tr key={r.id}>
                    <td className="font-bold text-gray-900 dark:text-white">Room {r.room_number}</td>
                    <td className="text-gray-700 dark:text-gray-300 font-medium">{r.block_wing}</td>
                    <td>Floor {r.floor}</td>
                    <td>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {r.occupied_count} / {r.capacity} Beds
                      </span>
                    </td>
                    <td className="font-semibold text-emerald-600 dark:text-emerald-400">₹{r.monthly_rent}</td>
                    <td className="text-xs text-gray-500 max-w-xs truncate">{r.facilities}</td>
                    <td>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        r.status === 'AVAILABLE'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : r.status === 'PARTIAL'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900 dark:text-amber-300 text-sm">Active Hostel Maintenance Ticket #1082</p>
                <p className="text-xs text-amber-800 dark:text-amber-400 mt-1">Room 102 – Geyser Repair requested by Hostel Warden. Status: In Progress.</p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-blue-900 dark:text-blue-300 text-sm">Mess Menu & Hygiene Audit</p>
                <p className="text-xs text-blue-800 dark:text-blue-400 mt-1">Four meals daily (Breakfast, Lunch, Evening Snacks, Dinner). 100% Pure Veg & Jain Option Available.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
