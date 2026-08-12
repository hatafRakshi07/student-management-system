import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { notificationAPI } from '../services/api'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'

const NotificationContext = createContext(null)

// ─── Resolve the correct WebSocket URL permanently ──────────────────────────
// Vercel CANNOT handle persistent WebSocket connections — it's a serverless
// static host. We must ALWAYS connect to the Render backend directly.
// We detect Vercel by checking window.location.hostname (most reliable).
function getWsUrl(userId) {
  if (typeof window === 'undefined' || !window.location) return null

  const { hostname, protocol, port } = window.location

  // Local dev → proxy to local backend
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `ws://localhost:8000/ws/${userId}`
  }

  // ANY Vercel deployment (production, preview, branch deploys — all match *.vercel.app)
  // Must always redirect to the persistent Render backend WS endpoint.
  if (hostname.endsWith('.vercel.app') || hostname.includes('vercel.app')) {
    return `wss://student-management-system-9yuf.onrender.com/ws/${userId}`
  }

  // Any other deployment (custom domain, Railway, Heroku, etc.)
  // Assume the backend is co-located on the same host
  const wsProto = protocol === 'https:' ? 'wss:' : 'ws:'
  const p = port ? `:${port}` : ''
  return `${wsProto}//${hostname}${p}/ws/${userId}`
}

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  const socketRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const reconnectAttemptsRef = useRef(0)
  const isMountedRef = useRef(true)

  const fetchNotifications = useCallback(async () => {
    if (!user) return
    try {
      const res = await notificationAPI.list()
      if (isMountedRef.current) {
        setNotifications(res.data.notifications || [])
        setUnread(res.data.unread || 0)
      }
    } catch {}
  }, [user])

  const connectWebSocket = useCallback(() => {
    if (!user?.id || !isMountedRef.current) return

    const wsUrl = getWsUrl(user.id)
    if (!wsUrl) return

    // Clean up any existing socket before creating a new one
    if (socketRef.current) {
      socketRef.current.onerror = null
      socketRef.current.onopen = null
      socketRef.current.onmessage = null
      socketRef.current.onclose = null
      if (
        socketRef.current.readyState === WebSocket.OPEN ||
        socketRef.current.readyState === WebSocket.CONNECTING
      ) {
        socketRef.current.close()
      }
      socketRef.current = null
    }

    try {
      const socket = new WebSocket(wsUrl)
      socketRef.current = socket

      // Silence connection errors (backend may be sleeping on Render free tier)
      socket.onerror = () => {}

      socket.onopen = () => {
        // Reset reconnect counter on successful connection
        reconnectAttemptsRef.current = 0
      }

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'new_notification' || data.type === 'new_message' || data.title) {
            toast.info(data.title || data.content || 'New notification received!')
            fetchNotifications()
          }
        } catch {
          fetchNotifications()
        }
      }

      // Auto-reconnect with exponential backoff (max 30s) on unexpected close
      socket.onclose = (event) => {
        if (!isMountedRef.current) return
        // Don't reconnect if we cleanly closed (code 1000)
        if (event.code === 1000) return

        const attempts = reconnectAttemptsRef.current
        const delay = Math.min(1000 * Math.pow(2, attempts), 30000) // 1s, 2s, 4s … 30s
        reconnectAttemptsRef.current = attempts + 1

        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) connectWebSocket()
        }, delay)
      }
    } catch {
      // WebSocket constructor failed — silently skip (e.g. SSR or restricted env)
    }
  }, [user, fetchNotifications])

  useEffect(() => {
    isMountedRef.current = true
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000)
    connectWebSocket()

    return () => {
      isMountedRef.current = false
      clearInterval(interval)
      clearTimeout(reconnectTimeoutRef.current)

      if (socketRef.current) {
        socketRef.current.onerror = null
        socketRef.current.onopen = null
        socketRef.current.onmessage = null
        socketRef.current.onclose = null
        if (
          socketRef.current.readyState === WebSocket.OPEN ||
          socketRef.current.readyState === WebSocket.CONNECTING
        ) {
          socketRef.current.close(1000, 'Component unmounting')
        }
        socketRef.current = null
      }
    }
  }, [user, fetchNotifications, connectWebSocket])

  const markRead = async (id) => {
    await notificationAPI.markRead(id)
    fetchNotifications()
  }

  return (
    <NotificationContext.Provider value={{ notifications, unread, markRead, refetch: fetchNotifications }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationContext)
}
