"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/contexts/auth-context"
import type {
  BudgetTemplateResponse,
  BudgetTemplateUpdate,
  BudgetTemplateCreate,
  UserBudgetSettingsResponse,
  UserBudgetSettingsCreate,
} from "@/lib/types"

interface BudgetContextType {
  budgetTemplate: BudgetTemplateResponse | null
  budgetSettings: UserBudgetSettingsResponse | null
  isLoading: boolean
  error?: string
  fetchMonthlyBudget: (year: number, month: number) => Promise<BudgetTemplateResponse | null>
  createMonthlyBudget: (budget: BudgetTemplateCreate) => Promise<BudgetTemplateResponse | null>
  updateMonthlyBudget: (year: number, month: number, update: BudgetTemplateUpdate) => Promise<boolean>
  fetchBudgetSettings: () => Promise<void>
  updateBudgetSettings: (settings: UserBudgetSettingsCreate) => Promise<boolean>
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined)

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const [budgetTemplate, setBudgetTemplate] = useState<BudgetTemplateResponse | null>(null)
  const [budgetSettings, setBudgetSettings] = useState<UserBudgetSettingsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()
  const { isAuthenticated } = useAuth()

  const fetchMonthlyBudget = async (year: number, month: number): Promise<BudgetTemplateResponse | null> => {
    if (!isAuthenticated) return null

    setIsLoading(true)
    setError(undefined)

    try {
      const { data, error: apiError } = await apiClient.get<BudgetTemplateResponse>(`/budget/monthly/${year}/${month}/`)

      if (apiError) {
        // 404 is expected if budget doesn't exist yet
        if (apiError.includes("404") || apiError.includes("not found")) {
          // Clear budget template when budget doesn't exist for the requested month
          setBudgetTemplate(null)
          setIsLoading(false)
          return null
        }
        setError(apiError)
        setIsLoading(false)
        return null
      }

      // Only set budget template if it matches the requested month/year
      if (data && data.year === year && data.month === month) {
        setBudgetTemplate(data)
      } else {
        setBudgetTemplate(null)
      }
      setIsLoading(false)
      return data || null
    } catch (err) {
      // 404 is expected if budget doesn't exist yet
      if (err instanceof Error && (err.message.includes("404") || err.message.includes("not found"))) {
        // Clear budget template when budget doesn't exist
        setBudgetTemplate(null)
        setIsLoading(false)
        return null
      }
      setError(err instanceof Error ? err.message : "Failed to fetch budget")
      setIsLoading(false)
      return null
    }
  }

  const createMonthlyBudget = async (budget: BudgetTemplateCreate): Promise<BudgetTemplateResponse | null> => {
    if (!isAuthenticated) return null

    setIsLoading(true)
    setError(undefined)

    try {
      const { data, error: apiError } = await apiClient.post<BudgetTemplateResponse>("/budget/monthly/", budget)

      if (apiError) {
        setError(apiError)
        setIsLoading(false)
        return null
      }

      setBudgetTemplate(data || null)
      setIsLoading(false)
      return data || null
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create budget")
      setIsLoading(false)
      return null
    }
  }

  const updateMonthlyBudget = async (year: number, month: number, update: BudgetTemplateUpdate): Promise<boolean> => {
    if (!isAuthenticated) return false

    setIsLoading(true)
    setError(undefined)

    try {
      const { data, error: apiError } = await apiClient.put<BudgetTemplateResponse>(`/budget/monthly/${year}/${month}/`, update)

      if (apiError) {
        setError(apiError)
        setIsLoading(false)
        return false
      }

      setBudgetTemplate(data || null)
      setIsLoading(false)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update budget")
      setIsLoading(false)
      return false
    }
  }

  const fetchBudgetSettings = async () => {
    if (!isAuthenticated) return

    try {
      const { data, error: apiError } = await apiClient.get<UserBudgetSettingsResponse>("/budget/settings/")

      if (apiError) {
        setError(apiError)
        return
      }

      setBudgetSettings(data || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch budget settings")
    }
  }

  const updateBudgetSettings = async (settings: UserBudgetSettingsCreate): Promise<boolean> => {
    if (!isAuthenticated) return false

    setIsLoading(true)
    setError(undefined)

    try {
      const { data, error: apiError } = await apiClient.post<UserBudgetSettingsResponse>("/budget/settings/", settings)

      if (apiError) {
        setError(apiError)
        setIsLoading(false)
        return false
      }

      setBudgetSettings(data || null)
      setIsLoading(false)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update budget settings")
      setIsLoading(false)
      return false
    }
  }

  // Clear data when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      setBudgetTemplate(null)
      setBudgetSettings(null)
      setError(undefined)
    }
  }, [isAuthenticated])

  // Fetch budget settings when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchBudgetSettings()
    }
  }, [isAuthenticated, fetchBudgetSettings])

  return (
    <BudgetContext.Provider
      value={{
        budgetTemplate,
        budgetSettings,
        isLoading,
        error,
        fetchMonthlyBudget,
        createMonthlyBudget,
        updateMonthlyBudget,
        fetchBudgetSettings,
        updateBudgetSettings,
      }}
    >
      {children}
    </BudgetContext.Provider>
  )
}

export function useBudget() {
  const context = useContext(BudgetContext)
  if (context === undefined) {
    throw new Error("useBudget must be used within a BudgetProvider")
  }
  return context
}