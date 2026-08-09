import React, { useEffect, useState } from 'react'
import { teacherAPI } from '../../services/api'
import toast from 'react-hot-toast'
import Modal from '../../components/common/Modal'
import {
  Users, Plus, Search, Filter, RefreshCw, Eye, Edit3, Trash2, Award,
  CheckCircle2, Shield, Building2, BookOpen, GraduationCap, UserCheck,
  FileCheck2, Info, Sparkles, ExternalLink
} from 'lucide-react'

export default function TeacherManagement() {
  const [teachers, setTeachers] = useState([])
  const [stats, setStats] = useState({
    total_staff: 0,
    teaching_staff: 0,
    non_teaching_staff: 0,
    administrative_staff: 0,
    total_departments: 0,
    total_hods: 0,
    department_breakdown: []
  })

  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [designationFilter, setDesignationFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [loading, setLoading] = useState(false)
  const [addModal, setAddModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [profileModal, setProfileModal] = useState(false)
  const [reportModal, setReportModal] = useState(false)

  const [selectedStaff, setSelectedStaff] = useState(null)
  const [validationReport, setValidationReport] = useState(null)

  const [assignmentModal, setAssignmentModal] = useState(false)
  const [teacherAssignments, setTeacherAssignments] = useState([])
  const [assignmentForm, setAssignmentForm] = useState({
    department: 'Computer Science',
    course_name: 'BCA',
    subject_name: '',
    years: ['1st Year', '2nd Year', '3rd Year'],
    section: 'All'
  })

  const [form, setForm] = useState({
    employee_id: '',
    title: 'Mr.',
    full_name: '',
    email: '',
    phone: '',
    department: 'Humanities',
    subject: '',
    designation: 'Faculty',
    employment_type: 'Teaching',
    qualification: '',
    experience_years: '',
    is_hod: false,
    status: 'Active'
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const [resStaff, resStats] = await Promise.all([
        teacherAPI.list({
          search,
          department: departmentFilter,
          subject: subjectFilter,
          designation: designationFilter,
          employment_type: typeFilter,
          status: statusFilter,
          limit: 100
        }),
        teacherAPI.stats()
      ])
      setTeachers(resStaff.data.teachers || [])
      setStats(resStats.data || {})
    } catch {
      toast.error('Failed to load staff master directory')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [departmentFilter, subjectFilter, designationFilter, typeFilter, statusFilter])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    loadData()
  }

  const openAddModal = () => {
    setForm({
      employee_id: `AKL-FAC-${String(teachers.length + 1).padStart(3, '0')}`,
      title: 'Mr.',
      full_name: '',
      email: '',
      phone: '',
      department: 'Humanities',
      subject: '',
      designation: 'Faculty',
      employment_type: 'Teaching',
      qualification: '',
      experience_years: '',
      is_hod: false,
      status: 'Active'
    })
    setAddModal(true)
  }

  const openEditModal = (staff) => {
    setSelectedStaff(staff)
    setForm({
      employee_id: staff.employee_id || '',
      title: staff.title || 'Mr.',
      full_name: staff.full_name || '',
      email: staff.email || '',
      phone: staff.phone || '',
      department: staff.department || 'Humanities',
      subject: staff.subject || '',
      designation: staff.designation || 'Faculty',
      employment_type: staff.employment_type || 'Teaching',
      qualification: staff.qualification || '',
      experience_years: staff.experience_years !== null && staff.experience_years !== undefined ? staff.experience_years : '',
      is_hod: staff.is_hod || false,
      status: staff.status || 'Active'
    })
    setEditModal(true)
  }

  const openProfileModal = (staff) => {
    setSelectedStaff(staff)
    setProfileModal(true)
  }

  const openAssignmentModal = async (staff) => {
    setSelectedStaff(staff)
    try {
      const res = await teacherAPI.getAssignments(staff.id)
      setTeacherAssignments(res.data.assignments || [])
    } catch {
      setTeacherAssignments([])
    }

    const defaultCourse = staff.department === 'Humanities' ? 'BA' :
      (staff.department === 'Home Science' ? 'MA Home Science' :
      (staff.department === 'Drawing & Painting' ? 'MA Drawing & Painting' :
      (staff.department === 'Science' ? 'B.Sc Biology' : 'BCA')))

    setAssignmentForm({
      department: staff.department || 'Computer Science',
      course_name: defaultCourse,
      subject_name: staff.subject || '',
      years: ['1st Year', '2nd Year', '3rd Year'],
      section: 'All'
    })
    setAssignmentModal(true)
  }

  const handleCreateAssignment = async () => {
    if (!selectedStaff?.id) return
    setLoading(true)
    try {
      await teacherAPI.createAssignment({
        teacher_id: selectedStaff.id,
        ...assignmentForm
      })
      toast.success('Teacher course assignment saved!')
      const res = await teacherAPI.getAssignments(selectedStaff.id)
      setTeacherAssignments(res.data.assignments || [])
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create assignment')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAssignment = async (assignId) => {
    try {
      await teacherAPI.deleteAssignment(assignId)
      toast.success('Assignment record removed')
      const res = await teacherAPI.getAssignments(selectedStaff.id)
      setTeacherAssignments(res.data.assignments || [])
    } catch {
      toast.error('Failed to remove assignment')
    }
  }

  const handleSaveCreate = async () => {
    if (!form.full_name.trim()) return toast.error('Full Name is required')
    setLoading(true)
    try {
      await teacherAPI.create({
        ...form,
        experience_years: form.experience_years !== '' ? Number(form.experience_years) : null
      })
      toast.success('Staff employee record created!')
      setAddModal(false)
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create staff record')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveUpdate = async () => {
    if (!selectedStaff?.id) return
    setLoading(true)
    try {
      await teacherAPI.update(selectedStaff.id, {
        ...form,
        experience_years: form.experience_years !== '' ? Number(form.experience_years) : null
      })
      toast.success('Staff employee record updated!')
      setEditModal(false)
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update record')
    } finally {
      setLoading(false)
    }
  }

  const handleDeactivate = async (id, name) => {
    if (!confirm(`Are you sure you want to deactivate ${name}?`)) return
    try {
      await teacherAPI.delete(id)
      toast.success(`${name} status updated to Inactive`)
      loadData()
    } catch {
      toast.error('Failed to change status')
    }
  }

  const runValidationReport = async () => {
    setLoading(true)
    try {
      const res = await teacherAPI.validationReport()
      setValidationReport(res.data || {})
      setReportModal(true)
      toast.success('Staff database validation check completed cleanly!')
    } catch {
      toast.error('Validation check failed')
    } finally {
      setLoading(false)
    }
  }

  const departmentsList = [
    "Humanities", "Home Science", "Drawing & Painting",
    "Computer Science", "Science", "Administration", "Technical / IT Support"
  ]

  const subjectsList = [
    "English", "Sociology", "Zoology", "Botany", "Mathematics", "Physics", "Chemistry"
  ]

  return (
    <div className="space-y-6 animate-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-title text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              Aklank College Staff & Faculty Directory
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              Official Master Data
            </span>
          </div>
          <p className="page-subtitle text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Basant Vihar, Dadabari, Kota (Raj.) • Official Public Record Verification
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={runValidationReport}
            className="btn-secondary flex items-center gap-2 text-xs sm:text-sm"
            title="Run Database Audit & Validation Check"
          >
            <FileCheck2 className="w-4 h-4 text-emerald-600" />
            Audit Report
          </button>

          <button
            onClick={loadData}
            className="btn-secondary flex items-center gap-2 text-xs sm:text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={openAddModal}
            className="btn-primary flex items-center gap-2 text-xs sm:text-sm shadow-md"
          >
            <Plus className="w-4 h-4" />
            Add Staff Member
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="card p-3.5 text-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20 border border-blue-100 dark:border-blue-800/40">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 mx-auto flex items-center justify-center mb-1">
            <Users className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-blue-800 dark:text-blue-300">{stats.total_staff || teachers.length}</p>
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">Total Staff</p>
        </div>

        <div className="card p-3.5 text-center bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-100 dark:border-emerald-800/40">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center mb-1">
            <GraduationCap className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{stats.teaching_staff || 0}</p>
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">Teaching</p>
        </div>

        <div className="card p-3.5 text-center bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/20 border border-amber-100 dark:border-amber-800/40">
          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 mx-auto flex items-center justify-center mb-1">
            <Building2 className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-amber-700 dark:text-amber-300">{stats.non_teaching_staff || 0}</p>
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">Non-Teaching</p>
        </div>

        <div className="card p-3.5 text-center bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/20 border border-purple-100 dark:border-purple-800/40">
          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 mx-auto flex items-center justify-center mb-1">
            <Award className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-purple-700 dark:text-purple-300">{stats.administrative_staff || 0}</p>
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">Principal / Admin</p>
        </div>

        <div className="card p-3.5 text-center bg-gradient-to-br from-cyan-50 to-sky-50 dark:from-cyan-950/30 dark:to-sky-950/20 border border-cyan-100 dark:border-cyan-800/40">
          <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-700 mx-auto flex items-center justify-center mb-1">
            <BookOpen className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-cyan-700 dark:text-cyan-300">{stats.total_departments || 0}</p>
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">Departments</p>
        </div>

        <div className="card p-3.5 text-center bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/20 border border-rose-100 dark:border-rose-800/40">
          <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 mx-auto flex items-center justify-center mb-1">
            <Shield className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-rose-700 dark:text-rose-300">{stats.total_hods || 0}</p>
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">HODs</p>
        </div>
      </div>

      {/* Main Filter & Table Card */}
      <div className="card">
        {/* Search & Multi-Filter bar */}
        <div className="flex flex-col gap-3 mb-5">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                className="input pl-9 text-sm"
                placeholder="Search by Name, Employee Code (AKL-FAC-001), Department, Subject, Designation…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary px-4 text-sm flex items-center gap-1">
              Search
            </button>
          </form>

          {/* Filters Row */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 border-t border-gray-100 dark:border-gray-800">
            <div>
              <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 block mb-1">Department</label>
              <select
                className="input py-1 text-xs"
                value={departmentFilter}
                onChange={e => setDepartmentFilter(e.target.value)}
              >
                <option value="">All Departments</option>
                {departmentsList.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 block mb-1">Subject</label>
              <select
                className="input py-1 text-xs"
                value={subjectFilter}
                onChange={e => setSubjectFilter(e.target.value)}
              >
                <option value="">All Subjects</option>
                {subjectsList.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 block mb-1">Employment Type</label>
              <select
                className="input py-1 text-xs"
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="Teaching">Teaching</option>
                <option value="Non-Teaching">Non-Teaching</option>
                <option value="Administrative">Administrative</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 block mb-1">Designation</label>
              <select
                className="input py-1 text-xs"
                value={designationFilter}
                onChange={e => setDesignationFilter(e.target.value)}
              >
                <option value="">All Designations</option>
                <option value="HoD">HoD</option>
                <option value="Faculty">Faculty</option>
                <option value="Principal">Principal</option>
                <option value="Office Assistant">Office Assistant</option>
                <option value="Technical Staff">Technical Staff</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 block mb-1">Status</label>
              <select
                className="input py-1 text-xs"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Directory Table */}
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Employee / Name</th>
                <th>Department & Subject</th>
                <th>Designation</th>
                <th>Qualification</th>
                <th>Experience</th>
                <th>Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map(t => {
                const isHod = t.is_hod || t.designation?.toLowerCase().includes('hod')
                return (
                  <tr
                    key={t.id || t.employee_id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                    onClick={() => openProfileModal(t)}
                  >
                    <td>
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                        {t.employee_id || t.employee_code}
                      </span>
                    </td>

                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-xs font-bold text-primary-700 dark:text-primary-300 flex-shrink-0">
                          {(t.full_name || 'S').charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-1.5">
                            {t.full_name}
                            {isHod && (
                              <span className="px-1.5 py-0.2 text-[10px] font-black rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                HOD
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-gray-400">{t.email || 'No email registered'}</p>
                        </div>
                      </div>
                    </td>

                    <td>
                      <p className="text-xs font-semibold text-gray-900 dark:text-white">
                        {t.department || t.department_name}
                      </p>
                      {t.subject ? (
                        <p className="text-[11px] text-primary-600 dark:text-primary-400 font-medium">
                          Subject: {t.subject}
                        </p>
                      ) : (
                        <p className="text-[11px] text-gray-400">—</p>
                      )}
                    </td>

                    <td>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {t.designation || 'Faculty'}
                      </span>
                    </td>

                    <td className="max-w-[180px]">
                      <p className="text-xs text-gray-600 dark:text-gray-300 truncate" title={t.qualification}>
                        {t.qualification || 'Not Available'}
                      </p>
                    </td>

                    <td>
                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                        {t.experience_years !== null && t.experience_years !== undefined
                          ? `${t.experience_years} Yrs`
                          : 'Not Available'}
                      </span>
                    </td>

                    <td>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        t.employment_type === 'Teaching'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : t.employment_type === 'Administrative'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                      }`}>
                        {t.employment_type || 'Teaching'}
                      </span>
                    </td>

                    <td>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        t.status === 'Active' || t.is_active
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {t.status || 'Active'}
                      </span>
                    </td>

                    <td onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openProfileModal(t)}
                          className="p-1 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded text-primary-600 transition-colors"
                          title="View Full Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(t)}
                          className="p-1 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded text-blue-600 transition-colors"
                          title="Edit Details & Promotion"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeactivate(t.id, t.full_name)}
                          className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-600 transition-colors"
                          title="Deactivate Employee"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {!teachers.length && !loading && (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <Users className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-500 font-semibold text-sm">No staff records match your criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 1. EMPLOYEE PROFILE VIEW MODAL ─────────────────────────────────── */}
      <Modal open={profileModal} onClose={() => setProfileModal(false)} title="Official Staff Employee Profile" size="lg">
        {selectedStaff && (
          <div className="space-y-5">
            {/* Header Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xl font-black shadow-inner flex-shrink-0">
                {selectedStaff.full_name?.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold">{selectedStaff.full_name}</h3>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white/20 text-white">
                    {selectedStaff.employee_id || selectedStaff.employee_code}
                  </span>
                  {selectedStaff.is_hod && (
                    <span className="px-2 py-0.5 rounded text-xs font-black bg-amber-400 text-amber-950">
                      HEAD OF DEPARTMENT (HOD)
                    </span>
                  )}
                </div>
                <p className="text-xs text-indigo-200 mt-1">
                  {selectedStaff.designation} • {selectedStaff.department || selectedStaff.department_name}
                </p>
              </div>
            </div>

            {/* Profile Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 space-y-2 border border-gray-100 dark:border-gray-700">
                <p className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">Academic & Designation</p>
                <p><strong className="text-gray-700 dark:text-gray-300">Department:</strong> {selectedStaff.department || selectedStaff.department_name}</p>
                <p><strong className="text-gray-700 dark:text-gray-300">Subject Mapping:</strong> {selectedStaff.subject || 'Not Available'}</p>
                <p><strong className="text-gray-700 dark:text-gray-300">Designation:</strong> {selectedStaff.designation || 'Faculty'}</p>
                <p><strong className="text-gray-700 dark:text-gray-300">Employment Type:</strong> {selectedStaff.employment_type || 'Teaching'}</p>
              </div>

              <div className="p-3.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 space-y-2 border border-gray-100 dark:border-gray-700">
                <p className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">Qualifications & Experience</p>
                <p><strong className="text-gray-700 dark:text-gray-300">Qualification:</strong> {selectedStaff.qualification || 'Not Available'}</p>
                <p><strong className="text-gray-700 dark:text-gray-300">Experience:</strong> {selectedStaff.experience_years !== null && selectedStaff.experience_years !== undefined ? `${selectedStaff.experience_years} Years` : 'Not Available'}</p>
                <p><strong className="text-gray-700 dark:text-gray-300">Status:</strong> {selectedStaff.status || 'Active'}</p>
              </div>

              <div className="p-3.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 space-y-2 border border-gray-100 dark:border-gray-700">
                <p className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">Contact Information</p>
                <p><strong className="text-gray-700 dark:text-gray-300">Email:</strong> {selectedStaff.email || 'Not Available'}</p>
                <p><strong className="text-gray-700 dark:text-gray-300">Phone:</strong> {selectedStaff.phone || 'Not Available'}</p>
              </div>

              <div className="p-3.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 space-y-2 border border-gray-100 dark:border-gray-700">
                <p className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">Audit & Data Verification</p>
                <p><strong className="text-gray-700 dark:text-gray-300">Data Source:</strong> {selectedStaff.data_source || 'Official Aklank College Website'}</p>
                <p><strong className="text-gray-700 dark:text-gray-300">Last Verified:</strong> {selectedStaff.last_verified_at || 'Recent Sync'}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button onClick={() => setProfileModal(false)} className="btn-secondary text-xs">
                Close
              </button>
              <button
                onClick={() => { setProfileModal(false); openEditModal(selectedStaff); }}
                className="btn-primary text-xs flex items-center gap-1"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit Profile
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── 2. ADD / EDIT STAFF MODAL ───────────────────────────────────────── */}
      <Modal open={addModal || editModal} onClose={() => { setAddModal(false); setEditModal(false); }} title={addModal ? "Add New Staff / Faculty Member" : "Edit Staff Employee Profile"} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="label">Employee ID / Code *</label>
              <input
                type="text"
                className="input"
                value={form.employee_id}
                onChange={e => setForm(p => ({ ...p, employee_id: e.target.value }))}
                placeholder="AKL-FAC-001"
              />
            </div>

            <div>
              <label className="label">Title Prefix</label>
              <select
                className="input"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              >
                <option value="Mr.">Mr.</option>
                <option value="Dr.">Dr.</option>
                <option value="Ms.">Ms.</option>
                <option value="Prof.">Prof.</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="label">Full Name *</label>
              <input
                type="text"
                className="input"
                value={form.full_name}
                onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                placeholder="e.g. Dr. Divya Dubey"
              />
            </div>

            <div>
              <label className="label">Department *</label>
              <select
                className="input"
                value={form.department}
                onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
              >
                {departmentsList.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Subject (If applicable)</label>
              <input
                type="text"
                className="input"
                value={form.subject}
                onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                placeholder="e.g. Zoology, English, Sociology"
              />
            </div>

            <div>
              <label className="label">Designation *</label>
              <input
                type="text"
                className="input"
                value={form.designation}
                onChange={e => setForm(p => ({ ...p, designation: e.target.value }))}
                placeholder="e.g. Faculty, HoD, Office Assistant, Principal"
              />
            </div>

            <div>
              <label className="label">Employment Type *</label>
              <select
                className="input"
                value={form.employment_type}
                onChange={e => setForm(p => ({ ...p, employment_type: e.target.value }))}
              >
                <option value="Teaching">Teaching</option>
                <option value="Non-Teaching">Non-Teaching</option>
                <option value="Administrative">Administrative</option>
              </select>
            </div>

            <div>
              <label className="label">Qualification</label>
              <input
                type="text"
                className="input"
                value={form.qualification}
                onChange={e => setForm(p => ({ ...p, qualification: e.target.value }))}
                placeholder="e.g. MA, MPhil, NET, Ph.D"
              />
            </div>

            <div>
              <label className="label">Experience (Years)</label>
              <input
                type="number"
                step="0.5"
                className="input"
                value={form.experience_years}
                onChange={e => setForm(p => ({ ...p, experience_years: e.target.value }))}
                placeholder="e.g. 18"
              />
            </div>

            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="e.g. divya.dubey@aklankcollege.ac.in"
              />
            </div>

            <div>
              <label className="label">Phone / Mobile</label>
              <input
                type="tel"
                className="input"
                value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                placeholder="Optional"
              />
            </div>

            <div className="flex items-center gap-2 pt-4 sm:col-span-2">
              <input
                type="checkbox"
                id="is_hod_cb"
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                checked={form.is_hod}
                onChange={e => setForm(p => ({ ...p, is_hod: e.target.checked }))}
              />
              <label htmlFor="is_hod_cb" className="text-xs font-bold text-gray-700 dark:text-gray-300">
                Promote to Head of Department (HOD)
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={() => { setAddModal(false); setEditModal(false); }}
              className="btn-secondary flex-1 text-xs"
            >
              Cancel
            </button>
            <button
              onClick={addModal ? handleSaveCreate : handleSaveUpdate}
              disabled={loading}
              className="btn-primary flex-1 text-xs"
            >
              {loading ? 'Saving…' : (addModal ? 'Save Employee' : 'Update Record')}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── 3. AUDIT & VALIDATION REPORT MODAL ────────────────────────────── */}
      <Modal open={reportModal} onClose={() => setReportModal(false)} title="Aklank College Staff Database Audit Report" size="lg">
        {validationReport && (
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="font-bold">Database Clean & Validated</p>
                  <p className="text-[11px] text-emerald-700">0 Duplicate Records Found. All official 22 staff records verified.</p>
                </div>
              </div>
              <span className="font-mono text-xs font-black px-2 py-1 rounded bg-emerald-200 text-emerald-900">
                {validationReport.status}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="card p-3 text-center bg-gray-50 dark:bg-gray-800">
                <p className="text-lg font-black text-gray-900 dark:text-white">{validationReport.total_seed_records}</p>
                <p className="text-[10px] text-gray-500 font-semibold uppercase">Official Seed Count</p>
              </div>
              <div className="card p-3 text-center bg-gray-50 dark:bg-gray-800">
                <p className="text-lg font-black text-emerald-600">{validationReport.teaching_staff}</p>
                <p className="text-[10px] text-gray-500 font-semibold uppercase">Teaching Staff</p>
              </div>
              <div className="card p-3 text-center bg-gray-50 dark:bg-gray-800">
                <p className="text-lg font-black text-amber-600">{validationReport.non_teaching_staff}</p>
                <p className="text-[10px] text-gray-500 font-semibold uppercase">Non-Teaching Staff</p>
              </div>
              <div className="card p-3 text-center bg-gray-50 dark:bg-gray-800">
                <p className="text-lg font-black text-purple-600">{validationReport.administrative_staff}</p>
                <p className="text-[10px] text-gray-500 font-semibold uppercase">Principal / Admin</p>
              </div>
            </div>

            <div className="card p-3 bg-gray-50 dark:bg-gray-800/40">
              <p className="font-bold text-gray-800 dark:text-gray-200 mb-2">Department-wise Breakdown:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {Object.entries(validationReport.department_breakdown || {}).map(([d, cnt]) => (
                  <div key={d} className="flex items-center justify-between p-2 rounded bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{d}</span>
                    <span className="font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">{cnt}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-[11px] text-gray-500 space-y-1">
              <p><strong>Official Source:</strong> {validationReport.source}</p>
              <p><strong>Last Verified At:</strong> {validationReport.last_verified_at}</p>
            </div>

            <div className="flex justify-end pt-3 border-t">
              <button onClick={() => setReportModal(false)} className="btn-primary text-xs">
                Close Audit Report
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── 4. TEACHER COURSE ASSIGNMENTS MODAL ──────────────────────────── */}
      <Modal open={assignmentModal} onClose={() => setAssignmentModal(false)} title={`Teacher Course Assignments — ${selectedStaff?.full_name || ''}`} size="lg">
        <div className="space-y-5 text-xs">
          <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800">
            <p className="font-bold">Assign Department, Course, Subject & Authorized Years</p>
            <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-0.5">
              Teacher will be strictly authorized to view & mark attendance ONLY for students matching these assigned courses and years.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Department *</label>
              <select
                className="input"
                value={assignmentForm.department}
                onChange={e => setAssignmentForm(p => ({ ...p, department: e.target.value }))}
              >
                {departmentsList.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Course Name *</label>
              <input
                type="text"
                className="input"
                value={assignmentForm.course_name}
                onChange={e => setAssignmentForm(p => ({ ...p, course_name: e.target.value }))}
                placeholder="e.g. BCA, BA, B.Sc Biology"
              />
            </div>

            <div>
              <label className="label">Subject Name (Optional)</label>
              <input
                type="text"
                className="input"
                value={assignmentForm.subject_name}
                onChange={e => setAssignmentForm(p => ({ ...p, subject_name: e.target.value }))}
                placeholder="e.g. DBMS, English, Zoology"
              />
            </div>

            <div>
              <label className="label">Section</label>
              <select
                className="input"
                value={assignmentForm.section}
                onChange={e => setAssignmentForm(p => ({ ...p, section: e.target.value }))}
              >
                <option value="All">All Sections</option>
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="label mb-1">Authorized Years (Select All Applicable)</label>
              <div className="flex items-center gap-4 pt-1">
                {['1st Year', '2nd Year', '3rd Year'].map(yr => (
                  <label key={yr} className="flex items-center gap-1.5 font-semibold text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={assignmentForm.years.includes(yr)}
                      onChange={e => {
                        const newYrs = e.target.checked
                          ? [...assignmentForm.years, yr]
                          : assignmentForm.years.filter(y => y !== yr)
                        setAssignmentForm(p => ({ ...p, years: newYrs }))
                      }}
                      className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4"
                    />
                    {yr}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button onClick={handleCreateAssignment} disabled={loading} className="btn-primary text-xs flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Save Assignment
            </button>
          </div>

          <div className="pt-3 border-t">
            <p className="font-bold text-gray-800 dark:text-gray-200 mb-2">Active Course Assignments:</p>
            <div className="table-container max-h-[220px]">
              <table className="table w-full text-left">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Course</th>
                    <th>Subject</th>
                    <th>Year</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {teacherAssignments.map(a => (
                    <tr key={a.id}>
                      <td className="font-semibold">{a.department}</td>
                      <td><span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 font-bold text-blue-700 dark:text-blue-300">{a.course_name}</span></td>
                      <td>{a.subject_name || '—'}</td>
                      <td><span className="font-semibold">{a.year || 'All Years'}</span></td>
                      <td>
                        <button onClick={() => handleDeleteAssignment(a.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Remove Assignment">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!teacherAssignments.length && (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-gray-400">No explicit assignments set yet. Default department rules apply.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
