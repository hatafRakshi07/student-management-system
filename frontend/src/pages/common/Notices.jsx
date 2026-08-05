import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { noticeAPI } from '../../services/api'
import toast from 'react-hot-toast'
import Modal from '../../components/common/Modal'
import { Plus, Bell, Trash2, Megaphone } from 'lucide-react'

const targetColors = { all: 'badge-blue', student: 'badge-green', teacher: 'badge-purple', parent: 'badge-yellow' }

export default function Notices() {
  const { user } = useAuth()
  const [notices, setNotices] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', target_role: 'all' })
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')

  const load = () => noticeAPI.list().then(r => setNotices(r.data.notices || [])).catch(() => {})
  useEffect(() => { load() }, [])

  const create = async () => {
    if (!form.title || !form.description) return toast.error('Fill all fields')
    setLoading(true)
    try {
      await noticeAPI.create(form)
      toast.success('Notice published!')
      setModal(false)
      setForm({ title: '', description: '', target_role: 'all' })
      load()
    } catch { toast.error('Failed') } finally { setLoading(false) }
  }

  const del = async (id) => {
    await noticeAPI.delete(id)
    toast.success('Notice deleted')
    load()
  }

  const canPost = user?.role === 'teacher' || user?.role === 'admin'
  const filtered = filter === 'all' ? notices : notices.filter(n => n.target_role === filter || n.target_role === 'all')

  return (
    <div className="space-y-5 animate-page">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="page-title">Notices &amp; Announcements</h1>
          <p className="page-subtitle">{notices.length} notice{notices.length !== 1 ? 's' : ''} posted</p>
        </div>
        {canPost && (
          <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2 self-start">
            <Plus className="h-4 w-4" /> Post Notice
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'student', 'teacher', 'parent'].map(r => (
          <button key={r} onClick={() => setFilter(r)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${filter === r ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
            {r === 'all' ? 'All Notices' : `For ${r}s`}
          </button>
        ))}
      </div>

      {/* Notices list */}
      <div className="space-y-3">
        {filtered.map(n => (
          <div key={n.id} className="card border-l-4 border-l-primary-400 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <Megaphone className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{n.title}</h3>
                  {canPost && (
                    <button onClick={() => del(n.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500 hover:text-red-700 transition-colors flex-shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-sm mt-1 leading-relaxed">{n.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-400">{new Date(n.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span className={`badge text-xs ${targetColors[n.target_role] || 'badge-blue'}`}>{n.target_role}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
        {!filtered.length && (
          <div className="card text-center py-16">
            <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-500 font-medium">No notices found</p>
            <p className="text-gray-400 text-sm mt-1">{canPost ? 'Post a notice to get started.' : 'Check back later.'}</p>
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Post a Notice">
        <div className="space-y-4">
          <div>
            <label className="label">Title *</label>
            <input className="input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Notice title" />
          </div>
          <div>
            <label className="label">Content *</label>
            <textarea className="input h-32 resize-none" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Write the notice content here…" />
          </div>
          <div>
            <label className="label">Target Audience</label>
            <select className="input" value={form.target_role} onChange={e => setForm(p => ({ ...p, target_role: e.target.value }))}>
              {['all', 'student', 'teacher', 'parent'].map(r => <option key={r} value={r}>{r === 'all' ? 'Everyone' : r.charAt(0).toUpperCase() + r.slice(1) + 's'}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={create} disabled={loading} className="btn-primary flex-1">{loading ? 'Posting…' : 'Publish Notice'}</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
