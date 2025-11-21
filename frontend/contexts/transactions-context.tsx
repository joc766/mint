"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/contexts/auth-context"
import type { TransactionResponse, TransactionCreate, TransactionUpdate } from "@/lib/types"

interface TransactionsContextType {
  transactions: TransactionResponse[]
  isLoading: boolean
  error?: string
  fetchTransactions: (filters?: {
    account_id?: number
    start_date?: string
    end_date?: string
    category_id?: number
    subcategory_id?: number
  }) => Promise<void>
  createTransaction: (transaction: TransactionCreate) => Promise<TransactionResponse | null>
  updateTransaction: (transactionId: number, update: TransactionUpdate) => Promise<TransactionResponse | null>
  deleteTransaction: (transactionId: number) => Promise<boolean>
}

const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined)

export function TransactionsProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<TransactionResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()
  const { isAuthenticated } = useAuth()

  const fetchTransactions = useCallback(async (filters?: {
    account_id?: number
    start_date?: string
    end_date?: string
    category_id?: number
    subcategory_id?: number
  }) => {
    if (!isAuthenticated) return

    setIsLoading(true)
    setError(undefined)

    try {
      const params = new URLSearchParams()
      if (filters?.account_id) params.append("account_id", filters.account_id.toString())
      if (filters?.start_date) params.append("start_date", filters.start_date)
      if (filters?.end_date) params.append("end_date", filters.end_date)
      if (filters?.category_id) params.append("category_id", filters.category_id.toString())
      if (filters?.subcategory_id) params.append("subcategory_id", filters.subcategory_id.toString())

      const endpoint = `/transactions/${params.toString() ? `?${params.toString()}` : ""}`
      const { data, error: apiError } = await apiClient.get<TransactionResponse[]>(endpoint)

      if (apiError) {
        setError(apiError)
        setIsLoading(false)
        return
      }

      setTransactions(data || [])
      setIsLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch transactions")
      setIsLoading(false)
    }
  }, [isAuthenticated])

  const createTransaction = async (transaction: TransactionCreate) => {
    const { data, error: apiError } = await apiClient.post<TransactionResponse>("/transactions/", transaction)

    if (apiError) {
      setError(apiError)
      return null
    }

    setTransactions([...transactions, data as TransactionResponse])
    return data as TransactionResponse
  }

  const updateTransaction = async (transactionId: number, update: TransactionUpdate) => {
    const { data, error: apiError } = await apiClient.put<TransactionResponse>(`/transactions/${transactionId}`, update)

    if (apiError) {
      setError(apiError)
      return null
    }

    setTransactions(transactions.map((t) => (t.id === transactionId ? (data as TransactionResponse) : t)))
    return data as TransactionResponse
  }

  const deleteTransaction = async (transactionId: number) => {
    const { error: apiError } = await apiClient.delete(`/transactions/${transactionId}`)

    if (apiError) {
      setError(apiError)
      return false
    }

    setTransactions(transactions.filter((t) => t.id !== transactionId))
    return true
  }

  // Clear transactions when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      setTransactions([])
      setError(undefined)
    }
  }, [isAuthenticated])

  return (
    <TransactionsContext.Provider
      value={{
        transactions,
        isLoading,
        error,
        fetchTransactions,
        createTransaction,
        updateTransaction,
        deleteTransaction,
      }}
    >
      {children}
    </TransactionsContext.Provider>
  )
}

export function useTransactions() {
  const context = useContext(TransactionsContext)
  if (context === undefined) {
    throw new Error("useTransactions must be used within a TransactionsProvider")
  }
  return context
}
