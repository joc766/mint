"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useCurrency } from "@/contexts/currency-context"
import { useTransactions } from "@/contexts/transactions-context"
import { useBudget } from "@/contexts/budget-context"
import { useCategories } from "@/contexts/categories-context"
import { apiClient } from "@/lib/api-client"
import type { SubcategoryResponse } from "@/lib/types"

export function ExpenseSummary({ selectedMonth = new Date() }) {
  const { formatAmount } = useCurrency()
  const { transactions } = useTransactions()
  const { budgetSettings, budgetTemplate, fetchMonthlyBudget } = useBudget()
  const { categories } = useCategories()
  const [subcategories, setSubcategories] = useState<SubcategoryResponse[]>([])
  const [totalSpent, setTotalSpent] = useState(0)
  const [percentUsed, setPercentUsed] = useState(0)
  const [_dailyBudget, setDailyBudget] = useState(0)
  const [daysLeft, setDaysLeft] = useState(0)
  const [highestCategory, setHighestCategory] = useState({ name: "N/A", spent: 0 })
  const [highestMerchant, setHighestMerchant] = useState({ name: "N/A", amount: 0 })

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

  // Fetch monthly budget for selected month
  useEffect(() => {
    const year = selectedMonth.getFullYear()
    const month = selectedMonth.getMonth() + 1 // JavaScript months are 0-indexed
    fetchMonthlyBudget(year, month)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth])

  // Use monthly budget's total_budget if available, otherwise calculate from settings
  const monthlyBudget = budgetTemplate?.total_budget
    ? budgetTemplate.total_budget
    : budgetSettings
      ? Number(budgetSettings.monthly_income) - Number(budgetSettings.monthly_savings_goal)
      : 150000

  useEffect(() => {
    // Filter transactions for selected month
    const monthTransactions = transactions.filter((t) => {
      const date = new Date(t.date)
      return date.getMonth() === selectedMonth.getMonth() && date.getFullYear() === selectedMonth.getFullYear()
    })

    // Calculate total spent (only negative amounts for expenses)
    const total = monthTransactions.filter((t) => Number(t.amount) < 0).reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0)
    setTotalSpent(total)

    // Calculate percentage of budget used
    const percent = Math.min(Math.round((total / Number(monthlyBudget)) * 100), 100)
    setPercentUsed(percent)

    // Get highest expense category (properly resolve category names)
    const categorySpending: Record<string, number> = {}
    monthTransactions.forEach((t) => {
      if (Number(t.amount) < 0) {
        let categoryName = "Uncategorized"
        
        // Check if transaction has a subcategory
        if (t.custom_subcategory_id) {
          const subcategory = subcategories.find((s) => {
            const sId = typeof s.id === "string" ? Number.parseInt(s.id, 10) : s.id
            return sId === t.custom_subcategory_id
          })
          if (subcategory) {
            // Find parent category
            const parentCategory = categories.find(
              (c) => String(c.id) === String(subcategory.category_id)
            )
            if (parentCategory) {
              categoryName = parentCategory.name
            }
          }
        } 
        // Check if transaction has a category (but no subcategory)
        else if (t.custom_category_id) {
          const category = categories.find((c) => c.id === t.custom_category_id)
          if (category) {
            categoryName = category.name
          }
        }
        
        // Only add to spending map if it's not truly uncategorized
        if (categoryName !== "Uncategorized") {
          categorySpending[categoryName] = (categorySpending[categoryName] || 0) + Math.abs(Number(t.amount))
        }
      }
    })

    // Get top category, or "N/A" if no categorized transactions
    const sortedCategories = Object.entries(categorySpending).sort((a, b) => b[1] - a[1])
    const topCategory = sortedCategories[0]
    setHighestCategory({
      name: topCategory ? topCategory[0] : "N/A",
      spent: topCategory ? topCategory[1] : 0,
    })

    // Get highest expense merchant
    const merchantSpending: Record<string, number> = {}
    monthTransactions.forEach((t) => {
      if (Number(t.amount) < 0) {
        const merchant = t.merchant_name || t.name || "Unknown"
        merchantSpending[merchant] = (merchantSpending[merchant] || 0) + Math.abs(Number(t.amount))
      }
    })

    const topMerchant = Object.entries(merchantSpending).sort((a, b) => b[1] - a[1])[0]
    setHighestMerchant({
      name: topMerchant ? topMerchant[0] : "N/A",
      amount: topMerchant ? topMerchant[1] : 0,
    })

    // Calculate days left in the month
    const today = new Date()
    const lastDayOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate()

    if (today.getMonth() === selectedMonth.getMonth() && today.getFullYear() === selectedMonth.getFullYear()) {
      setDaysLeft(lastDayOfMonth - today.getDate() + 1)
    } else {
      const isPastMonth = selectedMonth < new Date(today.getFullYear(), today.getMonth(), 1)
      setDaysLeft(isPastMonth ? 0 : lastDayOfMonth)
    }

    // Calculate daily budget
    const remainingBudget = Math.max(Number(monthlyBudget) - total, 0)
    setDailyBudget(daysLeft > 0 ? remainingBudget / daysLeft : 0)
  }, [transactions, selectedMonth, monthlyBudget, budgetTemplate, categories, subcategories, daysLeft])

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatAmount(Number(monthlyBudget))}</div>
          <p className="text-xs text-muted-foreground">
            for {selectedMonth.toLocaleString("default", { month: "long", year: "numeric" })}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatAmount(totalSpent)}</div>
          <div className="mt-2">
            <Progress value={percentUsed} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">{percentUsed}% of budget used</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Highest Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{highestCategory.name}</div>
          <p className="text-xs text-muted-foreground mt-1">{formatAmount(highestCategory.spent)} this month</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Highest Expense</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{highestMerchant.name}</div>
          <p className="text-xs text-muted-foreground mt-1">{formatAmount(highestMerchant.amount)} this month</p>
        </CardContent>
      </Card>
    </div>
  )
}
