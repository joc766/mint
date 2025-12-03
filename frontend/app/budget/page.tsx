"use client"

import { useState, useEffect, useRef, useMemo, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard-header"
import { MonthSelector } from "@/components/month-selector"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCategories } from "@/contexts/categories-context"
import { useBudget } from "@/contexts/budget-context"
import { useCurrency } from "@/contexts/currency-context"
import { useAuth } from "@/contexts/auth-context"
import { useTransactions } from "@/contexts/transactions-context"
import { apiClient } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import type { BudgetTemplateEntryUpdate, BudgetTemplateCreate, SubcategoryResponse, CategoryResponse, CategoryCreate, SubcategoryCreate } from "@/lib/types"
import { Plus, Trash2, ArrowLeft, Smile } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// Common expense-related emojis
const EXPENSE_EMOJIS = [
  "🍔", "🍕", "🍖", "🍗", "🥐", "🥑", "🥨", "🥩", "🥪", "🥗",
  "☕", "🍵", "🥤", "🍺", "🍷", "🥂", "🧃", "🧉", "🧊",
  "✈️", "🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒",
  "🚐", "🛻", "🚚", "🚛", "🚜", "🏍️", "🛵", "🚲", "🛴", "🛹",
  "🎬", "🎮", "🎯", "🎲", "🎸", "🎹", "🎺", "🎻", "🥁", "🎤",
  "🏠", "🏡", "🏘️", "🏚️", "🏗️", "🏭", "🏢", "🏬", "🏣", "🏤",
  "🛍️", "🛒", "💰", "💳", "💵", "💴", "💶", "💷", "💸", "💲",
  "🏥", "💊", "💉", "🩺", "🩹", "🧬", "🔬", "⚕️",
  "🎓", "📚", "✏️", "📝", "📖", "📗", "📘", "📙", "📕", "📓",
  "👕", "👔", "👗", "👘", "👙", "👚", "👛", "👜", "👝", "🎒",
  "⚡", "💡", "🔋", "🔌", "💻", "📱", "⌚", "📷", "📹", "🎥",
  "🐕", "🐈", "🐎", "🐄", "🐓", "🦆", "🐟", "🐠",
  "🌿", "🌱", "🌳", "🌴", "🌵", "🌲", "🌾", "🌺", "🌻", "🌷",
  "🎁", "🎂", "🎈", "🎉", "🎊", "🎀", "🎃", "🎄", "🎆", "🎇",
]

function BudgetPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { formatAmount } = useCurrency()
  const { categories, isLoading: categoriesLoading, fetchCategories } = useCategories()
  const { budgetSettings, fetchBudgetSettings, fetchMonthlyBudget, updateMonthlyBudget, createMonthlyBudget, defaultBudget, fetchDefaultBudget, copyDefaultToMonth, resetMonthToDefault, updateDefaultBudget, createDefaultBudget } = useBudget()
  const { transactions, fetchTransactions } = useTransactions()
  const { toast } = useToast()
  
  // Check if we're in default budget mode
  const isDefaultMode = searchParams.get('default') === 'true'
  
  // Initialize selected month from URL params or use current date
  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (isDefaultMode) return new Date() // Default mode doesn't use month selection
    const yearParam = searchParams.get('year')
    const monthParam = searchParams.get('month')
    if (yearParam && monthParam) {
      return new Date(parseInt(yearParam), parseInt(monthParam) - 1, 1)
    }
    return new Date()
  })
  
  const [subcategories, setSubcategories] = useState<SubcategoryResponse[]>([])
  const [isLoadingSubcategories, setIsLoadingSubcategories] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [entries, setEntries] = useState<BudgetTemplateEntryUpdate[]>([])
  const [error, setError] = useState<string>()
  const [entryErrors, setEntryErrors] = useState<Record<number, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  // Category/Subcategory creation states
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false)
  const [isCreateSubcategoryOpen, setIsCreateSubcategoryOpen] = useState(false)
  const [pendingSubcategoryCategoryId, setPendingSubcategoryCategoryId] = useState<number | null>(null)
  const [categoryEmojiPickerOpen, setCategoryEmojiPickerOpen] = useState(false)
  const [subcategoryEmojiPickerOpen, setSubcategoryEmojiPickerOpen] = useState(false)
  const [newCategory, setNewCategory] = useState<CategoryCreate>({
    name: "",
    description: "",
    color: "#3B82F6",
    icon: "",
  })
  const [newSubcategory, setNewSubcategory] = useState<SubcategoryCreate>({
    name: "",
    description: "",
    color: "#3B82F6",
    icon: "",
  })
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [isCreatingSubcategory, setIsCreatingSubcategory] = useState(false)
  const errorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Scroll to error message when error occurs
  useEffect(() => {
    if (error && errorRef.current) {
      // Small delay to ensure DOM has updated
      setTimeout(() => {
        const headerHeight = 64 // DashboardHeader height (h-16 = 64px)
        const elementPosition = errorRef.current?.getBoundingClientRect().top || 0
        const offsetPosition = elementPosition + window.pageYOffset - headerHeight - 16 // 16px extra padding
        
        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth"
        })
      }, 100)
    }
  }, [error])

  // Fetch subcategories
  const fetchSubcategories = async () => {
    try {
      setIsLoadingSubcategories(true)
      const { data, error: apiError } = await apiClient.get<SubcategoryResponse[]>("/subcategories/")
      if (!apiError && data) {
        setSubcategories(data)
      }
    } catch (err) {
      console.error("Failed to fetch subcategories:", err)
    } finally {
      setIsLoadingSubcategories(false)
    }
  }

  // Load current month's budget or default budget
  useEffect(() => {
    const loadBudget = async () => {
      if (!isAuthenticated) return

      setIsLoading(true)
      
      // Fetch budget settings and default budget
      await fetchBudgetSettings()
      await fetchDefaultBudget()
      
      if (isDefaultMode) {
        // Load default budget
        if (defaultBudget?.entries) {
          setEntries(
            defaultBudget.entries.map((entry) => {
              const amount = Number(entry.budgeted_amount) || 0
              return {
                category_id: entry.category_id || null,
                subcategory_id: entry.subcategory_id || null,
                budgeted_amount: isNaN(amount) ? 0 : amount,
              }
            })
          )
        } else {
          setEntries([])
        }
      } else {
        // Load monthly budget
        const year = selectedMonth.getFullYear()
        const month = selectedMonth.getMonth() + 1
        
        const currentBudget = await fetchMonthlyBudget(year, month)
        
        if (currentBudget?.entries) {
          // Load existing budget entries, ensuring amounts are valid numbers
          setEntries(
            currentBudget.entries.map((entry) => {
              const amount = Number(entry.budgeted_amount) || 0
              return {
                category_id: entry.category_id || null,
                subcategory_id: entry.subcategory_id || null,
                budgeted_amount: isNaN(amount) ? 0 : amount,
              }
            })
          )
        } else {
          // No budget exists yet, start with empty entries
          setEntries([])
        }
      }
      
      await fetchSubcategories()
      
      // Fetch transactions for the selected month (if not in default mode)
      if (!isDefaultMode) {
        const year = selectedMonth.getFullYear()
        const month = selectedMonth.getMonth() + 1
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`
        const lastDay = new Date(year, month, 0).getDate()
        const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
        await fetchTransactions({ start_date: startDate, end_date: endDate })
      }
      
      setIsLoading(false)
    }

    loadBudget()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, selectedMonth, isDefaultMode])

    const addEntry = () => {
    const monthlyIncome = budgetSettings ? Number(budgetSettings.monthly_income) || 0 : 0
    const monthlySavingsGoal = budgetSettings ? Number(budgetSettings.monthly_savings_goal) || 0 : 0
    const availableBudget = monthlyIncome - monthlySavingsGoal
    // Only count category-level budgets (subcategories are nested within categories)
    const totalBudgeted = entries
      .filter((entry) => entry.subcategory_id === null)
      .reduce((sum, entry) => {
        const amount = Number(entry.budgeted_amount) || 0
        return isNaN(amount) ? sum : sum + amount
      }, 0)
    const remainingBudget = availableBudget - totalBudgeted

    if (remainingBudget <= 0 || isNaN(remainingBudget)) {
      setError("No budget remaining. You've allocated all available funds.")
      return
    }

    setEntries([
      ...entries,
      {
        category_id: null,
        subcategory_id: null,
        budgeted_amount: 0,
      },
    ])
  }

  const removeEntry = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index))
    // Clear any errors for this entry
    setEntryErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[index]
      return newErrors
    })
  }

  // Add subcategory budget entry
  const addSubcategoryBudgetEntry = (categoryId: number, subcategoryId: number) => {
    // Check if entry already exists
    const exists = entries.some(
      (e) => e.category_id === categoryId && e.subcategory_id === subcategoryId
    )
    if (exists) return

    setEntries([
      ...entries,
      {
        category_id: categoryId,
        subcategory_id: subcategoryId,
        budgeted_amount: 0,
      },
    ])
  }

  // Add category budget entry
  const addCategoryBudgetEntry = (categoryId: number) => {
    setEntries([
      ...entries,
      {
        category_id: categoryId,
        subcategory_id: null,
        budgeted_amount: 0,
      },
    ])
  }

  // Category/Subcategory creation handlers
  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) {
      setError("Category name is required")
      return
    }

    setIsCreatingCategory(true)
    setError(undefined)

    const { error: apiError } = await apiClient.post<CategoryResponse>("/categories/", {
      name: newCategory.name.trim(),
      description: newCategory.description?.trim() || undefined,
      color: newCategory.color || undefined,
      icon: newCategory.icon || undefined,
    })

    if (apiError) {
      setError(apiError)
      setIsCreatingCategory(false)
      return
    }

    await fetchCategories()
    setNewCategory({ name: "", description: "", color: "#3B82F6", icon: "" })
    setIsCreateCategoryOpen(false)
    setIsCreatingCategory(false)
  }

  const handleCreateSubcategory = async () => {
    if (!newSubcategory.name.trim()) {
      setError("Subcategory name is required")
      return
    }

    if (!pendingSubcategoryCategoryId) {
      setError("Please select a category first")
      return
    }

    setIsCreatingSubcategory(true)
    setError(undefined)

    const { error: apiError } = await apiClient.post<SubcategoryResponse>(
      `/subcategories/?category_id=${pendingSubcategoryCategoryId}`,
      {
        name: newSubcategory.name.trim(),
        description: newSubcategory.description?.trim() || undefined,
        color: newSubcategory.color || undefined,
        icon: newSubcategory.icon || undefined,
      },
    )

    if (apiError) {
      setError(apiError)
      setIsCreatingSubcategory(false)
      return
    }

    await fetchSubcategories()
    setNewSubcategory({ name: "", description: "", color: "#3B82F6", icon: "" })
    setPendingSubcategoryCategoryId(null)
    setIsCreateSubcategoryOpen(false)
    setIsCreatingSubcategory(false)
  }

  const handleDeleteCategory = async (categoryId: number) => {
    if (!confirm("Are you sure you want to delete this category? This will also remove it from any budget entries.")) {
      return
    }

    try {
      const { error: apiError } = await apiClient.delete(`/categories/${categoryId}`)
      
      if (apiError) {
        setError(apiError)
        return
      }

      await fetchCategories()
      setEntries(entries.map((entry) => {
        if (entry.category_id === categoryId) {
          return {
            ...entry,
            category_id: null,
          }
        }
        return entry
      }))
      setError(undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete category")
    }
  }

  const handleDeleteSubcategory = async (subcategoryId: number) => {
    if (!confirm("Are you sure you want to delete this subcategory? This will also remove it from any budget entries.")) {
      return
    }

    try {
      const { error: apiError } = await apiClient.delete(`/subcategories/${subcategoryId}`)
      
      if (apiError) {
        setError(apiError)
        return
      }

      await fetchSubcategories()
      setEntries(entries.map((entry) => {
        if (entry.subcategory_id === subcategoryId) {
          return {
            ...entry,
            subcategory_id: null,
            category_id: null,
          }
        }
        return entry
      }))
      setError(undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete subcategory")
    }
  }

  const handleResetToDefault = async () => {
    setIsResetting(true)
    setError(undefined)

    const year = selectedMonth.getFullYear()
    const month = selectedMonth.getMonth() + 1

    const result = await resetMonthToDefault(year, month)

    if (result) {
      // Reload the entries from the reset budget
      if (result.entries) {
        setEntries(
          result.entries.map((entry) => ({
            category_id: entry.category_id || null,
            subcategory_id: entry.subcategory_id || null,
            budgeted_amount: Number(entry.budgeted_amount) || 0,
          }))
        )
      }
      toast({
        title: "Success",
        description: "Budget reset to default successfully",
      })
    } else {
      toast({
        title: "Error",
        description: "Failed to reset budget to default",
        variant: "destructive",
      })
    }

    setIsResetDialogOpen(false)
    setIsResetting(false)
  }

  const handleCreateFromDefault = async () => {
    setIsResetting(true)
    setError(undefined)

    const year = selectedMonth.getFullYear()
    const month = selectedMonth.getMonth() + 1

    const result = await copyDefaultToMonth(year, month)

    if (result) {
      // Reload the entries from the new budget
      if (result.entries) {
        setEntries(
          result.entries.map((entry) => ({
            category_id: entry.category_id || null,
            subcategory_id: entry.subcategory_id || null,
            budgeted_amount: Number(entry.budgeted_amount) || 0,
          }))
        )
      }
      toast({
        title: "Success",
        description: "Budget created from default successfully",
      })
    } else {
      toast({
        title: "Error",
        description: "Failed to create budget from default",
        variant: "destructive",
      })
    }

    setIsResetting(false)
  }

  const updateEntry = (
    index: number,
    field: "category_id" | "subcategory_id" | "budgeted_amount",
    value: number | null,
  ) => {
    const newEntries = [...entries]
    const entry = { ...newEntries[index] }

    if (field === "category_id") {
      entry.category_id = value
      // Don't clear subcategory - entries can have both
    } else if (field === "subcategory_id") {
      entry.subcategory_id = value
      // Auto-populate parent category when subcategory is selected
      if (value !== null) {
        const selectedSubcategory = subcategories.find((sub) => {
          const sId = typeof sub.id === "string" ? Number.parseInt(sub.id, 10) : sub.id
          return sId === value
        })
        if (selectedSubcategory) {
          entry.category_id = typeof selectedSubcategory.category_id === "string" 
            ? Number.parseInt(selectedSubcategory.category_id, 10) 
            : selectedSubcategory.category_id
        }
      }
      // Don't clear category when subcategory is cleared - entries can have both
    } else {
      const newAmount = value as number
      entry.budgeted_amount = newAmount

      // Check validations
      if (budgetSettings) {
        const monthlyIncome = Number(budgetSettings.monthly_income) || 0
        const monthlySavingsGoal = Number(budgetSettings.monthly_savings_goal) || 0
        const availableBudget = monthlyIncome - monthlySavingsGoal
        const _totalBudgeted = entries.reduce((sum, e, i) => {
          const amount = i === index ? newAmount : (Number(e.budgeted_amount) || 0)
          return isNaN(amount) ? sum : sum + amount
        }, 0)
        // Calculate total budgeted - only category-level budgets (subcategories are nested)
        const categoryLevelTotal = newEntries
          .filter((e) => e.subcategory_id === null)
          .reduce((sum, e) => {
            const amount = e === entry ? newAmount : (Number(e.budgeted_amount) || 0)
            return isNaN(amount) ? sum : sum + amount
          }, 0)

        // Check if total exceeds available budget (only for category-level entries)
        if (entry.subcategory_id === null && !isNaN(categoryLevelTotal) && !isNaN(availableBudget) && categoryLevelTotal > availableBudget) {
          setEntryErrors((prev) => ({
            ...prev,
            [index]: "Amount exceeds available budget",
          }))
        } else {
          // Check if subcategory total exceeds category budget
          if (entry.subcategory_id) {
            // Use category_id from entry if available, otherwise get from subcategory
            const categoryId = entry.category_id || (() => {
              const subcategoryId = entry.subcategory_id
              if (subcategoryId === null) return null
              const sub = subcategories.find((s) => {
                const sId = typeof s.id === "string" ? Number.parseInt(s.id, 10) : s.id
                return sId === subcategoryId
              })
              if (!sub) return null
              return typeof sub.category_id === "string" 
                ? Number.parseInt(sub.category_id, 10) 
                : sub.category_id
            })()
            
            if (categoryId) {
              // Calculate category budget (from category-level entries - entries with category_id but no subcategory_id)
              const categoryBudget = newEntries
                .filter((e) => e.category_id === categoryId && !e.subcategory_id)
                .reduce((sum, e) => sum + (Number(e.budgeted_amount) || 0), 0)
              
              // Calculate subcategory total (entries with this subcategory_id, which may also have category_id)
              const subcategoryTotal = newEntries
                .filter((e) => e.subcategory_id === entry.subcategory_id)
                .reduce((sum, e) => {
                  const amount = e === entry ? newAmount : (Number(e.budgeted_amount) || 0)
                  return sum + amount
                }, 0)
            
              if (subcategoryTotal > categoryBudget) {
                setEntryErrors((prev) => ({
                  ...prev,
                  [index]: `Subcategory total (${formatAmount(subcategoryTotal)}) exceeds category budget (${formatAmount(categoryBudget)})`,
                }))
              } else {
                // Clear error if valid
                setEntryErrors((prev) => {
                  const newErrors = { ...prev }
                  delete newErrors[index]
                  return newErrors
                })
              }
            }
          } else {
            // Clear error if not a subcategory entry
            setEntryErrors((prev) => {
              const newErrors = { ...prev }
              delete newErrors[index]
              return newErrors
            })
          }
        }
      }
      setError(undefined)
    }

    newEntries[index] = entry
    setEntries(newEntries)
  }

  const handleSubmit = async () => {
    setError(undefined)

    // Check if there are any entry errors
    if (Object.keys(entryErrors).length > 0) {
      setError("Please fix the validation errors before saving")
      return
    }

    // Filter out entries with 0 amount - these are placeholders
    const validEntries = entries.filter((entry) => {
      const amount = entry.budgeted_amount !== undefined 
        ? (typeof entry.budgeted_amount === "string" ? Number.parseFloat(entry.budgeted_amount) : entry.budgeted_amount) 
        : 0
      return amount > 0
    })

    // Validate entries
    for (const entry of validEntries) {
      if (entry.category_id === null && entry.subcategory_id === null) {
        setError("Each budget entry must have either a category or subcategory selected")
        return
      }
      // Entries can now have both category_id and subcategory_id (subcategory entries will have both)
    }

    // Validate that subcategory totals don't exceed their parent category budgets
    const categoryBudgets = new Map<number, number>()
    const subcategoryTotals = new Map<number, number>()
    
    // First, calculate category-level budgets
    validEntries.forEach((entry) => {
      if (entry.category_id && !entry.subcategory_id) {
        const categoryId = typeof entry.category_id === "string" 
          ? Number.parseInt(entry.category_id, 10) 
          : entry.category_id
        const current = categoryBudgets.get(categoryId) || 0
        categoryBudgets.set(categoryId, current + (Number(entry.budgeted_amount) || 0))
      }
    })
    
    // Then, calculate subcategory totals grouped by category
    validEntries.forEach((entry) => {
      if (entry.subcategory_id) {
        // Get category ID from entry or from subcategory
        let categoryId: number | null = null
        if (entry.category_id) {
          categoryId = typeof entry.category_id === "string"
            ? Number.parseInt(entry.category_id, 10)
            : entry.category_id
        } else {
          const subcategoryId = entry.subcategory_id
          if (subcategoryId !== null) {
            const sub = subcategories.find((s) => {
              const sId = typeof s.id === "string" ? Number.parseInt(s.id, 10) : s.id
              return sId === subcategoryId
            })
            if (sub) {
              categoryId = typeof sub.category_id === "string" 
                ? Number.parseInt(sub.category_id, 10) 
                : sub.category_id
            }
          }
        }
        
        if (categoryId) {
          const current = subcategoryTotals.get(categoryId) || 0
          subcategoryTotals.set(categoryId, current + (Number(entry.budgeted_amount) || 0))
        }
      }
    })
    
    // Check if any subcategory totals exceed their category budgets
    for (const [categoryId, subcategoryTotal] of subcategoryTotals.entries()) {
      const categoryBudget = categoryBudgets.get(categoryId) || 0
      if (subcategoryTotal > categoryBudget) {
        const category = categories.find((c) => c.id === categoryId)
        const categoryName = category?.name || `Category ${categoryId}`
        setError(
          `Subcategory budgets for ${categoryName} total ${formatAmount(subcategoryTotal)}, which exceeds the category budget of ${formatAmount(categoryBudget)}. Please adjust your budgets.`
        )
        return
      }
    }

    setIsSubmitting(true)

    // Calculate total budget from budget settings (income - savings goal)
    const monthlyIncome = budgetSettings ? Number(budgetSettings.monthly_income) || 0 : 0
    const monthlySavingsGoal = budgetSettings ? Number(budgetSettings.monthly_savings_goal) || 0 : 0
    const totalBudget = monthlyIncome - monthlySavingsGoal

    if (isNaN(totalBudget) || totalBudget <= 0) {
      setError("Total budget must be greater than 0. Please check your income and savings goal in settings.")
      setIsSubmitting(false)
      return
    }

    // Prepare entries for API, ensuring all amounts are valid numbers
    const apiEntries = validEntries
      .map((entry) => {
        const amount = Number(entry.budgeted_amount) || 0
        if (isNaN(amount) || amount <= 0) {
          return null // Filter out invalid entries
        }
        
        return {
          category_id:
            entry.category_id !== null
              ? typeof entry.category_id === "string"
                ? Number.parseInt(entry.category_id, 10)
                : entry.category_id
              : null,
          subcategory_id:
            entry.subcategory_id !== null
              ? typeof entry.subcategory_id === "string"
                ? Number.parseInt(entry.subcategory_id, 10)
                : entry.subcategory_id
              : null,
          budgeted_amount: amount,
        }
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)

    if (isDefaultMode) {
      // Save to default budget
      const budgetData = {
        total_budget: totalBudget,
        entries: apiEntries,
      }
      
      let success
      if (defaultBudget) {
        success = await updateDefaultBudget(budgetData)
      } else {
        success = await createDefaultBudget(budgetData)
      }
      
      if (success) {
        toast({
          title: "Success",
          description: "Default budget template updated successfully",
        })
        await fetchDefaultBudget()
        setError(undefined)
      } else {
        toast({
          title: "Error",
          description: "Failed to update default budget template",
          variant: "destructive",
        })
      }
    } else {
      // Save to monthly budget
      const year = selectedMonth.getFullYear()
      const month = selectedMonth.getMonth() + 1

      // Check if budget exists for current month
      const currentBudget = await fetchMonthlyBudget(year, month)

      if (currentBudget) {
        // Update existing budget
        const success = await updateMonthlyBudget(year, month, {
          total_budget: totalBudget,
          entries: apiEntries,
        })

        if (success) {
          toast({
            title: "Success",
            description: "Budget updated successfully",
          })
          // Refresh the budget
          await fetchMonthlyBudget(year, month)
          setError(undefined)
        } else {
          toast({
            title: "Error",
            description: "Failed to update budget",
            variant: "destructive",
          })
        }
      } else {
        // Create new budget if it doesn't exist
        const budgetCreate: BudgetTemplateCreate = {
          month,
          year,
          total_budget: totalBudget,
          entries: apiEntries,
        }
        
        const createdBudget = await createMonthlyBudget(budgetCreate)
        
        if (createdBudget) {
          toast({
            title: "Success",
            description: "Budget created successfully",
          })
          setError(undefined)
          // Refresh the budget
          await fetchMonthlyBudget(year, month)
        } else {
          setError("Failed to create budget. Please try again.")
        }
      }
    }

    setIsSubmitting(false)
  }

  // Calculate budget summary with proper number conversion and NaN handling
  const monthlyIncome = budgetSettings ? Number(budgetSettings.monthly_income) || 0 : 0
  const monthlySavingsGoal = budgetSettings ? Number(budgetSettings.monthly_savings_goal) || 0 : 0
  const availableBudget = monthlyIncome - monthlySavingsGoal

  // Calculate transaction totals for the selected month
  const transactionTotals = useMemo(() => {
    if (isDefaultMode) {
      return { income: 0, expenses: 0, transfers: 0 }
    }

    const year = selectedMonth.getFullYear()
    const month = selectedMonth.getMonth() + 1
    
    // Filter transactions for the selected month
    const monthTransactions = transactions.filter((t) => {
      const dateStr = t.date.toString().substring(0, 7) // "YYYY-MM"
      const selectedYearMonth = `${year}-${String(month).padStart(2, '0')}`
      return dateStr === selectedYearMonth
    })

    let totalIncome = 0
    let totalExpenses = 0
    let totalTransfers = 0

    monthTransactions.forEach((t) => {
      const amount = Number(t.amount) || 0
      const transactionType = t.transaction_type || "expense" // Default to expense for backwards compatibility

      if (transactionType === "income") {
        totalIncome += Math.abs(amount)
      } else if (transactionType === "expense") {
        totalExpenses += Math.abs(amount)
      } else if (transactionType === "transfer") {
        totalTransfers += Math.abs(amount)
      }
    })

    return { income: totalIncome, expenses: totalExpenses, transfers: totalTransfers }
  }, [transactions, selectedMonth, isDefaultMode])
  
  // Safely calculate total budgeted - only count category-level budgets (not subcategories)
  // Subcategory budgets are nested within their parent category budgets
  const totalBudgeted = entries.reduce((sum, entry) => {
    // Only count entries that are category-level (have category_id but no subcategory_id)
    // Subcategory entries are already accounted for within their parent category
    if (entry.subcategory_id !== null) {
      return sum // Skip subcategory entries - they're part of their parent category
    }
    const amount = Number(entry.budgeted_amount) || 0
    if (isNaN(amount)) return sum
    return sum + amount
  }, 0)
  
  const remainingBudget = availableBudget - totalBudgeted
  const isBudgetExceeded = remainingBudget < 0
  
  // Ensure all values are valid numbers (not NaN)
  const safeAvailableBudget = isNaN(availableBudget) ? 0 : availableBudget
  const safeTotalBudgeted = isNaN(totalBudgeted) ? 0 : totalBudgeted
  const safeRemainingBudget = isNaN(remainingBudget) ? 0 : remainingBudget

  // Filter subcategories based on selected category (for each entry)
  const getSubcategoriesForCategory = (categoryId: number | null) => {
    if (!categoryId) return subcategories // Show all if no category selected
    return subcategories.filter((sub) => String(sub.category_id) === String(categoryId))
  }

  // Organize entries hierarchically: group by category, with subcategories nested
  const organizedEntries = useMemo(() => {
    const categoryMap = new Map<number, {
      category: CategoryResponse
      categoryEntries: Array<{
        entry: BudgetTemplateEntryUpdate
        entryIndex: number
      }>
      subcategories: Array<{
        entry: BudgetTemplateEntryUpdate
        entryIndex: number
        subcategory: SubcategoryResponse
      }>
    }>()

    // First, find all category-level entries (entries with category_id but no subcategory_id)
    entries.forEach((entry, index) => {
      if (entry.category_id && !entry.subcategory_id) {
        const entryCategoryId = typeof entry.category_id === "string" 
          ? Number.parseInt(entry.category_id, 10) 
          : entry.category_id
        const category = categories.find((c) => c.id === entryCategoryId)
        if (category) {
          const categoryId = category.id
          if (!categoryMap.has(categoryId)) {
            categoryMap.set(categoryId, {
              category,
              categoryEntries: [],
              subcategories: [],
            })
          }
          categoryMap.get(categoryId)!.categoryEntries.push({
            entry,
            entryIndex: index,
          })
        }
      }
    })

    // Then, add subcategory entries under their parent categories
    // Subcategory entries can have both category_id and subcategory_id
    entries.forEach((entry, index) => {
      if (entry.subcategory_id) {
        const subcategoryId = entry.subcategory_id
        const subcategory = subcategories.find((s) => {
          const sId = typeof s.id === "string" ? Number.parseInt(s.id, 10) : s.id
          return sId === subcategoryId
        })
        if (subcategory) {
          // Use the category_id from the entry if available, otherwise use the subcategory's parent
          const categoryId = entry.category_id 
            ? (typeof entry.category_id === "string" ? Number.parseInt(entry.category_id, 10) : entry.category_id)
            : (typeof subcategory.category_id === "string" ? Number.parseInt(subcategory.category_id, 10) : subcategory.category_id)
          const category = categories.find((c) => c.id === categoryId)
          if (category) {
            if (!categoryMap.has(categoryId)) {
              categoryMap.set(categoryId, {
                category,
                categoryEntries: [],
                subcategories: [],
              })
            }
            categoryMap.get(categoryId)!.subcategories.push({
              entry,
              entryIndex: index,
              subcategory,
            })
          }
        }
      }
    })

    return Array.from(categoryMap.values())
  }, [entries, categories, subcategories])

  // Calculate remaining budget per category
  const getCategoryRemainingBudget = (categoryId: number) => {
    const categoryTotal = organizedEntries.find((org) => org.category.id === categoryId)
    if (!categoryTotal) return 0
    
    const categoryBudget = categoryTotal.categoryEntries.reduce(
      (sum, catEntry) => sum + (Number(catEntry.entry.budgeted_amount) || 0),
      0
    )
    const subcategoryTotal = categoryTotal.subcategories.reduce(
      (sum, sub) => sum + (Number(sub.entry.budgeted_amount) || 0),
      0
    )
    
    return categoryBudget - subcategoryTotal
  }

  if (authLoading || !isAuthenticated) {
    return null
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <DashboardHeader />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center py-12">Loading budget...</div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardHeader />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => router.push(isDefaultMode ? "/settings" : "/")} className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
              </Button>
              <h1 className="text-2xl font-bold">
                {isDefaultMode 
                  ? "Edit Default Budget Template" 
                  : `Edit Budget - ${selectedMonth.toLocaleString("default", { month: "long", year: "numeric" })}`
                }
              </h1>
            </div>
            {!isDefaultMode && (
              <MonthSelector selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
            )}
          </div>

          {error && (
            <div 
              ref={errorRef} 
              className="mb-4 rounded-md border-2 border-red-500 bg-red-50 dark:bg-red-950/30 p-4 text-base font-medium text-red-800 dark:text-red-200 shadow-lg"
            >
              <div className="flex items-start gap-3">
                <div className="text-red-600 dark:text-red-400 text-xl flex-shrink-0">⚠️</div>
                <div className="flex-1">{error}</div>
              </div>
            </div>
          )}

          {budgetSettings && entries.length > 0 && safeTotalBudgeted > safeAvailableBudget && (
            <div className="mb-4 rounded-md bg-yellow-50 dark:bg-yellow-950/30 p-4 text-sm text-yellow-800 dark:text-yellow-200">
              <p className="font-medium mb-1">Budget Exceeded</p>
              <p>
                Your current category-level budget entries total {formatAmount(safeTotalBudgeted)}, which exceeds your available budget of {formatAmount(safeAvailableBudget)}. 
                Please adjust your entries or update your income/savings goal in Settings.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Note: Subcategory budgets are nested within their parent category budgets and don&apos;t add to the total.
              </p>
            </div>
          )}

          {/* Budget Summary Cards */}
          {budgetSettings && (
            <>
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Available Budget</p>
                      <p className="text-2xl font-bold">{formatAmount(safeAvailableBudget)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatAmount(monthlyIncome)} income - {formatAmount(monthlySavingsGoal)} savings
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Total Budgeted</p>
                      <p className="text-2xl font-bold">{formatAmount(safeTotalBudgeted)}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Remaining Budget</p>
                      <p
                        className={`text-2xl font-bold ${
                          isBudgetExceeded
                            ? "text-red-600 dark:text-red-400"
                            : safeRemainingBudget === 0
                              ? "text-yellow-600 dark:text-yellow-400"
                              : "text-green-600 dark:text-green-400"
                        }`}
                      >
                        {formatAmount(Math.abs(safeRemainingBudget))}
                      </p>
                      {safeRemainingBudget === 0 && (
                        <p className="text-xs text-yellow-600 dark:text-yellow-400">Budget fully allocated</p>
                      )}
                      {isBudgetExceeded && (
                        <p className="text-xs text-red-600 dark:text-red-400">Budget exceeded</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Transaction Totals - Only show for monthly budgets */}
              {!isDefaultMode && (
                <div className="grid gap-4 md:grid-cols-3 mb-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Total Income</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {formatAmount(transactionTotals.income)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Budget: {formatAmount(monthlyIncome)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Total Expenses</p>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                          {formatAmount(transactionTotals.expenses)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Budgeted: {formatAmount(safeTotalBudgeted)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Total Transfers</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {formatAmount(transactionTotals.transfers)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Savings Goal: {formatAmount(monthlySavingsGoal)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}

          {!budgetSettings && (
            <Card className="mb-6">
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground mb-4">
                  Please set your monthly income and savings goal in Settings first.
                </p>
                <Button onClick={() => router.push("/settings")} className="bg-emerald-500 hover:bg-emerald-600">
                  Go to Settings
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Budget Entries */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Budget Distribution</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Allocate your budget across categories and subcategories
                  </p>
                </div>
                {budgetSettings && (
                  <div className="flex gap-2">
                    <Button onClick={() => setIsCreateCategoryOpen(true)} size="sm" variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Category
                    </Button>
                    <Button onClick={addEntry} size="sm" variant="outline" disabled={safeRemainingBudget <= 0 || isNaN(safeRemainingBudget)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Entry
                    </Button>
                    {!isDefaultMode && defaultBudget && entries.length > 0 && (
                      <Button onClick={() => setIsResetDialogOpen(true)} size="sm" variant="outline">
                        Reset to Default
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {entries.length === 0 ? (
                <div className="text-center py-8">
                  {isDefaultMode ? (
                    <div className="space-y-4">
                      <p className="text-muted-foreground">No default budget template entries yet.</p>
                      <p className="text-sm text-muted-foreground">
                        Add categories and budget amounts to create your default template.
                      </p>
                      <div className="flex gap-4 justify-center">
                        <Button onClick={addEntry} className="bg-emerald-500 hover:bg-emerald-600">
                          <Plus className="mr-2 h-4 w-4" />
                          Add First Entry
                        </Button>
                      </div>
                    </div>
                  ) : defaultBudget ? (
                    <div className="space-y-4">
                      <p className="text-muted-foreground">No budget found for this month.</p>
                      <p className="text-sm text-muted-foreground">
                        Would you like to create one based on your default budget, or start from scratch?
                      </p>
                      <div className="flex gap-4 justify-center">
                        <Button onClick={handleCreateFromDefault} className="bg-emerald-500 hover:bg-emerald-600">
                          Create from Default
                        </Button>
                        <Button onClick={addEntry} variant="outline">
                          Start from Scratch
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-muted-foreground">No budget entries yet.</p>
                      <p className="text-sm text-muted-foreground">
                        Create a default budget template first, or add entries manually.
                      </p>
                      <div className="flex gap-4 justify-center">
                        <Button onClick={() => router.push("/budget?default=true")} className="bg-emerald-500 hover:bg-emerald-600">
                          Create Default Budget Template
                        </Button>
                        <Button onClick={addEntry} variant="outline">
                          Add Entry Manually
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Hierarchical display of organized entries */}
                  {organizedEntries.length > 0 && (
                    <div className="space-y-4 mb-6">
                      {organizedEntries.map((orgEntry) => {
                        const categoryRemaining = getCategoryRemainingBudget(orgEntry.category.id)
                        const categoryBudget = orgEntry.categoryEntries.reduce(
                          (sum, catEntry) => sum + (Number(catEntry.entry.budgeted_amount) || 0),
                          0
                        )
                        const subcategoryTotal = orgEntry.subcategories.reduce(
                          (sum, sub) => sum + (Number(sub.entry.budgeted_amount) || 0),
                          0
                        )

                        return (
                          <div key={orgEntry.category.id} className="border rounded-lg p-4 space-y-4">
                            {/* Category Header */}
                            <div className="flex items-center justify-between pb-2 border-b">
                              <div className="flex items-center gap-2">
                                {orgEntry.category.icon && <span className="text-xl">{orgEntry.category.icon}</span>}
                                <span className="font-semibold text-lg">{orgEntry.category.name}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteCategory(orgEntry.category.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className="text-sm text-muted-foreground">Category Budget</p>
                                  <p className="font-semibold">{formatAmount(categoryBudget)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-muted-foreground">Remaining</p>
                                  <p className={`font-semibold ${categoryRemaining < 0 ? "text-red-600" : categoryRemaining === 0 ? "text-yellow-600" : "text-green-600"}`}>
                                    {formatAmount(categoryRemaining)}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Category-level budget entries */}
                            <div className="pl-4 space-y-2">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium text-muted-foreground">Category Budget:</p>
                                {orgEntry.categoryEntries.length === 0 && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => addCategoryBudgetEntry(orgEntry.category.id)}
                                  >
                                    <Plus className="mr-2 h-3 w-3" />
                                    Add Budget
                                  </Button>
                                )}
                              </div>
                              {orgEntry.categoryEntries.map((catEntry) => {
                                const entryIndex = catEntry.entryIndex
                                return (
                                  <div key={entryIndex} className="grid gap-4 md:grid-cols-3 items-center bg-blue-50 dark:bg-blue-950/20 rounded p-3">
                                    <div className="flex items-center gap-2">
                                      {orgEntry.category.icon && <span>{orgEntry.category.icon}</span>}
                                      <span className="font-medium">{orgEntry.category.name} (Category Level)</span>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                      <div className="relative flex-1">
                                        <span className="absolute left-3 top-2.5">$</span>
                                        <Input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={catEntry.entry.budgeted_amount !== null && catEntry.entry.budgeted_amount !== undefined && catEntry.entry.budgeted_amount !== 0 ? catEntry.entry.budgeted_amount : ""}
                                          onChange={(e) => {
                                            const value = e.target.value
                                            if (value === "") {
                                              updateEntry(entryIndex, "budgeted_amount", 0)
                                            } else {
                                              const numValue = Number.parseFloat(value)
                                              if (!isNaN(numValue)) {
                                                updateEntry(entryIndex, "budgeted_amount", numValue)
                                              }
                                            }
                                          }}
                                          onBlur={(e) => {
                                            // Ensure we have a valid number when blurring
                                            const value = e.target.value
                                            if (value === "" || value === "0") {
                                              updateEntry(entryIndex, "budgeted_amount", 0)
                                            }
                                          }}
                                          onWheel={(e) => e.currentTarget.blur()}
                                          className="pl-7"
                                        />
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeEntry(entryIndex)}
                                        className="text-red-600 hover:text-red-700"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    {entryErrors[entryIndex] && (
                                      <p className="text-xs text-red-600 dark:text-red-400 col-span-3">{entryErrors[entryIndex]}</p>
                                    )}
                                  </div>
                                )
                              })}
                            </div>

                            {/* Subcategories */}
                            <div className="pl-4 space-y-2">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium text-muted-foreground">Subcategories:</p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setPendingSubcategoryCategoryId(orgEntry.category.id)
                                    setIsCreateSubcategoryOpen(true)
                                  }}
                                >
                                  <Plus className="mr-2 h-3 w-3" />
                                  Add Subcategory
                                </Button>
                              </div>
                              
                              {/* Show subcategories with budget entries */}
                              {orgEntry.subcategories.map((subEntry) => {
                                const entryIndex = subEntry.entryIndex
                                return (
                                  <div key={entryIndex} className="grid gap-4 md:grid-cols-3 items-center bg-gray-50 dark:bg-gray-900 rounded p-3">
                                    <div className="flex items-center gap-2">
                                      {subEntry.subcategory.icon && <span>{subEntry.subcategory.icon}</span>}
                                      <span className="font-medium">{subEntry.subcategory.name}</span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          const subcategoryId = typeof subEntry.subcategory.id === "string" 
                                            ? Number.parseInt(subEntry.subcategory.id, 10) 
                                            : subEntry.subcategory.id
                                          handleDeleteSubcategory(subcategoryId)
                                        }}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                      <div className="relative flex-1">
                                        <span className="absolute left-3 top-2.5">$</span>
                                        <Input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={subEntry.entry.budgeted_amount !== null && subEntry.entry.budgeted_amount !== undefined && subEntry.entry.budgeted_amount !== 0 ? subEntry.entry.budgeted_amount : ""}
                                          onChange={(e) => {
                                            const value = e.target.value
                                            if (value === "") {
                                              updateEntry(entryIndex, "budgeted_amount", 0)
                                            } else {
                                              const numValue = Number.parseFloat(value)
                                              if (!isNaN(numValue)) {
                                                updateEntry(entryIndex, "budgeted_amount", numValue)
                                              }
                                            }
                                          }}
                                          onBlur={(e) => {
                                            // Ensure we have a valid number when blurring
                                            const value = e.target.value
                                            if (value === "" || value === "0") {
                                              updateEntry(entryIndex, "budgeted_amount", 0)
                                            }
                                          }}
                                          onWheel={(e) => e.currentTarget.blur()}
                                          className="pl-7"
                                        />
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeEntry(entryIndex)}
                                        className="text-red-600 hover:text-red-700"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    {entryErrors[entryIndex] && (
                                      <p className="text-xs text-red-600 dark:text-red-400 col-span-3">{entryErrors[entryIndex]}</p>
                                    )}
                                  </div>
                                )
                              })}

                              {/* Show subcategories without budget entries */}
                              {getSubcategoriesForCategory(orgEntry.category.id)
                                .filter((sub) => 
                                  !orgEntry.subcategories.some((subEntry) => {
                                    const subEntryId = typeof subEntry.subcategory.id === "string" 
                                      ? Number.parseInt(subEntry.subcategory.id, 10) 
                                      : subEntry.subcategory.id
                                    const subId = typeof sub.id === "string" 
                                      ? Number.parseInt(sub.id, 10) 
                                      : sub.id
                                    return subEntryId === subId
                                  })
                                )
                                .map((subcategory) => (
                                  <div key={subcategory.id} className="grid gap-4 md:grid-cols-3 items-center bg-gray-50/50 dark:bg-gray-900/50 rounded p-3 border-2 border-dashed">
                                    <div className="flex items-center gap-2">
                                      {subcategory.icon && <span>{subcategory.icon}</span>}
                                      <span className="font-medium text-muted-foreground">{subcategory.name}</span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          const subcategoryId = typeof subcategory.id === "string" 
                                            ? Number.parseInt(subcategory.id, 10) 
                                            : subcategory.id
                                          handleDeleteSubcategory(subcategoryId)
                                        }}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                      <span className="text-sm text-muted-foreground flex-1">No budget set</span>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          const subcategoryId = typeof subcategory.id === "string" 
                                            ? Number.parseInt(subcategory.id, 10) 
                                            : subcategory.id
                                          addSubcategoryBudgetEntry(orgEntry.category.id, subcategoryId)
                                        }}
                                      >
                                        <Plus className="mr-2 h-3 w-3" />
                                        Add Budget
                                      </Button>
                                    </div>
                                  </div>
                                ))}

                              {categoryBudget > 0 && orgEntry.subcategories.length > 0 && (
                                <div className="text-sm text-muted-foreground pt-2">
                                  Subcategory Total: {formatAmount(subcategoryTotal)} / Category Budget: {formatAmount(categoryBudget)}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Unorganized entries (entries without category/subcategory) */}
                  {entries.filter((e) => {
                    // Show entries that don't have a category_id or subcategory_id
                    // Entries with category_id/subcategory_id are shown in organizedEntries
                    return !e.category_id && !e.subcategory_id
                  }).length > 0 && (
                    <div className="space-y-4 pt-4 border-t">
                      <p className="text-sm font-medium text-muted-foreground">Other Entries:</p>
                      {entries
                        .map((entry, index) => {
                          // Only show entries without category or subcategory
                          if (entry.category_id || entry.subcategory_id) {
                            return null
                          }
                          return { entry, index }
                        })
                        .filter((item): item is { entry: BudgetTemplateEntryUpdate; index: number } => item !== null)
                        .map(({ entry, index }) => {

                        const entrySubcategories = entry.category_id
                          ? getSubcategoriesForCategory(entry.category_id)
                          : subcategories

                        return (
                          <div key={index} className="border rounded-lg p-4 space-y-4">
                            <div className="grid gap-4 md:grid-cols-3">
                              <div className="space-y-2">
                            <Label htmlFor={`category-${index}`}>Category (optional)</Label>
                            <Select
                              value={entry.category_id !== null ? String(entry.category_id) : undefined}
                              onValueChange={(value) =>
                                updateEntry(index, "category_id", value ? Number.parseInt(value, 10) : null)
                              }
                              disabled={entry.subcategory_id !== null}
                            >
                                  <SelectTrigger id={`category-${index}`} className="w-full">
                                    {entry.category_id !== null ? (
                                      (() => {
                                        const selectedCategory = categories.find(
                                          (cat) => String(cat.id) === String(entry.category_id)
                                        )
                                        return selectedCategory ? (
                                          <span className="flex items-center text-foreground">
                                            {selectedCategory.icon && <span className="mr-2">{selectedCategory.icon}</span>}
                                            <span>{selectedCategory.name}</span>
                                          </span>
                                        ) : (
                                          <SelectValue placeholder="Select category" />
                                        )
                                      })()
                                    ) : (
                                      <SelectValue placeholder="Select category" />
                                    )}
                                  </SelectTrigger>
                                  <SelectContent>
                                    {categoriesLoading ? (
                                      <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading...</div>
                                    ) : categories.length === 0 ? (
                                      <div className="px-2 py-1.5 text-sm text-muted-foreground">No categories available</div>
                                    ) : (
                                      categories.map((category) => (
                                        <SelectItem key={category.id} value={String(category.id)}>
                                          {category.icon && <span className="mr-2">{category.icon}</span>}
                                          {category.name}
                                        </SelectItem>
                                      ))
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor={`subcategory-${index}`}>Subcategory (optional)</Label>
                                <Select
                                  value={entry.subcategory_id !== null ? String(entry.subcategory_id) : undefined}
                                  onValueChange={(value) =>
                                    updateEntry(index, "subcategory_id", value ? Number.parseInt(value, 10) : null)
                                  }
                                >
                                  <SelectTrigger id={`subcategory-${index}`} className="w-full">
                                    {entry.subcategory_id !== null ? (
                                      (() => {
                                        const selectedSubcategory = subcategories.find(
                                          (sub) => String(sub.id) === String(entry.subcategory_id)
                                        )
                                        return selectedSubcategory ? (
                                          <span className="flex items-center text-foreground">
                                            {selectedSubcategory.icon && <span className="mr-2">{selectedSubcategory.icon}</span>}
                                            <span>{selectedSubcategory.name}</span>
                                          </span>
                                        ) : (
                                          <SelectValue placeholder="Select subcategory" />
                                        )
                                      })()
                                    ) : (
                                      <SelectValue
                                        placeholder={
                                          entry.category_id
                                            ? "Select subcategory"
                                            : "Select category first"
                                        }
                                      />
                                    )}
                                  </SelectTrigger>
                                  <SelectContent>
                                    {isLoadingSubcategories ? (
                                      <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading...</div>
                                    ) : entrySubcategories.length === 0 ? (
                                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                        {entry.category_id ? "No subcategories available" : "Select category first"}
                                      </div>
                                    ) : (
                                      entrySubcategories.map((subcategory) => (
                                        <SelectItem key={subcategory.id} value={String(subcategory.id)}>
                                          {subcategory.icon && <span className="mr-2">{subcategory.icon}</span>}
                                          {subcategory.name}
                                        </SelectItem>
                                      ))
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor={`amount-${index}`}>Budget Amount</Label>
                                <div className="flex gap-2">
                                  <div className="relative flex-1">
                                    <span className="absolute left-3 top-2.5">$</span>
                                    <Input
                                      id={`amount-${index}`}
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={entry.budgeted_amount !== null && entry.budgeted_amount !== undefined && entry.budgeted_amount !== 0 ? entry.budgeted_amount : ""}
                                      onChange={(e) => {
                                        const value = e.target.value
                                        if (value === "") {
                                          updateEntry(index, "budgeted_amount", 0)
                                        } else {
                                          const numValue = Number.parseFloat(value)
                                          if (!isNaN(numValue)) {
                                            updateEntry(index, "budgeted_amount", numValue)
                                          }
                                        }
                                      }}
                                      onBlur={(e) => {
                                        // Ensure we have a valid number when blurring
                                        const value = e.target.value
                                        if (value === "" || value === "0") {
                                          updateEntry(index, "budgeted_amount", 0)
                                        }
                                      }}
                                      onWheel={(e) => {
                                        e.currentTarget.blur()
                                      }}
                                      className="pl-7"
                                    />
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeEntry(index)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                {entryErrors[index] && (
                                  <p className="text-xs text-red-600 dark:text-red-400">{entryErrors[index]}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </CardContent>
            {budgetSettings && (
              <CardContent className="border-t pt-4">
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || entries.length === 0}
                  className="w-full bg-emerald-500 hover:bg-emerald-600"
                >
                  {isSubmitting ? "Saving..." : "Save Budget"}
                </Button>
              </CardContent>
            )}
          </Card>
        </div>
      </main>

      {/* Create Category Dialog */}
      <Dialog
        open={isCreateCategoryOpen}
        onOpenChange={(open) => {
          setIsCreateCategoryOpen(open)
          if (!open) {
            setNewCategory({ name: "", description: "", color: "#3B82F6", icon: "" })
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Category</DialogTitle>
            <DialogDescription>Add a new category to organize your expenses.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Name *</Label>
              <Input
                id="category-name"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                placeholder="e.g., Food, Travel, Entertainment"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-description">Description</Label>
              <Input
                id="category-description"
                value={newCategory.description || ""}
                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category-color">Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="category-color"
                    type="color"
                    value={newCategory.color || "#3B82F6"}
                    onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                    className="h-10 w-20"
                  />
                  <Input
                    type="text"
                    value={newCategory.color || "#3B82F6"}
                    onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                    placeholder="#3B82F6"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category-icon">Icon (emoji)</Label>
                <Popover open={categoryEmojiPickerOpen} onOpenChange={setCategoryEmojiPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start h-10"
                    >
                      {newCategory.icon ? (
                        <span className="text-xl">{newCategory.icon}</span>
                      ) : (
                        <>
                          <Smile className="mr-2 h-4 w-4" />
                          <span>Select emoji</span>
                        </>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-4">
                    <div className="grid grid-cols-8 gap-2 max-h-64 overflow-y-auto">
                      {EXPENSE_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            setNewCategory({ ...newCategory, icon: emoji })
                            setCategoryEmojiPickerOpen(false)
                          }}
                          className="text-2xl hover:bg-gray-100 rounded p-2 transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setNewCategory({ ...newCategory, icon: "" })
                          setCategoryEmojiPickerOpen(false)
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateCategoryOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCategory} disabled={isCreatingCategory || !newCategory.name.trim()}>
              {isCreatingCategory ? "Creating..." : "Create Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Subcategory Dialog */}
      <Dialog
        open={isCreateSubcategoryOpen}
        onOpenChange={(open) => {
          setIsCreateSubcategoryOpen(open)
          if (!open) {
            setNewSubcategory({ name: "", description: "", color: "#3B82F6", icon: "" })
            setPendingSubcategoryCategoryId(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Subcategory</DialogTitle>
            <DialogDescription>
              Add a new subcategory. Select a category below if one isn&apos;t already selected.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subcategory-category-select">Category *</Label>
              <Select
                value={pendingSubcategoryCategoryId !== null ? String(pendingSubcategoryCategoryId) : undefined}
                onValueChange={(value) => setPendingSubcategoryCategoryId(value ? Number.parseInt(value, 10) : null)}
              >
                <SelectTrigger id="subcategory-category-select" className="w-full">
                  {pendingSubcategoryCategoryId !== null ? (
                    (() => {
                      const selectedCategory = categories.find((cat) => String(cat.id) === String(pendingSubcategoryCategoryId))
                      return selectedCategory ? (
                        <span className="flex items-center text-foreground">
                          {selectedCategory.icon && <span className="mr-2">{selectedCategory.icon}</span>}
                          <span>{selectedCategory.name}</span>
                        </span>
                      ) : (
                        <SelectValue placeholder="Select a category" />
                      )
                    })()
                  ) : (
                    <SelectValue placeholder="Select a category" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {categoriesLoading ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading...</div>
                  ) : categories.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">No categories available</div>
                  ) : (
                    categories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.icon && <span className="mr-2">{category.icon}</span>}
                        {category.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subcategory-name">Name *</Label>
              <Input
                id="subcategory-name"
                value={newSubcategory.name}
                onChange={(e) => setNewSubcategory({ ...newSubcategory, name: e.target.value })}
                placeholder="e.g., Groceries, Restaurants, Fast Food"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subcategory-description">Description</Label>
              <Input
                id="subcategory-description"
                value={newSubcategory.description || ""}
                onChange={(e) => setNewSubcategory({ ...newSubcategory, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subcategory-color">Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="subcategory-color"
                    type="color"
                    value={newSubcategory.color || "#3B82F6"}
                    onChange={(e) => setNewSubcategory({ ...newSubcategory, color: e.target.value })}
                    className="h-10 w-20"
                  />
                  <Input
                    type="text"
                    value={newSubcategory.color || "#3B82F6"}
                    onChange={(e) => setNewSubcategory({ ...newSubcategory, color: e.target.value })}
                    placeholder="#3B82F6"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subcategory-icon">Icon (emoji)</Label>
                <Popover open={subcategoryEmojiPickerOpen} onOpenChange={setSubcategoryEmojiPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start h-10"
                    >
                      {newSubcategory.icon ? (
                        <span className="text-xl">{newSubcategory.icon}</span>
                      ) : (
                        <>
                          <Smile className="mr-2 h-4 w-4" />
                          <span>Select emoji</span>
                        </>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-4">
                    <div className="grid grid-cols-8 gap-2 max-h-64 overflow-y-auto">
                      {EXPENSE_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            setNewSubcategory({ ...newSubcategory, icon: emoji })
                            setSubcategoryEmojiPickerOpen(false)
                          }}
                          className="text-2xl hover:bg-gray-100 rounded p-2 transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setNewSubcategory({ ...newSubcategory, icon: "" })
                          setSubcategoryEmojiPickerOpen(false)
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateSubcategoryOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateSubcategory}
              disabled={isCreatingSubcategory || !newSubcategory.name.trim() || !pendingSubcategoryCategoryId}
            >
              {isCreatingSubcategory ? "Creating..." : "Create Subcategory"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset to Default Dialog */}
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset to Default Budget</DialogTitle>
            <DialogDescription>
              This will replace your current month&apos;s budget with your default budget template. 
              All current entries will be replaced. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetDialogOpen(false)} disabled={isResetting}>
              Cancel
            </Button>
            <Button onClick={handleResetToDefault} disabled={isResetting} className="bg-emerald-500 hover:bg-emerald-600">
              {isResetting ? "Resetting..." : "Reset to Default"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function BudgetPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col bg-background">
        <DashboardHeader />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center py-12">Loading budget...</div>
        </main>
      </div>
    }>
      <BudgetPageContent />
    </Suspense>
  )
}
