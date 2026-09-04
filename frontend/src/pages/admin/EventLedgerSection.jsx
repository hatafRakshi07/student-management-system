import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import {
  Sparkles, Plus, Search, Filter, Calendar, MapPin,
  TrendingUp, TrendingDown, DollarSign, Users, Award,
  Music, Utensils, Camera, Gift, Layers, CheckCircle2,
  AlertCircle, Trash2, Eye, Download, X, ArrowUpRight,
  ArrowDownLeft, FileText, ChevronRight
} from 'lucide-react'

export default function EventLedgerSection() {
  const [events, setEvents] = useState([])
  const [overallSummary, setOverallSummary] = useState({
    total_events: 0,
    overall_collected: 0,
    overall_spent: 0,
    overall_net_surplus: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [eventTypeFilter, setEventTypeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Create Event Modal
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [eventForm, setEventForm] = useState({
    name: '',
    event_type: 'FRESHER_PARTY',
    academic_year: '2026-27',
    target_budget: '',
    event_date: new Date().toISOString().split('T')[0],
    venue: '',
    coordinator_name: '',
    coordinator_contact: '',
    description: '',
  })
  const [submittingEvent, setSubmittingEvent] = useState(false)

  // Selected Event Details Modal & Item Entry Modal
  const [selectedEventId, setSelectedEventId] = useState(null)
  const [eventDetails, setEventDetails] = useState(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  // Add Item (Income/Expense) Modal
  const [addItemModalOpen, setAddItemModalOpen] = useState(false)
  const [itemEntryType, setItemEntryType] = useState('EXPENSE') // 'INCOME' or 'EXPENSE'
  const [itemForm, setItemForm] = useState({
    item_name: '',
    entry_type: 'EXPENSE',
    category: 'DJ & Sound',
    amount: '',
    payee_or_donor: '',
    payment_mode: 'UPI',
    reference_no: '',
    notes: '',
    item_date: new Date().toISOString().split('T')[0],
  })
  const [submittingItem, setSubmittingItem] = useState(false)

  const eventTypes = [
    { value: 'ALL', label: 'All Event Types' },
    { value: 'FRESHER_PARTY', label: "Fresher's Welcome Party" },
    { value: 'FAREWELL_PARTY', label: 'Graduation Farewell Party' },
    { value: 'ANNUAL_FEST', label: 'Annual Cultural Fest' },
    { value: 'SPORTS_MEET', label: 'Annual Sports Meet' },
    { value: 'CULTURAL_NIGHT', label: 'Dandiya / Cultural Night' },
    { value: 'TECHNICAL_SYMPOSIUM', label: 'Tech Symposium / Hackathon' },
    { value: 'WORKSHOP', label: 'Workshop / Seminar' },
    { value: 'OTHER', label: 'Other College Activity' },
  ]

  const incomeCategories = [
    'Student Contribution',
    'Student Pass / Ticket Sales',
    'Sponsorship',
    'College Grant',
    'Alumni Donation',
    'Faculty Contribution',
    'Stall Booking Fee',
    'Other Income',
  ]

  const expenseCategories = [
    'DJ & Sound',
    'Catering & Food',
    'Decoration & Stage',
    'Photography & Media',
    'Gifts & Prizes',
    'Venue & Tent Setup',
    'Guest Honorarium',
    'Printing & Posters',
    'Security & Bouncers',
    'Transportation',
    'Miscellaneous Expense',
  ]

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (eventTypeFilter !== 'ALL') params.append('event_type', eventTypeFilter)
      if (statusFilter !== 'ALL') params.append('status', statusFilter)

      const res = await api.get(`/finance/events?${params.toString()}`)
      setEvents(res.data.events || [])
      setOverallSummary(res.data.overall_summary || {
        total_events: 0,
        overall_collected: 0,
        overall_spent: 0,
        overall_net_surplus: 0
      })
    } catch (err) {
      toast.error('Failed to load Event Ledger data')
    } finally {
      setLoading(false)
    }
  }

  const fetchEventDetails = async (eventId) => {
    setLoadingDetails(true)
    try {
      const res = await api.get(`/finance/events/${eventId}`)
      setEventDetails(res.data)
      setSelectedEventId(eventId)
    } catch (err) {
      toast.error('Failed to load event details')
    } finally {
      setLoadingDetails(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [searchTerm, eventTypeFilter, statusFilter])

  const handleCreateEvent = async (e) => {
    e.preventDefault()
    if (!eventForm.name.trim()) {
      toast.error('Event name is required')
      return
    }

    setSubmittingEvent(true)
    try {
      await api.post('/finance/events', {
        ...eventForm,
        target_budget: parseFloat(eventForm.target_budget) || 0.0,
      })
      toast.success('Event created in ledger!')
      setCreateModalOpen(false)
      setEventForm({
        name: '',
        event_type: 'FRESHER_PARTY',
        academic_year: '2026-27',
        target_budget: '',
        event_date: new Date().toISOString().split('T')[0],
        venue: '',
        coordinator_name: '',
        coordinator_contact: '',
        description: '',
      })
      fetchEvents()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create event')
    } finally {
      setSubmittingEvent(false)
    }
  }

  const handleAddItem = async (e) => {
    e.preventDefault()
    if (!itemForm.item_name.trim()) {
      toast.error('Item name is required')
      return
    }
    if (!itemForm.amount || parseFloat(itemForm.amount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    setSubmittingItem(true)
    try {
      await api.post(`/finance/events/${selectedEventId}/items`, {
        ...itemForm,
        entry_type: itemEntryType,
        amount: parseFloat(itemForm.amount),
      })
      toast.success(`${itemEntryType === 'INCOME' ? 'Collection' : 'Expense'} entry recorded!`)
      setAddItemModalOpen(false)
      setItemForm({
        item_name: '',
        entry_type: itemEntryType,
        category: itemEntryType === 'INCOME' ? 'Student Contribution' : 'DJ & Sound',
        amount: '',
        payee_or_donor: '',
        payment_mode: 'UPI',
        reference_no: '',
        notes: '',
        item_date: new Date().toISOString().split('T')[0],
      })
      fetchEventDetails(selectedEventId)
      fetchEvents()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to record entry')
    } finally {
      setSubmittingItem(false)
    }
  }

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this ledger entry?')) return
    try {
      await api.delete(`/finance/events/${selectedEventId}/items/${itemId}`)
      toast.success('Entry deleted')
      fetchEventDetails(selectedEventId)
      fetchEvents()
    } catch (err) {
      toast.error('Failed to delete entry')
    }
  }

  const handleDeleteEvent = async (eventId, eventName) => {
    if (!window.confirm(`Are you sure you want to delete "${eventName}" and all its ledger transactions?`)) return
    try {
      await api.delete(`/finance/events/${eventId}`)
      toast.success('Event deleted')
      if (selectedEventId === eventId) {
        setSelectedEventId(null)
        setEventDetails(null)
      }
      fetchEvents()
    } catch (err) {
      toast.error('Failed to delete event')
    }
  }

  const openAddItemModal = (type) => {
    setItemEntryType(type)
    setItemForm({
      item_name: '',
      entry_type: type,
      category: type === 'INCOME' ? 'Student Contribution' : 'DJ & Sound',
      amount: '',
      payee_or_donor: '',
      payment_mode: 'UPI',
      reference_no: '',
      notes: '',
      item_date: new Date().toISOString().split('T')[0],
    })
    setAddItemModalOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 relative overflow-hidden border-l-4 border-amber-500 bg-gradient-to-br from-amber-50/60 to-white dark:from-amber-950/20 dark:to-gray-900 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Total College Events</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                {overallSummary.total_events} Events
              </h3>
              <p className="text-[11px] text-gray-500 mt-1">Freshers, Farewell, Fests</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Sparkles className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="card p-4 relative overflow-hidden border-l-4 border-emerald-500 bg-gradient-to-br from-emerald-50/60 to-white dark:from-emerald-950/20 dark:to-gray-900 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Total Event Collections</p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                ₹{overallSummary.overall_collected.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[11px] text-gray-500 mt-1">Student contributions & sponsors</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <ArrowDownLeft className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="card p-4 relative overflow-hidden border-l-4 border-rose-500 bg-gradient-to-br from-rose-50/60 to-white dark:from-rose-950/20 dark:to-gray-900 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">Total Event Kharcha (Spent)</p>
              <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                ₹{overallSummary.overall_spent.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[11px] text-gray-500 mt-1">DJ, Food, Stage, Decoration, Gifts</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <ArrowUpRight className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="card p-4 relative overflow-hidden border-l-4 border-purple-500 bg-gradient-to-br from-purple-50/60 to-white dark:from-purple-950/20 dark:to-gray-900 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">Net Event Balance</p>
              <h3 className={`text-2xl font-black mt-1 ${overallSummary.overall_net_surplus >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                ₹{overallSummary.overall_net_surplus.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[11px] text-gray-500 mt-1">
                {overallSummary.overall_net_surplus >= 0 ? '✓ Net Surplus in Fund' : '⚠ Deficit (Over Budget)'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar & Filters */}
      <div className="card p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Fresher, Farewell, Fest..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none dark:text-white"
            />
          </div>

          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {eventTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition-all shrink-0 w-full md:w-auto"
        >
          <Plus className="w-4 h-4" />
          Create New Event Ledger
        </button>
      </div>

      {/* Events List Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 card">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 text-xs mt-3 font-semibold">Loading Event Ledgers...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 card p-8">
          <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-3" />
          <h3 className="font-bold text-gray-800 dark:text-white text-base">No Event Ledgers Found</h3>
          <p className="text-gray-500 text-xs mt-1 mb-4">Create your first college event ledger to start tracking income and expenses.</p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="btn-primary py-2 px-4 text-xs inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Event
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {events.map((ev) => {
            const surplus = ev.total_collected - ev.total_spent
            const budgetPct = ev.target_budget > 0 ? Math.min(Math.round((ev.total_spent / ev.target_budget) * 100), 100) : 0

            return (
              <div
                key={ev.id}
                className="card p-5 border border-gray-200 dark:border-gray-800 hover:border-purple-300 dark:hover:border-purple-800/60 transition-all shadow-sm flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="badge badge-purple text-[10px] uppercase font-bold">
                        {ev.event_type.replace(/_/g, ' ')}
                      </span>
                      <h4 className="font-bold text-gray-900 dark:text-white text-lg mt-1">
                        {ev.name}
                      </h4>
                    </div>
                    <span className={`badge ${
                      ev.status === 'COMPLETED' || ev.status === 'SETTLED' ? 'badge-green' : 'badge-amber'
                    } text-[10px]`}>
                      {ev.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                    {ev.event_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {ev.event_date}
                      </span>
                    )}
                    {ev.venue && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        {ev.venue}
                      </span>
                    )}
                  </div>

                  {/* Financial Breakdown Box */}
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-2xl space-y-2 text-xs">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/30">
                        <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Collected</p>
                        <p className="font-black text-emerald-700 dark:text-emerald-300 text-sm mt-0.5">
                          ₹{ev.total_collected.toLocaleString('en-IN')}
                        </p>
                      </div>

                      <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/30">
                        <p className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase">Kharcha (Spent)</p>
                        <p className="font-black text-rose-700 dark:text-rose-300 text-sm mt-0.5">
                          ₹{ev.total_spent.toLocaleString('en-IN')}
                        </p>
                      </div>

                      <div className={`p-2 rounded-xl border ${
                        surplus >= 0
                          ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-100 dark:border-purple-900/30 text-purple-700 dark:text-purple-300'
                          : 'bg-rose-50 dark:bg-rose-950/40 border-rose-100 dark:border-rose-900/30 text-rose-700 dark:text-rose-300'
                      }`}>
                        <p className="text-[10px] font-bold uppercase">Net Surplus</p>
                        <p className="font-black text-sm mt-0.5">
                          ₹{surplus.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>

                    {/* Target Budget Progress */}
                    {ev.target_budget > 0 && (
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-[11px] text-gray-500">
                          <span>Target Budget: ₹{ev.target_budget.toLocaleString('en-IN')}</span>
                          <span className="font-semibold">{budgetPct}% Spent</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${budgetPct > 90 ? 'bg-rose-500' : 'bg-purple-600'}`}
                            style={{ width: `${budgetPct}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-500">
                    {ev.items_count} Ledger Items
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fetchEventDetails(ev.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Full Ledger
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(ev.id, ev.name)}
                      className="p-1.5 rounded-xl hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition-colors"
                      title="Delete Event"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── MODAL 1: CREATE EVENT ─────────────────────────────────────── */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-800 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-gray-900 dark:text-white">Create New Event Ledger</h3>
              </div>
              <button onClick={() => setCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Event Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Fresher's Welcome Party 2026 / Farewell 2026"
                  value={eventForm.name}
                  onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 text-xs dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Event Type</label>
                  <select
                    value={eventForm.event_type}
                    onChange={(e) => setEventForm({ ...eventForm, event_type: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 text-xs dark:text-white"
                  >
                    {eventTypes.filter(t => t.value !== 'ALL').map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Target Budget (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 75000"
                    value={eventForm.target_budget}
                    onChange={(e) => setEventForm({ ...eventForm, target_budget: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 text-xs dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Event Date</label>
                  <input
                    type="date"
                    value={eventForm.event_date}
                    onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 text-xs dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Venue / Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Main Auditorium / Lawn"
                    value={eventForm.venue}
                    onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 text-xs dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Faculty Coordinator</label>
                  <input
                    type="text"
                    placeholder="e.g. Prof. R. K. Sharma"
                    value={eventForm.coordinator_name}
                    onChange={(e) => setEventForm({ ...eventForm, coordinator_name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 text-xs dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+91 98290 11223"
                    value={eventForm.coordinator_contact}
                    onChange={(e) => setEventForm({ ...eventForm, coordinator_contact: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 text-xs dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Event Description & Notes</label>
                <textarea
                  rows="2"
                  placeholder="Purpose, target batch, orientation guidelines..."
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 text-xs dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={submittingEvent}
                  onClick={() => setCreateModalOpen(false)}
                  className="btn-secondary py-2 px-4 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEvent}
                  className="btn-primary py-2 px-5 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {submittingEvent ? 'Creating...' : 'Create Event Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: EVENT FULL LEDGER DRILLDOWN ─────────────────────── */}
      {eventDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-800 space-y-5 my-8">
            <div className="flex items-start justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="badge badge-purple text-[10px] uppercase font-bold">
                    {eventDetails.event.event_type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-gray-400">· {eventDetails.event.academic_year}</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                  {eventDetails.event.name}
                </h2>
                <p className="text-xs text-gray-500 flex items-center gap-3 mt-1">
                  <span>📅 Date: {eventDetails.event.event_date || 'TBD'}</span>
                  <span>📍 Venue: {eventDetails.event.venue || 'Campus'}</span>
                  <span>👤 Coordinator: {eventDetails.event.coordinator_name || 'N/A'}</span>
                </p>
              </div>

              <button
                onClick={() => setEventDetails(null)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Financial Summary Ribbon */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase">Total Amount Collected</p>
                  <h3 className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                    ₹{eventDetails.summary.total_collected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </h3>
                </div>
                <button
                  onClick={() => openAddItemModal('INCOME')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Collection
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/30 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase">Total Kharcha (Expenses)</p>
                  <h3 className="text-2xl font-black text-rose-700 dark:text-rose-300 mt-0.5">
                    ₹{eventDetails.summary.total_spent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </h3>
                </div>
                <button
                  onClick={() => openAddItemModal('EXPENSE')}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Kharcha
                </button>
              </div>

              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                eventDetails.summary.net_balance >= 0
                  ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-100 dark:border-purple-900/30 text-purple-700 dark:text-purple-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-100 dark:border-rose-900/30 text-rose-700 dark:text-rose-300'
              }`}>
                <div>
                  <p className="text-xs font-bold uppercase">Net Event Balance</p>
                  <h3 className="text-2xl font-black mt-0.5">
                    ₹{eventDetails.summary.net_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </h3>
                  <p className="text-[11px] font-semibold mt-0.5">
                    {eventDetails.summary.net_balance >= 0 ? '✓ Surplus Remaining' : '⚠ Deficit Over Budget'}
                  </p>
                </div>
              </div>
            </div>

            {/* Itemized Transactions Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-500" />
                  Itemized Event Financial Entries ({eventDetails.items.length})
                </h4>
              </div>

              {eventDetails.items.length === 0 ? (
                <div className="text-center py-8 p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl text-xs text-gray-500">
                  No income or expense entries added for this event yet.
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-100 dark:border-gray-800 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 dark:bg-gray-800/80 text-gray-500 font-bold border-b border-gray-100 dark:border-gray-800">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Item / Description</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Payee / Donor</th>
                        <th className="p-3 text-right">Amount (₹)</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {eventDetails.items.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors">
                          <td className="p-3 font-mono text-gray-500">{item.item_date}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              item.entry_type === 'INCOME'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            }`}>
                              {item.entry_type === 'INCOME' ? '+ COLLECTION' : '- EXPENSE'}
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-gray-900 dark:text-white max-w-[200px]">
                            <div>{item.item_name}</div>
                            {item.notes && <div className="text-[11px] text-gray-400 font-normal italic">{item.notes}</div>}
                          </td>
                          <td className="p-3 text-gray-600 dark:text-gray-300">{item.category}</td>
                          <td className="p-3 text-gray-600 dark:text-gray-300">{item.payee_or_donor || '-'}</td>
                          <td className={`p-3 font-mono font-bold text-right ${
                            item.entry_type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {item.entry_type === 'INCOME' ? '+' : '-'}₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 hover:text-rose-600 text-gray-400 transition-colors"
                              title="Delete Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => setEventDetails(null)}
                className="btn-secondary py-2 px-5 text-xs"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: ADD COLLECTION OR EXPENSE ITEM ───────────────────── */}
      {addItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-800 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                  itemEntryType === 'INCOME'
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950'
                    : 'bg-rose-100 text-rose-600 dark:bg-rose-950'
                }`}>
                  {itemEntryType === 'INCOME' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                </div>
                <h3 className="font-bold text-base text-gray-900 dark:text-white">
                  {itemEntryType === 'INCOME' ? 'Record Amount Collection (Income)' : 'Record Event Kharcha (Expense)'}
                </h3>
              </div>
              <button onClick={() => setAddItemModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">
                  {itemEntryType === 'INCOME' ? 'Collection Title *' : 'Expense Item Title *'}
                </label>
                <input
                  type="text"
                  placeholder={itemEntryType === 'INCOME' ? 'e.g. Student Passes (150 @ ₹350) or Sponsor' : 'e.g. DJ & Sound Setup, Royal Catering, Decoration'}
                  value={itemForm.item_name}
                  onChange={(e) => setItemForm({ ...itemForm, item_name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 text-xs dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Category *</label>
                  <select
                    value={itemForm.category}
                    onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 text-xs dark:text-white"
                  >
                    {(itemEntryType === 'INCOME' ? incomeCategories : expenseCategories).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 15000"
                    value={itemForm.amount}
                    onChange={(e) => setItemForm({ ...itemForm, amount: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 text-xs dark:text-white font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">
                    {itemEntryType === 'INCOME' ? 'Collected From / Donor' : 'Payee / Vendor Name'}
                  </label>
                  <input
                    type="text"
                    placeholder={itemEntryType === 'INCOME' ? 'e.g. 2nd Year Committee' : 'e.g. Rockers Sound Kota'}
                    value={itemForm.payee_or_donor}
                    onChange={(e) => setItemForm({ ...itemForm, payee_or_donor: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 text-xs dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Payment Mode</label>
                  <select
                    value={itemForm.payment_mode}
                    onChange={(e) => setItemForm({ ...itemForm, payment_mode: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 text-xs dark:text-white"
                  >
                    <option value="UPI">UPI / QR Code</option>
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Date</label>
                  <input
                    type="date"
                    value={itemForm.item_date}
                    onChange={(e) => setItemForm({ ...itemForm, item_date: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 text-xs dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Ref / Bill / UTR No</label>
                  <input
                    type="text"
                    placeholder="e.g. UTR-982103"
                    value={itemForm.reference_no}
                    onChange={(e) => setItemForm({ ...itemForm, reference_no: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 text-xs dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Audit Notes / Item Details</label>
                <input
                  type="text"
                  placeholder="e.g. Rate per plate ₹180, 4 speakers + smoke machine"
                  value={itemForm.notes}
                  onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 text-xs dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={submittingItem}
                  onClick={() => setAddItemModalOpen(false)}
                  className="btn-secondary py-2 px-4 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingItem}
                  className={`btn-primary py-2 px-5 text-xs text-white border-none ${
                    itemEntryType === 'INCOME' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {submittingItem ? 'Saving...' : itemEntryType === 'INCOME' ? 'Record Collection' : 'Record Kharcha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
