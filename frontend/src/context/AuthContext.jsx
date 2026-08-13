import React, { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
      const localUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null
      if (token && localUser) {
        return JSON.parse(localUser)
      }
    } catch {
      // Ignore JSON parse error
    }
    return null
  })

  // If cached user & token exist, don't block initial render with FullPageLoader
  const [loading, setLoading] = useState(() => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
      const localUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null
      return !(token && localUser)
    } catch {
      return false
    }
  })

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setLoading(false)
      return
    }

    // Refresh user profile in background & validate token
    authAPI.getMe()
      .then(res => {
        setUser(res.data)
        localStorage.setItem('user', JSON.stringify(res.data))
      })
      .catch((err) => {
        // If explicitly 401 unauthorized (token expired / revoked), clear session
        if (err.response?.status === 401) {
          localStorage.removeItem('access_token')
          localStorage.removeItem('user')
          setUser(null)
        } else {
          // If network / server cold start, keep the optimistic user data intact
          const localUser = localStorage.getItem('user')
          if (localUser) {
            try {
              setUser(JSON.parse(localUser))
            } catch {}
          }
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password })
    const { access_token, user: userData } = res.data
    localStorage.setItem('access_token', access_token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    return userData
  }

  const logout = async () => {
    try {
      await authAPI.logout()
    } catch {
      // Proceed with local cleanup even if the server call fails
    }
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    setUser(null)
  }

  const updateUser = (updates) => {
    const updated = { ...user, ...updates }
    localStorage.setItem('user', JSON.stringify(updated))
    setUser(updated)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
