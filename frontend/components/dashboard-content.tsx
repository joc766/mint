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

  // Calculate monthly spending for last 6 months
  const monthlySpending = useMemo(() => {
    const now = new Date()
    const months: { month: string; amount: number; date: Date }[] = []

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = date.toLocaleString("default", { month: "short" })

      const monthTransactions = allTransactions.filter((t) => {
        // Extract year-month from ISO date string to avoid timezone issues
        const dateStr = t.date.toString().substring(0, 7) // "YYYY-MM"
        const monthYearStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        return dateStr === monthYearStr && Number(t.amount) < 0
      })

      const total = monthTransactions.reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0)
      months.push({ month: monthKey, amount: total, date })
    }

    return months
  }, [allTransactions])

  // Calculate category distribution for selected month
  const categoryDistribution = useMemo(() => {
    const monthTransactions = allTransactions.filter((t) => {
      const tDate = new Date(t.date)
      return (
        tDate.getMonth() === selectedMonth.getMonth() &&
        tDate.getFullYear() === selectedMonth.getFullYear() &&
        Number(t.amount) < 0
      )
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
      return dateStr === currentYearMonth && Number(t.amount) < 0
    })

    const previousTransactions = allTransactions.filter((t) => {
      // Extract year-month from ISO date string to avoid timezone issues
      const dateStr = t.date.toString().substring(0, 7) // "YYYY-MM"
      const prevYearMonth = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}`
      return dateStr === prevYearMonth && Number(t.amount) < 0
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

  // Calculate expense insights
  const expenseInsights = useMemo(() => {
    const monthTransactions = allTransactions.filter((t) => {
      // Extract year-month from ISO date string to avoid timezone issues
      const dateStr = t.date.toString().substring(0, 7) // "YYYY-MM"
      const selectedYearMonth = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`
      return dateStr === selectedYearMonth && Number(t.amount) < 0
    })

    // Top spending day
    const daySpending: Record<string, number> = {}
    monthTransactions.forEach((t) => {
      const dayName = new Date(t.date).toLocaleDateString("default", { weekday: "long" })
      daySpending[dayName] = (daySpending[dayName] || 0) + Math.abs(Number(t.amount) || 0)
    })

    const topDay = Object.entries(daySpending).sort((a, b) => b[1] - a[1])[0]
    const totalWeekSpending = Object.values(daySpending).reduce((sum, amt) => sum + amt, 0)
    const topDayPercentage =
      totalWeekSpending > 0 ? Math.round(((topDay?.[1] || 0) / totalWeekSpending) * 100) : 0

    // Average daily spend
    const daysInMonth = new Date(
      selectedMonth.getFullYear(),
      selectedMonth.getMonth() + 1,
      0
    ).getDate()
    const totalSpent = monthTransactions.reduce(
      (sum, t) => sum + Math.abs(Number(t.amount) || 0),
      0
    )
    const avgDaily = daysInMonth > 0 ? totalSpent / daysInMonth : 0

    // Calculate previous month average for comparison
    const prevMonth = selectedMonth.getMonth() === 0 ? 11 : selectedMonth.getMonth() - 1
    const prevYear =
      selectedMonth.getMonth() === 0 ? selectedMonth.getFullYear() - 1 : selectedMonth.getFullYear()
    const prevMonthTransactions = allTransactions.filter((t) => {
      // Extract year-month from ISO date string to avoid timezone issues
      const dateStr = t.date.toString().substring(0, 7) // "YYYY-MM"
      const prevYearMonth = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}`
      return dateStr === prevYearMonth && Number(t.amount) < 0
    })
    const prevDaysInMonth = new Date(prevYear, prevMonth + 1, 0).getDate()
    const prevTotalSpent = prevMonthTransactions.reduce(
      (sum, t) => sum + Math.abs(Number(t.amount) || 0),
      0
    )
    const prevAvgDaily = prevDaysInMonth > 0 ? prevTotalSpent / prevDaysInMonth : 0
    const avgDailyChange = prevAvgDaily > 0 ? ((avgDaily - prevAvgDaily) / prevAvgDaily) * 100 : 0

    return {
      topSpendingDay: topDay?.[0] || "N/A",
      topDayPercentage,
      avgDailySpend: avgDaily,
      avgDailyChange: Math.round(avgDailyChange * 10) / 10,
    }
  }, [allTransactions, selectedMonth])

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <MonthSelector selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
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
                          <div className="text-center text-muted-foreground">
                            Monthly spending over time
                          </div>
                          <div className="flex items-end justify-between h-[200px] px-2">
                            {monthlySpending.map((item, index) => {
                              const maxAmount = Math.max(...monthlySpending.map((m) => m.amount), 1)
                              const height = maxAmount > 0 ? (item.amount / maxAmount) * 200 : 0
                              return (
                                <div key={index} className="flex flex-col items-center gap-2 flex-1">
                                  <div
                                    className="w-full bg-primary rounded-t-md min-h-[4px]"
                                    style={{ height: `${Math.max(height, 4)}px` }}
                                  ></div>
                                  <span className="text-xs font-medium">{item.month}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatAmount(item.amount)}
                                  </span>
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
                        className={`text-lg font-semibold ${
                          periodComparison.change >= 0 ? "text-red-500" : "text-emerald-500"
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

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Expense Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <h3 className="text-sm font-medium mb-2">Top Spending Day</h3>
                    <div className="text-2xl font-bold">{expenseInsights.topSpendingDay}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {expenseInsights.topDayPercentage > 0
                        ? `${expenseInsights.topDayPercentage}% of weekly expenses`
                        : "No data available"}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <h3 className="text-sm font-medium mb-2">Average Daily Spend</h3>
                    <div className="text-2xl font-bold">
                      {formatAmount(expenseInsights.avgDailySpend)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {expenseInsights.avgDailyChange !== 0
                        ? `${expenseInsights.avgDailyChange >= 0 ? "+" : ""}${expenseInsights.avgDailyChange}% from last month`
                        : "No comparison available"}
                    </p>
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
