import React, { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Building2, Plus, Globe, ShieldCheck, DollarSign, Users, Award, Sparkles } from 'lucide-react'

export default function SuperAdminTenantHub() {
  const [tenants, setTenants] = useState([])
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)

  // Form State
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [domain, setDomain] = useState('')
  const [plan, setPlan] = useState('ENTERPRISE')

  const loadTenantData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      const [listRes, dashRes] = await Promise.all([
        axios.get('/api/tenants/list', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/tenants/super-admin/dashboard', { headers: { Authorization: `Bearer ${token}` } })
      ])

      setTenants(listRes.data.tenants || [])
      setDashboard(dashRes.data)
    } catch {
      toast.error('Failed to load Multi-Campus Tenant data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTenantData()
  }, [])

  const handleCreateTenant = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('access_token')
      await axios.post('/api/tenants/create', { name, code, domain, plan }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('New Campus Tenant Provisioned Successfully!')
      setName('')
      setCode('')
      setDomain('')
      loadTenantData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to provision tenant')
    }
  }

  return (
    <div className="space-y-6 animate-page">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Building2 className="w-7 h-7 text-primary-700" /> Multi-Campus Enterprise SaaS Command Center
        </h1>
        <p className="page-subtitle">Super Admin Multi-Tenant Provisioning, Domain Isolation & SaaS Subscriptions</p>
      </div>

      {dashboard && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="card p-4 space-y-1">
            <p className="text-xs text-gray-500 font-bold uppercase">Total Campuses</p>
            <p className="text-2xl font-black text-primary-700">{dashboard.total_campuses}</p>
          </div>
          <div className="card p-4 space-y-1">
            <p className="text-xs text-gray-500 font-bold uppercase">Enrolled Students</p>
            <p className="text-2xl font-black text-emerald-600">{dashboard.total_enrolled_students}</p>
          </div>
          <div className="card p-4 space-y-1">
            <p className="text-xs text-gray-500 font-bold uppercase">Cross-Campus Revenue</p>
            <p className="text-2xl font-black text-purple-600">₹{dashboard.cross_campus_revenue_realized.toLocaleString('en-IN')}</p>
          </div>
          <div className="card p-4 space-y-1">
            <p className="text-xs text-gray-500 font-bold uppercase">SaaS License</p>
            <span className="badge badge-green mt-1">ENTERPRISE v1.0.0</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campus Tenants List */}
        <div className="lg:col-span-2 card p-5 space-y-4">
          <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary-600" /> Registered Campus Tenants
          </h3>

          <div className="table-container max-h-[400px] overflow-y-auto">
            <table className="table w-full text-left border-collapse">
              <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 z-10 text-xs font-bold text-gray-700 dark:text-gray-300">
                <tr>
                  <th className="p-3">Campus Code</th>
                  <th className="p-3">College Name</th>
                  <th className="p-3">Domain</th>
                  <th className="p-3 text-center">Subscription Plan</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                {tenants.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-3 font-mono font-bold text-primary-700">{t.code}</td>
                    <td className="p-3 font-bold text-gray-900 dark:text-white">{t.name}</td>
                    <td className="p-3 font-mono text-gray-500">{t.domain}</td>
                    <td className="p-3 text-center"><span className="badge badge-purple">{t.plan}</span></td>
                    <td className="p-3 text-center"><span className="badge badge-green">ACTIVE</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Provision Campus Form */}
        <div className="card p-5 space-y-4">
          <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-600" /> Provision New Campus Tenant
          </h3>

          <form onSubmit={handleCreateTenant} className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">College Campus Name</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Aklank North Campus" className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-800" />
            </div>

            <div>
              <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Tenant Code</label>
              <input type="text" required value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. AKLANK_NORTH" className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-800" />
            </div>

            <div>
              <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Custom Domain URL</label>
              <input type="text" value={domain} onChange={e => setDomain(e.target.value)} placeholder="north.aklankerp.edu.in" className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-800" />
            </div>

            <div>
              <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Subscription Tier</label>
              <select value={plan} onChange={e => setPlan(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-800">
                <option value="STANDARD">STANDARD (Up to 5,000 Students)</option>
                <option value="PROFESSIONAL">PROFESSIONAL (Up to 15,000 Students)</option>
                <option value="ENTERPRISE">ENTERPRISE (Unlimited Campus & API)</option>
              </select>
            </div>

            <button type="submit" className="w-full btn-primary py-2.5 text-xs flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4" /> Provision Campus & Allocate DB
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
