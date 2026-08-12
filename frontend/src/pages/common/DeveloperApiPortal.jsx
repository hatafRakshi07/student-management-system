import React, { useState } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { Code, Key, Webhook, FileText, Copy, CheckCircle, ShieldAlert } from 'lucide-react'

export default function DeveloperApiPortal() {
  const [keyName, setKeyName] = useState('')
  const [issuedApiKey, setIssuedApiKey] = useState('')
  const [targetUrl, setTargetUrl] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')

  const handleGenerateKey = async (e) => {
    e.preventDefault()
    try {
      const res = await api.post('/developer/api-keys/generate', { key_name: keyName })
      setIssuedApiKey(res.data.api_key)
      toast.success('Developer API Key Issued Successfully!')
      setKeyName('')
    } catch {
      toast.error('Failed to issue API key')
    }
  }

  const handleSubscribeWebhook = async (e) => {
    e.preventDefault()
    try {
      const res = await api.post('/developer/webhooks/subscribe', { target_url: targetUrl })
      setWebhookSecret(res.data.webhook_secret)
      toast.success('Webhook Subscription Activated!')
      setTargetUrl('')
    } catch {
      toast.error('Failed to subscribe webhook')
    }
  }

  return (
    <div className="space-y-6 animate-page">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Code className="w-7 h-7 text-primary-700" /> Enterprise Public API Gateway & Developer Hub
        </h1>
        <p className="page-subtitle">Bearer API Keys, Real-Time Webhook Event Engine & OpenAPI 3.0 Documentation</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Developer API Key Generator */}
        <div className="card p-6 space-y-4">
          <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-amber-600" /> Generate Bearer API Key
          </h3>
          <p className="text-xs text-gray-500">Issue secure API keys with 1000 req/min rate limit for REST integration.</p>

          <form onSubmit={handleGenerateKey} className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Key Application / Service Name</label>
              <input type="text" required value={keyName} onChange={e => setKeyName(e.target.value)} placeholder="e.g. Moodle LMS Connector" className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-800" />
            </div>
            <button type="submit" className="w-full btn-primary py-2.5 text-xs flex items-center justify-center gap-2">
              <Key className="w-4 h-4" /> Issue Live Bearer Token
            </button>
          </form>

          {issuedApiKey && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-1">
              <p className="text-[10px] font-bold text-amber-700 uppercase">Save your API Key (Shown Once):</p>
              <p className="font-mono text-xs font-bold text-gray-900 dark:text-white break-all">{issuedApiKey}</p>
            </div>
          )}
        </div>

        {/* Webhook Subscription Engine */}
        <div className="card p-6 space-y-4">
          <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
            <Webhook className="w-5 h-5 text-purple-600" /> Real-Time Webhook Subscription
          </h3>
          <p className="text-xs text-gray-500">Subscribe your HTTP endpoints to ERP events (FEE_PAID, STUDENT_CREATED, RESULT_PUBLISHED).</p>

          <form onSubmit={handleSubscribeWebhook} className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Target Webhook HTTPS URL</label>
              <input type="url" required value={targetUrl} onChange={e => setTargetUrl(e.target.value)} placeholder="https://api.yourdomain.com/erp-events" className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-800" />
            </div>
            <button type="submit" className="w-full btn-primary py-2.5 text-xs flex items-center justify-center gap-2">
              <Webhook className="w-4 h-4" /> Activate Event Stream Webhook
            </button>
          </form>

          {webhookSecret && (
            <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl space-y-1">
              <p className="text-[10px] font-bold text-purple-700 uppercase">Webhook HMAC Signing Secret:</p>
              <p className="font-mono text-xs font-bold text-gray-900 dark:text-white break-all">{webhookSecret}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
