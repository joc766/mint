"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, Pencil } from "lucide-react"
import { useCurrency } from "@/contexts/currency-context"
import { useBudget } from "@/contexts/budget-context"
import { useTransactions } from "@/contexts/transactions-context"
import { useCategories } from "@/contexts/categories-context"
import { apiClient } from "@/lib/api-client"
import type { BudgetTemplateEntryResponse, SubcategoryResponse } from "@/lib/types"

interface CategoryBudget {
  id: number | string
  name: string
  icon?: string
  budget: number
  spent: number
  remaining: number
  percentUsed: number
  isOverspent: boolean
  entryId?: number
  categoryId?: number
  subcategoryId?: number
  subcategories?: Array<{
    id: number
    name: string
    icon?: string
    budget: number
    spent: number
    remaining: number
    percentUsed: number
  }>
}

export function BudgetManagement({ selectedMonth = new Date() }) {
  const router = useRouter()
  const { formatAmount } = useCurrency()
  const { budgetTemplate, fetchMonthlyBudget, createMonthlyBudget, updateMonthlyBudget } = useBudget()
  const { transactions, fetchTransactions } = useTransactions()
  const { categories } = useCategories()
  const [subcategories, setSubcategories] = useState<SubcategoryResponse[]>([])
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget[]>([])
  const [filteredBudgets, setFilteredBudgets] = useState<CategoryBudget[]>([])
  const [activeView, setActiveView] = useState("all")
  const [isLoading, setIsLoading] = useState(false)

  // Fetch subcategories
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
    
    const loadBudget = async () => {
      await fetchMonthlyBudget(year, month)
    }
    
    loadBudget()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth])

  // Fetch transactions for selected month
  useEffect(() => {
    const startDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1).toISOString().split('T')[0]
    const endDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).toISOString().split('T')[0]
    fetchTransactions({ start_date: startDate, end_date: endDate })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth])

  // Calculate category budgets and spending
  useEffect(() => {
    // Check if budget exists for selected month by verifying the month/year match
    const year = selectedMonth.getFullYear()
    const month = selectedMonth.getMonth() + 1
    
    // If budget template exists but doesn't match selected month, clear it
    if (budgetTemplate && (budgetTemplate.year !== year || budgetTemplate.month !== month)) {
      setCategoryBudgets([])
      setFilteredBudgets([])
      setIsLoading(false)
      return
    }

    if (!budgetTemplate?.entries) {
      setCategoryBudgets([])
      setFilteredBudgets([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    // Filter transactions for selected month
    const monthTransactions = transactions.filter((t) => {
      const date = new Date(t.date)
      return (
        date.getMonth() === selectedMonth.getMonth() &&
        date.getFullYear() === selectedMonth.getFullYear() &&
        t.amount < 0 // Only expenses
      )
    })

    // Calculate spending by category/subcategory with proper number conversion
    const spendingMap: Record<string, number> = {}
    monthTransactions.forEach((t) => {
      const amount = Math.abs(Number(t.amount) || 0)
      if (isNaN(amount)) return // Skip invalid amounts
      
      if (t.custom_subcategory_id) {
        // Transaction has a subcategory - track by subcategory
        const key = `subcategory_${t.custom_subcategory_id}`
        spendingMap[key] = (spendingMap[key] || 0) + amount
      } else if (t.custom_category_id) {
        // Transaction has only a category (no subcategory) - track by category
        const key = `category_${t.custom_category_id}`
        spendingMap[key] = (spendingMap[key] || 0) + amount
      }
    })

    // Build category budgets - only show category-level entries (subcategory_id is null)
    // Aggregate subcategory budgets and spending under their parent categories
    const categoryBudgetMap = new Map<number, CategoryBudget>()
    
    // First, process category-level entries (no subcategory_id)
    budgetTemplate.entries.forEach((entry) => {
      if (entry.subcategory_id === null && entry.category_id) {
        const category = categories.find((c) => Number.parseInt(c.id) === entry.category_id)
        if (category) {
          const key = `category_${entry.category_id}`
          const spent = Number(spendingMap[key]) || 0
          const budget = Number(entry.budgeted_amount) || 0
          const remaining = budget - spent
          const safeRemaining = isNaN(remaining) ? 0 : remaining
          const percentUsed = budget > 0 && !isNaN(budget) && !isNaN(spent) 
            ? Math.min(Math.round((spent / budget) * 100), 100) 
            : 0

          categoryBudgetMap.set(entry.category_id, {
            id: entry.id,
            name: category.name,
            icon: category.icon || "",
            budget,
            spent,
            remaining: safeRemaining,
            percentUsed,
            isOverspent: !isNaN(spent) && !isNaN(budget) && spent > budget,
            entryId: entry.id,
            categoryId: entry.category_id,
            subcategories: [],
          })
        }
      }
    })

    // Then, process subcategory entries and aggregate under their parent categories
    budgetTemplate.entries.forEach((entry) => {
      if (entry.subcategory_id !== null) {
        const subcategory = subcategories.find((s) => Number.parseInt(s.id) === entry.subcategory_id)
        if (subcategory) {
          // Use category_id from entry if available, otherwise use subcategory's parent
          const categoryId = entry.category_id || Number.parseInt(subcategory.category_id)
          const category = categories.find((c) => Number.parseInt(c.id) === categoryId)
          
          if (category) {
            const subcategoryKey = `subcategory_${entry.subcategory_id}`
            const subcategorySpent = Number(spendingMap[subcategoryKey]) || 0
            const subcategoryBudget = Number(entry.budgeted_amount) || 0
            const subcategoryRemaining = subcategoryBudget - subcategorySpent
            const subcategoryPercentUsed = subcategoryBudget > 0 && !isNaN(subcategoryBudget) && !isNaN(subcategorySpent)
              ? Math.min(Math.round((subcategorySpent / subcategoryBudget) * 100), 100)
              : 0

            // Get or create category budget entry
            if (!categoryBudgetMap.has(categoryId)) {
              // If category doesn't have a budget entry yet, initialize with category-level spending
              const categoryKey = `category_${categoryId}`
              const categoryLevelSpent = Number(spendingMap[categoryKey]) || 0
              
              categoryBudgetMap.set(categoryId, {
                id: `category_${categoryId}`,
                name: category.name,
                icon: category.icon || "",
                budget: 0,
                spent: categoryLevelSpent,
                remaining: 0,
                percentUsed: 0,
                isOverspent: false,
                categoryId,
                subcategories: [],
              })
            }

            const categoryBudget = categoryBudgetMap.get(categoryId)!
            
            // Add subcategory to the list
            categoryBudget.subcategories!.push({
              id: entry.id,
              name: subcategory.name,
              icon: subcategory.icon || "",
              budget: subcategoryBudget,
              spent: subcategorySpent,
              remaining: isNaN(subcategoryRemaining) ? 0 : subcategoryRemaining,
              percentUsed: subcategoryPercentUsed,
            })

            // Aggregate subcategory spending into category total spending
            categoryBudget.spent += subcategorySpent
          }
        }
      }
    })

    // Finally, recalculate remaining and percentUsed for all categories that have subcategories
    // This ensures we use total spending (category-level + subcategory) vs category budget
    categoryBudgetMap.forEach((categoryBudget) => {
      if (categoryBudget.budget > 0) {
        // Remaining = category budget - total spending (category-level + subcategory spending)
        categoryBudget.remaining = categoryBudget.budget - categoryBudget.spent
        // Percent used = total spending / category budget
        categoryBudget.percentUsed = Math.min(Math.round((categoryBudget.spent / categoryBudget.budget) * 100), 100)
        // Overspent if total spending exceeds category budget
        categoryBudget.isOverspent = categoryBudget.spent > categoryBudget.budget
      } else if (categoryBudget.subcategories && categoryBudget.subcategories.length > 0) {
        // If no category budget but subcategories exist, calculate based on subcategory budgets
        const totalSubcategoryBudgets = categoryBudget.subcategories.reduce(
          (sum, sub) => sum + sub.budget,
          0
        )
        categoryBudget.remaining = totalSubcategoryBudgets - categoryBudget.spent
        if (totalSubcategoryBudgets > 0) {
          categoryBudget.percentUsed = Math.min(Math.round((categoryBudget.spent / totalSubcategoryBudgets) * 100), 100)
        }
        categoryBudget.isOverspent = categoryBudget.spent > totalSubcategoryBudgets
      }
    })

    const budgets = Array.from(categoryBudgetMap.values())
    setCategoryBudgets(budgets)
    setIsLoading(false)
  }, [budgetTemplate, transactions, selectedMonth, categories, subcategories])

  // Apply view filter
  useEffect(() => {
    if (activeView === "all") {
      setFilteredBudgets(categoryBudgets)
    } else if (activeView === "overspent") {
      setFilteredBudgets(categoryBudgets.filter((cat) => cat.isOverspent))
    } else if (activeView === "under-budget") {
      setFilteredBudgets(categoryBudgets.filter((cat) => !cat.isOverspent))
    } else if (activeView === "high-usage") {
      setFilteredBudgets(categoryBudgets.filter((cat) => cat.percentUsed >= 75))
    }
  }, [categoryBudgets, activeView])

  // Helper function to get card style based on percentage used
  const getCardStyle = (percentUsed: number) => {
    if (percentUsed >= 75) {
      return "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
    } else if (percentUsed >= 50) {
      return "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
    } else {
      return "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
    }
  }

  // Helper function to get progress bar color based on percentage used
  const getProgressColor = (percentUsed: number) => {
    if (percentUsed >= 75) {
      return "bg-red-500"
    } else if (percentUsed >= 50) {
      return "bg-amber-500"
    } else {
      return "bg-emerald-500"
    }
  }

  const handleBudgetUpdate = async (entryId: number, newBudget: number) => {
    if (!budgetTemplate?.entries) return

    const year = selectedMonth.getFullYear()
    const month = selectedMonth.getMonth() + 1 // JavaScript months are 0-indexed

    // Update the entry in the template
    const updatedEntries = budgetTemplate.entries.map((entry) =>
      entry.id === entryId ? { ...entry, budgeted_amount: newBudget } : entry
    )

    // Calculate new total budget
    const totalBudget = updatedEntries.reduce((sum, entry) => sum + entry.budgeted_amount, 0)

    const success = await updateMonthlyBudget(year, month, {
      total_budget: totalBudget,
      entries: updatedEntries.map((e) => ({
        category_id: e.category_id,
        subcategory_id: e.subcategory_id,
        budgeted_amount: e.budgeted_amount,
      })),
    })

    if (success) {
      await fetchMonthlyBudget(year, month)
    }
  }

  const handleViewChange = (view: string) => {
    setActiveView(view)
  }

  // Calculate total budget and spending summary with proper number conversion
  const totalBudget = budgetTemplate?.total_budget ? Number(budgetTemplate.total_budget) || 0 : 0
  const monthTransactions = transactions.filter((t) => {
    const date = new Date(t.date)
    return (
      date.getMonth() === selectedMonth.getMonth() &&
      date.getFullYear() === selectedMonth.getFullYear() &&
      t.amount < 0 // Only expenses
    )
  })
  const totalSpent = monthTransactions.reduce((sum, t) => {
    const amount = Math.abs(Number(t.amount) || 0)
    return isNaN(amount) ? sum : sum + amount
  }, 0)
  const totalRemaining = totalBudget - totalSpent
  const safeTotalRemaining = isNaN(totalRemaining) ? 0 : totalRemaining
  const totalPercentUsed = totalBudget > 0 && !isNaN(totalBudget) && !isNaN(totalSpent) 
    ? Math.min(Math.round((totalSpent / totalBudget) * 100), 100) 
    : 0

  // Check if budget exists for selected month
  const year = selectedMonth.getFullYear()
  const month = selectedMonth.getMonth() + 1
  const hasBudgetForMonth = budgetTemplate && budgetTemplate.year === year && budgetTemplate.month === month

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">
          Budget for {selectedMonth.toLocaleString("default", { month: "long", year: "numeric" })}
        </h2>
      </div>

      {hasBudgetForMonth && (
        <Card className="bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30 border-emerald-200 dark:border-emerald-800">
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Budget</p>
                <p className="text-2xl font-bold">{formatAmount(totalBudget)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold">{formatAmount(totalSpent)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Remaining</p>
                <p className={`text-2xl font-bold ${safeTotalRemaining < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {formatAmount(Math.abs(safeTotalRemaining))}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Budget Usage</span>
                <span className="font-medium">{totalPercentUsed}%</span>
              </div>
              <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${totalPercentUsed >= 100 ? "bg-red-500" : totalPercentUsed >= 75 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${Math.min(totalPercentUsed, 100)}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!hasBudgetForMonth && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-lg font-medium mb-2">No budget set for this month</p>
              <p className="text-sm text-muted-foreground">
                {monthTransactions.length > 0
                  ? `You have ${monthTransactions.length} transaction${monthTransactions.length === 1 ? "" : "s"} for this month, but no budget has been created yet.`
                  : "No transactions found for this month. Budgets are only created for months with transactions."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="all" value={activeView} onValueChange={handleViewChange}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="all" className="px-4">
            All Categories
          </TabsTrigger>
          <TabsTrigger value="overspent" className="px-4">
            Overspent
          </TabsTrigger>
          <TabsTrigger value="under-budget" className="px-4">
            Under Budget
          </TabsTrigger>
          <TabsTrigger value="high-usage" className="px-4">
            High Usage (≥75%)
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="text-center py-6 text-muted-foreground">Loading budgets...</div>
      ) : !hasBudgetForMonth ? (
        null // Already shown above
      ) : filteredBudgets.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredBudgets.map((category) => {
            // Determine category ID for navigation
            const categoryId = category.categoryId || (category.subcategoryId 
              ? subcategories.find(s => Number.parseInt(s.id) === category.subcategoryId)?.category_id 
              : null)
            
            const handleCardClick = () => {
              if (categoryId) {
                router.push(`/category/${categoryId}`)
              }
            }

            return (
              <Card 
                key={category.id} 
                className={`relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow ${getCardStyle(category.percentUsed)}`}
                onClick={handleCardClick}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    {category.icon && <span className="text-xl">{category.icon}</span>}
                    <CardTitle className="text-base">{category.name}</CardTitle>
                    {category.isOverspent && <AlertTriangle className="h-4 w-4 text-red-500 ml-auto" />}
                  </div>
                </CardHeader>
                <CardContent>
                <div className="flex justify-between items-baseline">
                  <div>
                    <div className="text-2xl font-bold">{formatAmount(category.budget)}</div>
                    <p className="text-xs text-muted-foreground">Monthly budget</p>
                    {category.subcategories && category.subcategories.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {category.subcategories.length} subcategor{category.subcategories.length === 1 ? "y" : "ies"}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-xl font-semibold ${
                        category.isOverspent
                          ? "text-red-600 dark:text-red-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {category.isOverspent ? "-" : ""}
                      {formatAmount(Math.abs(category.remaining))}
                    </div>
                    <p className="text-xs text-muted-foreground">Remaining</p>
                  </div>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  <span>{formatAmount(category.spent)} spent</span>
                  <span className="float-right">{category.percentUsed}%</span>
                </div>
                {category.subcategories && category.subcategories.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Subcategories:</p>
                    <div className="space-y-1">
                      {category.subcategories.slice(0, 3).map((sub) => (
                        <div key={sub.id} className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground flex items-center gap-1">
                            {sub.icon && <span>{sub.icon}</span>}
                            {sub.name}
                          </span>
                          <span className="text-muted-foreground">
                            {formatAmount(sub.budget)} / {formatAmount(sub.spent)} spent
                          </span>
                        </div>
                      ))}
                      {category.subcategories.length > 3 && (
                        <p className="text-xs text-muted-foreground italic">
                          +{category.subcategories.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Progress bar as bottom border */}
                <div className="h-1.5 w-full absolute bottom-0 left-0 bg-gray-200 dark:bg-gray-700">
                  <div
                    className={`h-full ${getProgressColor(category.percentUsed)}`}
                    style={{ width: `${Math.min(category.percentUsed, 100)}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>
            )
          })}
        </div>
      ) : (
        <div className="col-span-full text-center py-6 text-muted-foreground">
          {budgetTemplate?.entries && budgetTemplate.entries.length === 0
            ? "No budgets set. Create budgets in the onboarding flow or budget settings."
            : "No budgets match your criteria"}
        </div>
      )}
    </div>
  )
}