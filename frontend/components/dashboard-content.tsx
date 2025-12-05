"use client"

import { useState, useEffect, useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ExpenseSummary } from "@/components/expense-summary"
import { ExpenseList } from "@/components/expense-list"
import { BudgetManagement } from "@/components/budget-management"
import { MonthSelector } from "@/components/month-selector"
import { useCurrency } from "@/contexts/currency-context"
import { useTransactions } from "@/contexts/transactions-context"
import { useCategories } from "@/contexts/categories-context"
import { apiClient } from "@/lib/api-client"
import type { SubcategoryResponse, TransactionResponse } from "@/lib/types"

export function DashboardContent() {
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const { formatAmount } = useCurrency()
  const [reportView, setReportView] = useState("monthly")
  const { transactions, fetchTransactions } = useTransactions()
  const { categories } = useCategories()
  const [subcategories, setSubcategories] = useState<SubcategoryResponse[]>([])
  const [allTransactions, setAllTransactions] = useState<TransactionResponse[]>([])

  // Fetch subcategories once
  useEffect(() => {
    const fetchSubcategories = async () => {
      try {
        const { data } = await apiClient.get<SubcategoryResponse[]>("/subcategories/")
        if (data) setSubcategories(data)
      } catch (err) {
        console.error("Failed to fetch subcategories:", err)
      }
    }
    fetchSubcategories()
  }, [])

  // Fetch transactions for last 6 months for reports
  useEffect(() => {
    const fetchReportTransactions = async () => {
      const now = new Date()
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
      // Use local date formatting to avoid timezone issues
      const startYear = sixMonthsAgo.getFullYear()
      const startMonth = sixMonthsAgo.getMonth() + 1
      const startDate = `${startYear}-${String(startMonth).padStart(2, '0')}-01`
      const endYear = now.getFullYear()
      const endMonth = now.getMonth() + 1
      const lastDay = new Date(endYear, endMonth, 0).getDate()
      const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

      try {
        await fetchTransactions({
          start_date: startDate,
          end_date: endDate,
        })
      } catch (err) {
        console.error("Failed to fetch transactions for reports:", err)
      }
    }
    fetchReportTransactions()
  }, [fetchTransactions])

  // Update allTransactions when transactions change
  useEffect(() => {
    setAllTransactions(transactions)
  }, [transactions])

  // Calculate monthly spending for 6 months ending at selected month
  const monthlySpending = useMemo(() => {
    const months: { month: string; year: number; amount: number; date: Date }[] = []

    for (let i = 5; i >= 0; i--) {
      const date = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - i, 1)
      const monthKey = date.toLocaleString("default", { month: "short" })
      const year = date.getFullYear()

      const monthTransactions = allTransactions.filter((t) => {
        // Extract year-month from ISO date string to avoid timezone issues
        const dateStr = t.date.toString().substring(0, 7) // "YYYY-MM"
        const monthYearStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        return dateStr === monthYearStr && Number(t.amount) < 0 && t.transaction_type === "expense"
      })

      const total = monthTransactions.reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0)
      months.push({ month: monthKey, year, amount: total, date })
    }

    return months
  }, [allTransactions, selectedMonth])

  // Calculate category distribution for selected month
  const categoryDistribution = useMemo(() => {
    const monthTransactions = allTransactions.filter((t) => {
      // Extract year-month from ISO date string to avoid timezone issues
      const dateStr = t.date.toString().substring(0, 7) // "YYYY-MM"
      const selectedYearMonth = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`
      return dateStr === selectedYearMonth && Number(t.amount) < 0 && t.transaction_type === "expense"
    })

    const categorySpending: Record<string, number> = {}

    monthTransactions.forEach((t) => {
      let categoryName = "Uncategorized"

      if (t.custom_subcategory_id) {
        const subcategory = subcategories.find((s) => {
          const sId = typeof s.id === "string" ? Number.parseInt(s.id, 10) : s.id
          return sId === t.custom_subcategory_id
        })
        if (subcategory) {
          const parentCategory = categories.find((c) => {
            const categoryId = typeof subcategory.category_id === "string"
              ? Number.parseInt(subcategory.category_id, 10)
              : subcategory.category_id
            return c.id === categoryId
          })
          if (parentCategory) {
            categoryName = parentCategory.name
          }
        }
      } else if (t.custom_category_id) {
        const category = categories.find((c) => c.id === t.custom_category_id)
        if (category) {
          categoryName = category.name
        }
      }

      if (categoryName !== "Uncategorized") {
        categorySpending[categoryName] =
          (categorySpending[categoryName] || 0) + Math.abs(Number(t.amount) || 0)
      }
    })

    const total = Object.values(categorySpending).reduce((sum, amt) => sum + amt, 0)
    if (total === 0) return []

    return Object.entries(categorySpending)
      .map(([category, amount]) => ({
        category,
        percentage: Math.round((amount / total) * 100),
        amount,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6) // Top 6 categories
  }, [allTransactions, selectedMonth, categories, subcategories])

  // Calculate period comparison (current vs previous month)
  const periodComparison = useMemo(() => {
    const currentMonth = selectedMonth.getMonth()
    const currentYear = selectedMonth.getFullYear()
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear

    const currentTransactions = allTransactions.filter((t) => {
      // Extract year-month from ISO date string to avoid timezone issues
      const dateStr = t.date.toString().substring(0, 7) // "YYYY-MM"
      const currentYearMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`
      return dateStr === currentYearMonth && Number(t.amount) < 0 && t.transaction_type === "expense"
    })

    const previousTransactions = allTransactions.filter((t) => {
      // Extract year-month from ISO date string to avoid timezone issues
      const dateStr = t.date.toString().substring(0, 7) // "YYYY-MM"
      const prevYearMonth = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}`
      return dateStr === prevYearMonth && Number(t.amount) < 0 && t.transaction_type === "expense"
    })

    const currentTotal = currentTransactions.reduce(
      (sum, t) => sum + Math.abs(Number(t.amount) || 0),
      0
    )
    const previousTotal = previousTransactions.reduce(
      (sum, t) => sum + Math.abs(Number(t.amount) || 0),
      0
    )

    const change = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0

    return {
      current: currentTotal,
      previous: previousTotal,
      change: Math.round(change * 10) / 10,
    }
  }, [allTransactions, selectedMonth])

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <MonthSelector selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} disableCalendar={true} />
      </div>

      <Tabs defaultValue="expenses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="space-y-4">
          <ExpenseSummary selectedMonth={selectedMonth} />
          <ExpenseList selectedMonth={selectedMonth} />
        </TabsContent>

        <TabsContent value="budgets">
          <BudgetManagement selectedMonth={selectedMonth} />
        </TabsContent>

        <TabsContent value="reports">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Financial Reports</h2>

            <Tabs defaultValue="monthly" value={reportView} onValueChange={setReportView} className="ml-auto">
              <TabsList>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="category">By Category</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>
                  {reportView === "monthly" ? "Monthly Spending Trend" : "Category Breakdown"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reportView === "category" ? (
                  <div className="h-[300px] flex flex-col justify-center">
                    <div className="space-y-4">
                      {categoryDistribution.length === 0 ? (
                        <div className="text-center text-muted-foreground">
                          No category data available for this month
                        </div>
                      ) : (
                        <>
                          <div className="text-center text-muted-foreground">Spending by category</div>
                          <div className="space-y-4">
                            {categoryDistribution.map((item, index) => (
                              <div key={index} className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span>{item.category}</span>
                                  <span>{item.percentage}%</span>
                                </div>
                                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary"
                                    style={{ width: `${item.percentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-[300px] flex flex-col justify-center">
                    <div className="space-y-8">
                      {monthlySpending.length === 0 ? (
                        <div className="text-center text-muted-foreground">
                          No spending data available
                        </div>
                      ) : (
                        <>
                          <div className="text-center text-muted-foreground mb-2">
                            Monthly spending over time
                          </div>
                          <div className="flex items-end justify-between h-[240px] px-2">
                            {monthlySpending.map((item, index) => {
                              const maxAmount = Math.max(...monthlySpending.map((m) => m.amount), 1)
                              const height = maxAmount > 0 ? (item.amount / maxAmount) * 180 : 0
                              // Show year only on January bars
                              const isJanuary = item.date.getMonth() === 0
                              return (
                                <div key={index} className="flex flex-col items-center gap-2 flex-1 justify-end">
                                  <div
                                    className="w-5/6 bg-primary rounded-t-md min-h-[4px]"
                                    style={{ height: `${Math.max(height, 4)}px` }}
                                  ></div>
                                  <span className="text-xs text-muted-foreground">
                                    {formatAmount(item.amount)}
                                  </span>
                                  <div className="flex flex-col items-center h-[32px] justify-end">
                                    <span className="text-xs font-medium">{item.month}</span>
                                  </div>
                                  <div className="h-[2px] flex items-center">
                                    {isJanuary && (
                                      <span className="text-xs font-semibold text-muted-foreground">{item.year}</span>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Period Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex flex-col justify-center">
                  <div className="space-y-8">
                    <div className="text-center text-muted-foreground">Current vs Previous Month</div>
                    <div className="flex justify-center gap-8">
                      <div className="text-center">
                        <div className="text-3xl font-bold">
                          {formatAmount(periodComparison.current)}
                        </div>
                        <div className="text-sm text-muted-foreground">Current Month</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold">
                          {formatAmount(periodComparison.previous)}
                        </div>
                        <div className="text-sm text-muted-foreground">Previous Month</div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div
                        className={`text-lg font-semibold ${periodComparison.change >= 0 ? "text-red-500" : "text-emerald-500"
                          }`}
                      >
                        {periodComparison.change >= 0 ? "+" : ""}
                        {periodComparison.change}%
                      </div>
                      <div className="text-sm text-muted-foreground">Change</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
