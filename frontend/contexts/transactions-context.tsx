"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/contexts/auth-context"
import type { TransactionResponse, TransactionCreate, TransactionCreateResponse, TransactionUpdate } from "@/lib/types"

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
    replace?: boolean // If true, replace all transactions instead of merging
  }) => Promise<void>
  createTransaction: (transaction: TransactionCreate) => Promise<TransactionCreateResponse | null>
  updateTransaction: (transactionId: number, update: TransactionUpdate) => Promise<TransactionResponse | null>
  deleteTransaction: (transactionId: number) => Promise<boolean>
  clearTransactions: () => void // Clear all cached transactions
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
    replace?: boolean // If true, replace all transactions instead of merging
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

      const newTransactions = data || []
      
      if (filters?.replace) {
        // Replace all transactions (for explicit refresh scenarios)
        setTransactions(newTransactions)
      } else {
        // Merge new transactions with existing ones, deduplicating by ID
        setTransactions((prevTransactions) => {
          const existingIds = new Set(prevTransactions.map((t) => t.id))
          const uniqueNewTransactions = newTransactions.filter((t) => !existingIds.has(t.id))
          
          // Combine and sort by date (newest first)
          const combined = [...prevTransactions, ...uniqueNewTransactions]
          return combined.sort((a, b) => {
            const dateA = new Date(a.date).getTime()
            const dateB = new Date(b.date).getTime()
            return dateB - dateA
          })
        })
      }
      
      setIsLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch transactions")
      setIsLoading(false)
    }
  }, [isAuthenticated])

  const createTransaction = async (transaction: TransactionCreate) => {
    const { data, error: apiError } = await apiClient.post<TransactionCreateResponse>("/transactions/", transaction)

    if (apiError) {
      setError(apiError)
      return null
    }

    setTransactions((prevTransactions) => {
      // Check if transaction already exists (shouldn't happen, but be safe)
      const exists = prevTransactions.some((t) => t.id === (data as TransactionResponse).id)
      if (exists) {
        return prevTransactions.map((t) => 
          t.id === (data as TransactionResponse).id ? (data as TransactionResponse) : t
        )
      }
      // Add new transaction and sort by date (newest first)
      const updated = [...prevTransactions, data as TransactionResponse]
      return updated.sort((a, b) => {
        const dateA = new Date(a.date).getTime()
        const dateB = new Date(b.date).getTime()
        return dateB - dateA
      })
    })
    return data as TransactionCreateResponse
  }

  const updateTransaction = async (transactionId: number, update: TransactionUpdate) => {
    const { data, error: apiError } = await apiClient.put<TransactionResponse>(`/transactions/${transactionId}`, update)

    if (apiError) {
      setError(apiError)
      return null
    }

    setTransactions((prevTransactions) => 
      prevTransactions.map((t) => (t.id === transactionId ? (data as TransactionResponse) : t))
    )
    return data as TransactionResponse
  }

  const deleteTransaction = async (transactionId: number) => {
    const { error: apiError } = await apiClient.delete(`/transactions/${transactionId}`)

    if (apiError) {
      setError(apiError)
      return false
    }

    setTransactions((prevTransactions) => prevTransactions.filter((t) => t.id !== transactionId))
    return true
  }

  const clearTransactions = useCallback(() => {
    setTransactions([])
    setError(undefined)
  }, [])

  // Clear transactions when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      clearTransactions()
    }
  }, [isAuthenticated, clearTransactions])

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
        clearTransactions,
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
