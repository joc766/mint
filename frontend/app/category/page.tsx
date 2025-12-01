"use client"

import { useState, useEffect, useMemo, useRef, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MonthSelector } from "@/components/month-selector"
import { useCurrency } from "@/contexts/currency-context"
import { useAuth } from "@/contexts/auth-context"
import { useCategories } from "@/contexts/categories-context"
import { useTransactions } from "@/contexts/transactions-context"
import { useBudget } from "@/contexts/budget-context"
import { apiClient } from "@/lib/api-client"
import type { CategoryResponse, TransactionResponse, SubcategoryResponse } from "@/lib/types"

function CategoryPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const categoryId = searchParams.get('id')
  const { formatAmount } = useCurrency()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { categories, fetchCategories } = useCategories()
  const { transactions, fetchTransactions } = useTransactions()
  const { budgetTemplate, fetchMonthlyBudget } = useBudget()
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [category, setCategory] = useState<CategoryResponse | null>(null)
  const [subcategories, setSubcategories] = useState<SubcategoryResponse[]>([])
  const [categoryExpenses, setCategoryExpenses] = useState<TransactionResponse[]>([])
  const [totalSpent, setTotalSpent] = useState(0)

  // Format date string without timezone conversion
  const formatDateLocal = (dateString: string | Date) => {
    const dateStr = dateString.toString().substring(0, 10) // "YYYY-MM-DD"
    const [year, month, day] = dateStr.split('-')
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString()
  }
  const [categoryBudget, setCategoryBudget] = useState(0)
  const [subcategoryBudgets, setSubcategoryBudgets] = useState<Array<{
    id: number
    name: string
    icon?: string
    budget: number
    spent: number
    remaining: number
    percentUsed: number
  }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const fetchingRef = useRef<string | null>(null) // Track what's currently being fetched

  // Memoize month values to prevent unnecessary re-renders
  const monthKey = useMemo(() => {
    const year = selectedMonth.getFullYear()
    const month = selectedMonth.getMonth() + 1
    return `${year}-${month}`
  }, [selectedMonth])

  // Add validation for missing category ID
  useEffect(() => {
    if (!categoryId) {
      router.push('/') // Redirect to home if no category ID
    }
  }, [categoryId, router])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Fetch categories and find the current one
  useEffect(() => {
    const loadCategory = async () => {
      if (!categoryId) {
        setIsLoading(false)
        return
      }
      
      // If categories are empty, fetch them first
      if (categories.length === 0) {
        try {
          await fetchCategories()
          // After fetching, the categories will update and this effect will re-run
          return
        } catch (err) {
          console.error("Failed to fetch categories:", err)
          setFetchError("Failed to load category")
          setIsLoading(false)
          return
        }
      }
      
      // Now find the category in the loaded categories
      const foundCategory = categories.find((cat) => String(cat.id) === String(categoryId))
      setCategory(foundCategory || null)
      if (!foundCategory && categories.length > 0) {
        setFetchError("Category not found")
        setIsLoading(false)
      } else if (foundCategory) {
        setFetchError(null)
        // Loading will be set to false by the calculation effect once data is ready
      }
    }
    
    loadCategory()
  }, [categoryId, categories, fetchCategories])

  // Fetch subcategories for this category (only once per category)
  useEffect(() => {
    const loadSubcategories = async () => {
      if (!categoryId) return
      
      try {
        const { data } = await apiClient.get<SubcategoryResponse[]>(`/subcategories/?category_id=${categoryId}`)
        if (data) setSubcategories(data)
      } catch (err) {
        console.error("Failed to fetch subcategories:", err)
        // Don't set error state for subcategories, just use empty array
        setSubcategories([])
      }
    }
    
    loadSubcategories()
  }, [categoryId])

  // Fetch monthly budget for selected month
  useEffect(() => {
    const fetchKey = `budget-${monthKey}`
    if (fetchingRef.current === fetchKey) return // Already fetching
    
    const loadBudget = async () => {
      const year = selectedMonth.getFullYear()
      const month = selectedMonth.getMonth() + 1
      
      fetchingRef.current = fetchKey
      try {
        await fetchMonthlyBudget(year, month)
        setFetchError(null)
      } catch (err) {
        console.error("Failed to fetch budget:", err)
        setFetchError("Failed to load budget")
      } finally {
        if (fetchingRef.current === fetchKey) {
          fetchingRef.current = null
        }
      }
    }
    
    loadBudget()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey]) // Use monthKey instead of selectedMonth and fetchMonthlyBudget

  // Fetch transactions for selected month
  useEffect(() => {
    if (!categoryId) return
    
    const fetchKey = `transactions-${monthKey}-${categoryId}`
    if (fetchingRef.current === fetchKey) return // Already fetching
    
    const loadTransactions = async () => {
      // Use local date formatting to avoid timezone issues
      const year = selectedMonth.getFullYear()
      const month = selectedMonth.getMonth() + 1 // JS months are 0-indexed
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const lastDay = new Date(year, month, 0).getDate() // Get last day of month
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      
      fetchingRef.current = fetchKey
      try {
        await fetchTransactions({ 
          start_date: startDate, 
          end_date: endDate, 
          category_id: Number.parseInt(categoryId) 
        })
        setFetchError(null)
      } catch (err) {
        console.error("Failed to fetch transactions:", err)
        setFetchError("Failed to load transactions")
      } finally {
        if (fetchingRef.current === fetchKey) {
          fetchingRef.current = null
        }
      }
    }
    
    loadTransactions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey, categoryId]) // Use monthKey instead of selectedMonth and fetchTransactions

  // Calculate category budget and expenses (only when data changes, not on every render)
  useEffect(() => {
    // Don't calculate if we don't have a category yet
    if (!category || !categoryId) {
      return
    }
    
    setIsLoading(true)
    
    // Find budget entries for this category in the current month's budget
    let budget = 0
    const subcategoryBudgetList: Array<{
      id: number
      name: string
      icon?: string
      budget: number
      spent: number
      remaining: number
      percentUsed: number
    }> = []
    
    const year = selectedMonth.getFullYear()
    const month = selectedMonth.getMonth() + 1
    
    // Filter transactions for this category and month first
    // Include transactions that have this category_id directly, or have a subcategory that belongs to this category
    const subcategoryIds = subcategories.map((s) => typeof s.id === "string" ? Number.parseInt(s.id, 10) : s.id)
    const filteredExpenses = transactions.filter((t) => {
      const expenseDate = new Date(t.date)
      const isCorrectMonth = 
        expenseDate.getMonth() === selectedMonth.getMonth() &&
        expenseDate.getFullYear() === selectedMonth.getFullYear()
      
      if (!isCorrectMonth || Number(t.amount) >= 0) return false // Only expenses
      
      // Transaction has this category directly
      if (t.custom_category_id === Number.parseInt(categoryId!)) {
        return true
      }
      
      // Transaction has a subcategory that belongs to this category
      if (t.custom_subcategory_id && subcategoryIds.includes(t.custom_subcategory_id)) {
        return true
      }
      
      return false
    })

    setCategoryExpenses(filteredExpenses)

    // Calculate total spent
    const total = filteredExpenses.reduce((sum, expense) => sum + Math.abs(Number(expense.amount)), 0)
    setTotalSpent(total)

    // Now calculate budgets using the filtered expenses
    // Only use budget template if it matches the selected month
    if (budgetTemplate?.entries && budgetTemplate.year === year && budgetTemplate.month === month) {
      // Find category-level budget entry (subcategory_id is null)
      const parsedCategoryId = Number.parseInt(categoryId!)
      const categoryBudgetEntry = budgetTemplate.entries.find(
        (entry) => {
          const entryCategoryId = typeof entry.category_id === "string" 
            ? Number.parseInt(entry.category_id, 10) 
            : entry.category_id
          return entryCategoryId === parsedCategoryId && entry.subcategory_id === null
        }
      )
      if (categoryBudgetEntry) {
        budget = typeof categoryBudgetEntry.budgeted_amount === "string" 
          ? Number.parseFloat(categoryBudgetEntry.budgeted_amount) 
          : categoryBudgetEntry.budgeted_amount || 0
      }
      
      // Find all subcategory budget entries for this category
      const subcategoryEntries = budgetTemplate.entries.filter(
        (entry) => {
          const entryCategoryId = typeof entry.category_id === "string" 
            ? Number.parseInt(entry.category_id, 10) 
            : entry.category_id
          return entryCategoryId === parsedCategoryId && entry.subcategory_id !== null
        }
      )
      
      subcategoryEntries.forEach((entry) => {
        const subcategoryId = entry.subcategory_id
        if (subcategoryId === null) return
        const subcategory = subcategories.find((s) => {
          const sId = typeof s.id === "string" ? Number.parseInt(s.id, 10) : s.id
          return sId === subcategoryId
        })
        if (subcategory) {
          // Calculate spending for this subcategory
          const subcategorySpending = filteredExpenses
            .filter((t) => t.custom_subcategory_id === entry.subcategory_id)
            .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0)
          
          const subcategoryBudget = typeof entry.budgeted_amount === "string" 
            ? Number.parseFloat(entry.budgeted_amount) 
            : entry.budgeted_amount || 0
          const subcategoryRemaining = subcategoryBudget - subcategorySpending
          const subcategoryPercentUsed = subcategoryBudget > 0
            ? Math.min(Math.round((subcategorySpending / subcategoryBudget) * 100), 100)
            : 0
          
          subcategoryBudgetList.push({
            id: entry.id,
            name: subcategory.name,
            icon: subcategory.icon || undefined,
            budget: subcategoryBudget,
            spent: subcategorySpending,
            remaining: subcategoryRemaining,
            percentUsed: subcategoryPercentUsed,
          })
        }
      })
    }
    setCategoryBudget(budget)
    setSubcategoryBudgets(subcategoryBudgetList)
    
    setIsLoading(false)
  }, [transactions, monthKey, categoryId, budgetTemplate, subcategories, selectedMonth, category])

  if (authLoading || !isAuthenticated) {
    return null
  }

  if (isLoading || !category) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <DashboardHeader />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center py-12">Loading...</div>
        </main>
      </div>
    )
  }

  // Calculate remaining budget: category budget - total spending (category-level + subcategory spending)
  // totalSpent already includes all spending for this category (both category-level and subcategory transactions)
  const remaining = categoryBudget > 0 
    ? categoryBudget - totalSpent
    : 0
  const percentUsed = categoryBudget > 0 
    ? Math.min(Math.round((totalSpent / categoryBudget) * 100), 100)
    : 0

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardHeader />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xl"
              style={{ backgroundColor: category.color || "#3B82F6" }}
            >
              {category.icon || category.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{category.name}</h1>
              {category.description && (
                <p className="text-sm text-muted-foreground">{category.description}</p>
              )}
            </div>
          </div>
          <MonthSelector selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
        </div>

        {fetchError && (
          <div className="mb-4 rounded-md bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-800 dark:text-red-200">
            {fetchError}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Budget Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Budget</span>
                  <span className="font-medium">{formatAmount(categoryBudget)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Spent</span>
                  <span className="font-medium">{formatAmount(totalSpent)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Remaining</span>
                  <span className={`font-medium ${remaining < 0 ? "text-red-600 dark:text-red-400" : ""}`}>
                    {formatAmount(remaining)}
                  </span>
                </div>
                {categoryBudget > 0 && (
                  <div className="pt-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm">{percentUsed}% used</span>
                    </div>
                    <div className="relative h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          percentUsed >= 100 ? "bg-red-500" : percentUsed >= 75 ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(percentUsed, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
                {categoryBudget === 0 && subcategoryBudgets.length === 0 && (
                  <div className="pt-2 text-sm text-muted-foreground">
                    No budget set for this category in {selectedMonth.toLocaleString("default", { month: "long", year: "numeric" })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {subcategoryBudgets.length > 0 && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Subcategory Budgets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {subcategoryBudgets.map((sub) => (
                    <div key={sub.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {sub.icon && <span className="text-lg">{sub.icon}</span>}
                          <span className="font-medium">{sub.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-medium">{formatAmount(sub.budget)}</span>
                          <p className="text-xs text-muted-foreground">Budget</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-muted-foreground">Spent: {formatAmount(sub.spent)}</span>
                        <span className={`text-sm font-medium ${sub.remaining < 0 ? "text-red-600 dark:text-red-400" : ""}`}>
                          Remaining: {formatAmount(sub.remaining)}
                        </span>
                      </div>
                      <div className="relative h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            sub.percentUsed >= 100 ? "bg-red-500" : sub.percentUsed >= 75 ? "bg-amber-500" : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.min(sub.percentUsed, 100)}%` }}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{sub.percentUsed}% used</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Recent Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              {categoryExpenses.length > 0 ? (
                <div className="space-y-4">
                  {categoryExpenses.map((expense) => (
                    <div key={expense.id} className="flex justify-between items-center pb-2 border-b">
                      <div>
                        <div className="font-medium">{expense.merchant_name || expense.name || "Unknown"}</div>
                        {expense.notes && (
                          <div className="text-sm text-muted-foreground">{expense.notes}</div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {formatDateLocal(expense.date)}
                        </div>
                      </div>
                      <div className="font-medium">{formatAmount(Math.abs(Number(expense.amount)))}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  No expenses for this category in{" "}
                  {selectedMonth.toLocaleString("default", { month: "long", year: "numeric" })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

// Wrap in Suspense boundary
export default function CategoryPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col bg-background">
        <DashboardHeader />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center py-12">Loading category...</div>
        </main>
      </div>
    }>
      <CategoryPageContent />
    </Suspense>
  )
}
