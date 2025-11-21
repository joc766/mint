"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { apiClient } from "@/lib/api-client"
import type { UserResponse, LoginResponse } from "@/lib/types"

interface AuthContextType {
  user: UserResponse | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ error?: string }>
  register: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("auth_token")
      if (token) {
        apiClient.setToken(token)
        const { data, error, status } = await apiClient.get<UserResponse>("/me")
        if (error || status !== 200 || !data) {
          // Token is invalid, clear it
          apiClient.clearToken()
          setIsAuthenticated(false)
          setUser(null)
        } else {
          // Token is valid, set authenticated state
          setUser(data)
          setIsAuthenticated(true)
        }
      }
      setIsLoading(false)
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const params = new URLSearchParams({
        email,
        password,
      })
      const { data, error, status } = await apiClient.post<LoginResponse>(`/auth/login?${params.toString()}`)

      if (error || status !== 200) {
        return { error: error || "Login failed" }
      }

      if (data?.access_token) {
        apiClient.setToken(data.access_token)
        const userData = await apiClient.get<UserResponse>("/me")
        if (userData.error || userData.status !== 200 || !userData.data) {
          return { error: userData.error || "Failed to retrieve current user" }
        }
        setUser(userData.data)
        setIsAuthenticated(true)
        return {}
      }

      return { error: "No access token received" }
    } catch (err) {
      return { error: "An unexpected error occurred" }
    }
  }

  const register = async (email: string, password: string, first_name?: string, last_name?: string) => {
    try {
      const userData = await apiClient.post<UserResponse>("/users/", {
        email,
        password,
        first_name,
        last_name
      })

      if (userData.error || userData.status !== 200) {
        return { error: userData.error || "Registration failed" }
      }

      const params = new URLSearchParams({
        email,
        password,
      })
      const authData = await apiClient.post<LoginResponse>(`/auth/login?${params.toString()}`)
      if (authData.data?.access_token){
        apiClient.setToken(authData.data.access_token)
        setIsAuthenticated(true)
      }

      if (userData.data) {
        setUser(userData.data)
        return {}
      }

      return { error: "Registration failed" }
    } catch (err) {
      return { error: "An unexpected error occurred" }
    }
  }

  const logout = () => {
    apiClient.clearToken()
    setUser(null)
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
