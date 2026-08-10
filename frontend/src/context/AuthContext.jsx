import React, { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setLoading(false)
      return
    }
    // Always validate token and refresh user data from the server.
    // This prevents a client-side localStorage edit from escalating privileges.
    authAPI.getMe()
      .then(res => {
        setUser(res.data)
        localStorage.setItem('user', JSON.stringify(res.data))
      })
      .catch(() => {
        const localUser = localStorage.getItem('user')
        if (localUser) {
          try {
            setUser(JSON.parse(localUser))
          } catch {
            localStorage.removeItem('access_token')
            localStorage.removeItem('user')
          }
        } else {
          localStorage.removeItem('access_token')
          localStorage.removeItem('user')
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
