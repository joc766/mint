"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/contexts/auth-context"
import type { AccountResponse, AccountCreate } from "@/lib/types"

interface AccountsContextType {
  accounts: AccountResponse[]
  isLoading: boolean
  error?: string
  fetchAccounts: () => Promise<void>
  createAccount: (account: AccountCreate) => Promise<AccountResponse | null>
  deleteAccount: (accountId: string | number) => Promise<boolean>
}

const AccountsContext = createContext<AccountsContextType | undefined>(undefined)

export function AccountsProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<AccountResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()
  const { isAuthenticated } = useAuth()

  const fetchAccounts = async () => {
    if (!isAuthenticated) return

    setIsLoading(true)
    setError(undefined)

    const { data, error: apiError } = await apiClient.get<AccountResponse[]>("/accounts/")

    if (apiError) {
      setError(apiError)
      setIsLoading(false)
      return
    }

    setAccounts(data || [])
    setIsLoading(false)
  }

  const createAccount = async (account: AccountCreate) => {
    const { data, error: apiError } = await apiClient.post<AccountResponse>("/accounts/", account)

    if (apiError) {
      setError(apiError)
      return null
    }

    setAccounts([...accounts, data as AccountResponse])
    return data as AccountResponse
  }

  const deleteAccount = async (accountId: string | number) => {
    const { error: apiError } = await apiClient.delete(`/accounts/${accountId}`)

    if (apiError) {
      setError(apiError)
      return false
    }

    // Convert accountId to number for comparison since API returns numeric IDs
    const idToCompare = typeof accountId === 'string' ? parseInt(accountId, 10) : accountId
    setAccounts(accounts.filter((acc) => acc.id !== idToCompare))
    return true
  }

  // Fetch accounts when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchAccounts()
    }
  }, [isAuthenticated])

  return (
    <AccountsContext.Provider
      value={{
        accounts,
        isLoading,
        error,
        fetchAccounts,
        createAccount,
        deleteAccount,
      }}
    >
      {children}
    </AccountsContext.Provider>
  )
}

export function useAccounts() {
  const context = useContext(AccountsContext)
  if (context === undefined) {
    throw new Error("useAccounts must be used within an AccountsProvider")
  }
  return context
}
