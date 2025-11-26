import type React from "react"
import "./globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/contexts/theme-context"
import { CurrencyProvider } from "@/contexts/currency-context"
import { AuthProvider } from "@/contexts/auth-context"
import { AccountsProvider } from "@/contexts/accounts-context"
import { TransactionsProvider } from "@/contexts/transactions-context"
import { CategoriesProvider } from "@/contexts/categories-context"
import { BudgetProvider } from "@/contexts/budget-context"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Expense Tracker",
  description: "Track and manage your expenses",
    generator: 'v0.app'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased min-h-screen bg-background transition-colors`}>
        <AuthProvider>
          <AccountsProvider>
            <TransactionsProvider>
              <BudgetProvider>
                <CategoriesProvider>
                  <ThemeProvider>
                    <CurrencyProvider>
                      {children}
                      <Toaster />
                    </CurrencyProvider>
                  </ThemeProvider>
                </CategoriesProvider>
              </BudgetProvider>
            </TransactionsProvider>
          </AccountsProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
