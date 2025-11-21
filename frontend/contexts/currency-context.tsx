"use client"

import type React from "react"
import { createContext, useContext, useState } from "react"

export const currencies = [
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
]

type CurrencyContextType = {
  currency: (typeof currencies)[0]
  setCurrency: (code: string) => void
  formatAmount: (amount: number) => string
  position: "before" | "after"
  setPosition: (position: "before" | "after") => void
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState(currencies[1]) // USD is default
  const [position, setPosition] = useState<"before" | "after">("before")

  const setCurrency = (code: string) => {
    const newCurrency = currencies.find((c) => c.code === code) || currencies[1] // Default to USD if not found
    setCurrencyState(newCurrency)
  }

  const formatAmount = (amount: number) => {
    const formattedAmount = amount.toLocaleString("en-US", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    })

    return position === "before" ? `${currency.symbol}${formattedAmount}` : `${formattedAmount}${currency.symbol}`
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatAmount, position, setPosition }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider")
  }
  return context
}
