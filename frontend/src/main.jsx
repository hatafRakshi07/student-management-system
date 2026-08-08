import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

// Automatically force update Service Worker when new build is available
const updateSW = registerSW({
  onNeedRefresh() {
    updateSW(true)
  },
  onOfflineReady() {},
})

// Auto-reload page and clear stale caches if browser tries to execute a deleted JS chunk from an old build
window.addEventListener('error', (e) => {
  if (
    e?.message?.includes('Loading chunk') ||
    e?.message?.includes('Failed to fetch dynamically imported module') ||
    e?.message?.includes('Failed to construct') ||
    e?.message?.includes('Invalid URL')
  ) {
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name))
      })
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((r) => r.unregister())
      })
    }
    const lastReload = sessionStorage.getItem('last_stale_reload')
    const now = Date.now()
    if (!lastReload || now - parseInt(lastReload, 10) > 5000) {
      sessionStorage.setItem('last_stale_reload', now.toString())
      window.location.reload()
    }
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
