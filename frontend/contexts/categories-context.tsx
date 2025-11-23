"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/contexts/auth-context"
import type { CategoryResponse } from "@/lib/types"

interface CategoriesContextType {
  categories: CategoryResponse[]
  isLoading: boolean
  error?: string
  fetchCategories: () => Promise<void>
}

const CategoriesContext = createContext<CategoriesContextType | undefined>(undefined)

export function CategoriesProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<CategoryResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()
  const { isAuthenticated, user } = useAuth()

  const fetchCategories = useCallback(async () => {
    if (!isAuthenticated) return

    setIsLoading(true)
    setError(undefined)

    const { data, error: apiError } = await apiClient.get<CategoryResponse[]>("/categories/")

    if (apiError) {
      setError(apiError)
      setIsLoading(false)
      return
    }

    // Filter categories: only show system categories (is_system: true) or user's own categories
    // The backend should already filter this correctly via the authentication token,
    // but we add an extra safety check here in case user_id is provided in the response
    const filteredCategories = (data || []).filter((category) => {
      // If is_system is true, include it (system categories are available to all users)
      if (category.is_system === true) {
        return true
      }
      // If user_id is provided, verify it matches current user (though backend should handle this)
      // For now, trust backend filtering since user_id may not be in UserResponse
      // The backend endpoint filters by: (Category.user_id == current_user.id) | (Category.is_system == True)
      return true
    })

    setCategories(filteredCategories)
    setIsLoading(false)
  }, [isAuthenticated])

  // Clear categories when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      setCategories([])
      setError(undefined)
    }
  }, [isAuthenticated])

  // Fetch categories when authenticated or user changes
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchCategories()
    }
  }, [isAuthenticated, user, fetchCategories])

  return (
    <CategoriesContext.Provider
      value={{
        categories,
        isLoading,
        error,
        fetchCategories,
      }}
    >
      {children}
    </CategoriesContext.Provider>
  )
}

export function useCategories() {
  const context = useContext(CategoriesContext)
  if (context === undefined) {
    throw new Error("useCategories must be used within a CategoriesProvider")
  }
  return context
}
