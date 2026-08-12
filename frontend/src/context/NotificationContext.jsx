import React, { createContext, useContext, useState, useEffect } from 'react'
import { notificationAPI, getBaseURL } from '../services/api'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)

  const fetchNotifications = async () => {
    if (!user) return
    try {
      const res = await notificationAPI.list()
      setNotifications(res.data.notifications || [])
      setUnread(res.data.unread || 0)
    } catch {}
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000)

    let socket = null
    if (user?.id && typeof window !== 'undefined' && window.location) {
      // WebSocket must connect to the BACKEND server, NOT the frontend host.
      // Vercel is a static site host — it cannot handle WebSocket connections.
      // Always derive WS URL from the API base URL (which points to Render backend).
      let wsUrl = ''
      try {
        const apiBase = getBaseURL()
        const parsedApi = new URL(apiBase)
        // Vercel serverless platform cannot handle persistent WebSockets.
        // Direct WebSockets to the persistent Render backend or local dev server.
        if (parsedApi.host.includes('vercel.app')) {
          wsUrl = `wss://student-management-system-9yuf.onrender.com/ws/${user.id}`
        } else if (parsedApi.host === 'localhost' || parsedApi.host === '127.0.0.1') {
          wsUrl = `ws://${parsedApi.host}:8000/ws/${user.id}`
        } else {
          const wsProto = parsedApi.protocol === 'https:' ? 'wss:' : 'ws:'
          wsUrl = `${wsProto}//${parsedApi.host}/ws/${user.id}`
        }
      } catch {
        wsUrl = `wss://student-management-system-9yuf.onrender.com/ws/${user.id}`
      }

      try {
        socket = new WebSocket(wsUrl)
        socket.onerror = () => {} // Suppress console error if WS backend is unavailable
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
      } catch {}
    }

    return () => {
      clearInterval(interval)
      if (socket) {
        socket.onerror = null
        socket.onopen = null
        socket.onmessage = null
        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
          socket.close()
        }
      }
    }
  }, [user])

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
