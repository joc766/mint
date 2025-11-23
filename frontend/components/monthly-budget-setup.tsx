"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { useCategories } from "@/contexts/categories-context"
import { apiClient } from "@/lib/api-client"
import type {
  BudgetTemplateEntryUpdate,
  BudgetTemplateCreate,
  SubcategoryResponse,
  CategoryCreate,
  SubcategoryCreate,
  CategoryResponse,
  UserBudgetSettingsResponse,
} from "@/lib/types"
import { Plus, Trash2, Smile } from "lucide-react"

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

interface MonthlyBudgetSetupProps {
  onComplete?: () => void
}

export function MonthlyBudgetSetup({ onComplete }: MonthlyBudgetSetupProps) {
  const { categories = [], isLoading: categoriesLoading = false, fetchCategories } = useCategories()
  const [subcategories, setSubcategories] = useState<SubcategoryResponse[]>([])
  const [isLoadingSubcategories, setIsLoadingSubcategories] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [entries, setEntries] = useState<BudgetTemplateEntryUpdate[]>([])
  const [error, setError] = useState<string>()
  const [entryErrors, setEntryErrors] = useState<Record<number, string>>({})
  const [budgetSettings, setBudgetSettings] = useState<UserBudgetSettingsResponse | null>(null)
  const [_isLoadingBudgetSettings, setIsLoadingBudgetSettings] = useState(false)
  const hasLoadedDefaults = useRef(false)
  const errorRef = useRef<HTMLDivElement>(null)

  // Dialog states
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false)
  const [isCreateSubcategoryOpen, setIsCreateSubcategoryOpen] = useState(false)
  const [_pendingEntryIndex, setPendingEntryIndex] = useState<number | null>(null)
  const [pendingSubcategoryCategoryId, setPendingSubcategoryCategoryId] = useState<number | null>(null)
  const [categoryEmojiPickerOpen, setCategoryEmojiPickerOpen] = useState(false)
  const [subcategoryEmojiPickerOpen, setSubcategoryEmojiPickerOpen] = useState(false)

  // Category creation form state
  const [newCategory, setNewCategory] = useState<CategoryCreate>({
    name: "",
    description: "",
    color: "#3B82F6",
    icon: "",
  })
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)

  // Subcategory creation form state
  const [newSubcategory, setNewSubcategory] = useState<SubcategoryCreate>({
    name: "",
    description: "",
    color: "#3B82F6",
    icon: "",
  })
  const [isCreatingSubcategory, setIsCreatingSubcategory] = useState(false)

  // Fetch subcategories
  const fetchSubcategories = async () => {
    try {
      setIsLoadingSubcategories(true)
      const { data, error: apiError } = await apiClient.get<SubcategoryResponse[]>("/subcategories/")
      if (!apiError && data) {
        setSubcategories(data)
      }
    } catch (err) {
      // Silently handle errors during onboarding
      console.error("Failed to fetch subcategories:", err)
    } finally {
      setIsLoadingSubcategories(false)
    }
  }

  // Fetch budget settings
  useEffect(() => {
    const fetchBudgetSettings = async () => {
      try {
        setIsLoadingBudgetSettings(true)
        const { data, error: apiError } = await apiClient.get<UserBudgetSettingsResponse>("/budget/settings/")
        if (!apiError && data) {
          setBudgetSettings(data)
        }
      } catch (err) {
        console.error("Failed to fetch budget settings:", err)
      } finally {
        setIsLoadingBudgetSettings(false)
      }
    }
    fetchBudgetSettings()
  }, [])

  useEffect(() => {
    fetchSubcategories()
  }, [])

  // Scroll to error message when error occurs
  useEffect(() => {
    if (error && errorRef.current) {
      // Small delay to ensure DOM has updated
      setTimeout(() => {
        const elementPosition = errorRef.current?.getBoundingClientRect().top || 0
        const offsetPosition = elementPosition + window.pageYOffset - 16 // 16px padding
        
        window.scrollTo({
          top: Math.max(0, offsetPosition),
          behavior: "smooth"
        })
      }, 100)
    }
  }, [error])

  // Default categories to pre-load
  const defaultCategories = useMemo(() => [
    { name: "Food", icon: "🍔" },
    { name: "Travel", icon: "✈️" },
    { name: "Entertainment", icon: "🎬" },
    { name: "Shopping", icon: "🛍️" },
    { name: "Rent", icon: "🏠" },
    { name: "Groceries", icon: "🛒" },
    { name: "Health", icon: "🏥" },
  ], [])

  // Pre-load default category entries when categories are loaded (only once)
  useEffect(() => {
    // Only run if: categories are loaded, no entries exist, and we haven't loaded defaults yet
    if (categoriesLoading || entries.length > 0 || hasLoadedDefaults.current) {
      return
    }

    const loadDefaultCategories = async () => {
      // Mark as loaded immediately to prevent duplicate runs
      hasLoadedDefaults.current = true
      
      const defaultEntries: BudgetTemplateEntryUpdate[] = []
      const categoriesToCreate: string[] = []
      
      // First, check which categories need to be created
      for (const defaultCat of defaultCategories) {
        const category = categories.find((cat) => cat.name.toLowerCase() === defaultCat.name.toLowerCase())
        if (!category) {
          categoriesToCreate.push(defaultCat.name)
        }
      }
      
      // Create missing categories first (only if needed)
      if (categoriesToCreate.length > 0) {
        for (const categoryName of categoriesToCreate) {
          const defaultCat = defaultCategories.find((dc) => dc.name === categoryName)
          if (!defaultCat) continue
          
          try {
            const { error } = await apiClient.post<CategoryResponse>("/categories/", {
              name: defaultCat.name,
              icon: defaultCat.icon,
              color: "#3B82F6",
            })
            
            if (error) {
              console.error(`Failed to create default category ${defaultCat.name}:`, error)
            }
          } catch (err) {
            console.error(`Failed to create default category ${defaultCat.name}:`, err)
          }
        }
        
        // Refresh categories list after creating all missing ones
        await fetchCategories()
      }
      
      // Get fresh categories list (after potential creation and refresh)
      const { data: freshCategories } = await apiClient.get<CategoryResponse[]>("/categories/")
      const latestCategories = freshCategories || categories
      
      // Now create entries for all default categories
      for (const defaultCat of defaultCategories) {
        const category = latestCategories.find((cat) => cat.name.toLowerCase() === defaultCat.name.toLowerCase())
        if (category) {
          defaultEntries.push({
            category_id: category.id,
            subcategory_id: null,
            budgeted_amount: 0,
          })
        }
      }

      if (defaultEntries.length > 0) {
        setEntries(defaultEntries)
      }
    }
    
    loadDefaultCategories()
  }, [categoriesLoading, entries.length, categories, fetchCategories, defaultCategories])

  const addEntry = () => {
    const monthlyIncome = budgetSettings ? Number(budgetSettings.monthly_income) : 0
    const monthlySavingsGoal = budgetSettings ? Number(budgetSettings.monthly_savings_goal) : 0
    const availableBudget = monthlyIncome - monthlySavingsGoal
    const totalBudgeted = entries.reduce((sum, entry) => {
      const amount = typeof entry.budgeted_amount === "string" 
        ? Number.parseFloat(entry.budgeted_amount) 
        : entry.budgeted_amount || 0
      return sum + amount
    }, 0)
    const remainingBudget = availableBudget - totalBudgeted

    if (remainingBudget <= 0) {
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
  }

  const updateEntry = (
    index: number,
    field: "category_id" | "subcategory_id" | "budgeted_amount",
    value: number | null,
  ) => {
    const newEntries = [...entries]
    const entry = { ...newEntries[index] }
    const _oldAmount = entry.budgeted_amount

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
      entry.budgeted_amount = newAmount // Always update the value so user can type
      
      // Check validations
      if (budgetSettings) {
        const monthlyIncome = Number(budgetSettings.monthly_income)
        const monthlySavingsGoal = Number(budgetSettings.monthly_savings_goal)
        const availableBudget = monthlyIncome - monthlySavingsGoal
        // Calculate total budgeted including the new amount for this entry
        const totalBudgeted = entries.reduce((sum, e, i) => {
          const amount = i === index 
            ? newAmount 
            : (typeof e.budgeted_amount === "string" 
              ? Number.parseFloat(e.budgeted_amount) 
              : e.budgeted_amount || 0)
          return sum + amount
        }, 0)
        // Check if total exceeds available budget
        if (totalBudgeted > availableBudget) {
          setEntryErrors((prev) => ({
            ...prev,
            [index]: `Amount exceeds available budget`,
          }))
        } else {
          // Check if subcategory total exceeds category budget
          if (entry.subcategory_id && entry.category_id) {
            const categoryId = entry.category_id
            // Calculate category budget (from category-level entries)
            const categoryBudget = newEntries
              .filter((e) => e.category_id === categoryId && !e.subcategory_id)
              .reduce((sum, e) => sum + (Number(e.budgeted_amount) || 0), 0)
            
            // Calculate subcategory total (including this entry)
            const subcategoryTotal = newEntries
              .filter((e) => e.category_id === categoryId && e.subcategory_id)
              .reduce((sum, e) => {
                const amount = e === entry ? newAmount : (Number(e.budgeted_amount) || 0)
                return sum + amount
              }, 0)
            
            if (subcategoryTotal > categoryBudget) {
              setEntryErrors((prev) => ({
                ...prev,
                [index]: `Subcategory total ($${subcategoryTotal.toFixed(2)}) exceeds category budget ($${categoryBudget.toFixed(2)})`,
              }))
            } else {
              // Clear error if valid
              setEntryErrors((prev) => {
                const newErrors = { ...prev }
                delete newErrors[index]
                return newErrors
              })
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
      setError(undefined) // Clear global error when valid amount is entered
    }

    newEntries[index] = entry
    setEntries(newEntries)
  }

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

    // Refresh categories list
    await fetchCategories()

    // Reset form
    setNewCategory({
      name: "",
      description: "",
      color: "#3B82F6",
      icon: "",
    })
    setIsCreateCategoryOpen(false)

    // No longer auto-select in entry since we removed that functionality
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

    // Refresh subcategories list
    await fetchSubcategories()

    // Reset form
    setNewSubcategory({
      name: "",
      description: "",
      color: "#3B82F6",
      icon: "",
    })
    setPendingSubcategoryCategoryId(null)
    setIsCreateSubcategoryOpen(false)

    // No longer auto-select in entry since we removed that functionality
    setIsCreatingSubcategory(false)
  }

  const openCreateCategoryDialog = () => {
    setPendingEntryIndex(null)
    setIsCreateCategoryOpen(true)
  }

  const openCreateSubcategoryDialog = (categoryId: number | null) => {
    setPendingEntryIndex(null)
    setPendingSubcategoryCategoryId(categoryId)
    setIsCreateSubcategoryOpen(true)
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

      // Refresh categories list
      await fetchCategories()
      
      // Remove category from any budget entries
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

      // Refresh subcategories list
      await fetchSubcategories()
      
      // Remove subcategory from any budget entries
      setEntries(entries.map((entry) => {
        if (entry.subcategory_id === subcategoryId) {
          return {
            ...entry,
            subcategory_id: null,
          }
        }
        return entry
      }))
      
      setError(undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete subcategory")
    }
  }

  const handleSubmit = async () => {
    setError(undefined)

    // Check if there are any entry errors
    if (Object.keys(entryErrors).length > 0) {
      setError("Please fix the validation errors before saving")
      return
    }

    // Filter out entries with 0 amount - these are likely placeholders
    const validEntries = entries.filter((entry) => {
      const amount = typeof entry.budgeted_amount === "string" 
        ? Number.parseFloat(entry.budgeted_amount) 
        : entry.budgeted_amount || 0
      return amount > 0
    })

    if (validEntries.length === 0) {
      setError("Please add at least one budget entry with an amount greater than 0")
      return
    }

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
          `Subcategory budgets for ${categoryName} total $${subcategoryTotal.toFixed(2)}, which exceeds the category budget of $${categoryBudget.toFixed(2)}. Please adjust your budgets.`
        )
        return
      }
    }

    setIsSubmitting(true)

    // Calculate total budget from budget settings (income - savings goal)
    // This is the total available budget, not the sum of individual entries
    const monthlyIncome = budgetSettings ? Number(budgetSettings.monthly_income) : 0
    const monthlySavingsGoal = budgetSettings ? Number(budgetSettings.monthly_savings_goal) : 0
    const totalBudget = monthlyIncome - monthlySavingsGoal

    if (totalBudget <= 0) {
      setError("Total budget must be greater than 0. Please check your income and savings goal.")
      setIsSubmitting(false)
      return
    }

    // Get current month and year
    const now = new Date()
    const month = now.getMonth() + 1 // JavaScript months are 0-indexed
    const year = now.getFullYear()

    // Prepare entries for API (convert category_id/subcategory_id to numbers)
    const apiEntries = validEntries.map((entry) => ({
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
      budgeted_amount: typeof entry.budgeted_amount === "string" 
        ? Number.parseFloat(entry.budgeted_amount) 
        : (entry.budgeted_amount || 0),
    }))

    // Create monthly budget using the new endpoint
    const budgetCreate: BudgetTemplateCreate = {
      month,
      year,
      total_budget: totalBudget,
      entries: apiEntries,
    }

    const { error: apiError } = await apiClient.post("/budget/monthly/", budgetCreate)

    if (apiError) {
      setError(apiError)
      setIsSubmitting(false)
      return
    }

    setIsSubmitting(false)
    setError(undefined)
    
    // Call onComplete callback if provided (e.g., for onboarding flow)
    if (onComplete) {
      onComplete()
    }
  }

  const totalBudget = entries.reduce((sum, entry) => {
    const amount = typeof entry.budgeted_amount === "string" 
      ? Number.parseFloat(entry.budgeted_amount) 
      : entry.budgeted_amount || 0
    return sum + amount
  }, 0)
  const monthlyIncome = budgetSettings ? Number(budgetSettings.monthly_income) : 0
  const monthlySavingsGoal = budgetSettings ? Number(budgetSettings.monthly_savings_goal) : 0
  const availableBudget = monthlyIncome - monthlySavingsGoal
  const remainingBudget = availableBudget - totalBudget
  const isBudgetExceeded = remainingBudget < 0

  // Helper to get category name by ID
  const _getCategoryName = (categoryId: number | null) => {
    if (categoryId === null) return ""
    const category = categories.find((cat) => String(cat.id) === String(categoryId))
    return category ? `${category.icon ? category.icon + " " : ""}${category.name}` : ""
  }

  // Helper to get subcategory name by ID
  const _getSubcategoryName = (subcategoryId: number | null) => {
    if (subcategoryId === null) return ""
    const subcategory = subcategories.find((sub) => String(sub.id) === String(subcategoryId))
    return subcategory ? `${subcategory.icon ? subcategory.icon + " " : ""}${subcategory.name}` : ""
  }

  return (
    <div className="space-y-6">
      {/* Category and Subcategory Management Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Categories & Subcategories</h3>
          <div className="flex gap-2">
            <Button onClick={openCreateCategoryDialog} size="sm" variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
            <Button onClick={() => openCreateSubcategoryDialog(null)} size="sm" variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Add Subcategory
            </Button>
          </div>
        </div>

        {error && (
          <div 
            ref={errorRef} 
            className="rounded-md border-2 border-red-500 bg-red-50 p-4 text-base font-medium text-red-800 shadow-lg"
          >
            <div className="flex items-start gap-3">
              <div className="text-red-600 text-xl flex-shrink-0">⚠️</div>
              <div className="flex-1">{error}</div>
            </div>
          </div>
        )}

        {/* Categories List */}
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-3">Categories</h4>
            {categoriesLoading ? (
              <p className="text-sm text-muted-foreground">Loading categories...</p>
            ) : categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No categories yet. Create one to get started.</p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      {category.icon && <span className="text-xl">{category.icon}</span>}
                      <span className="font-medium">{category.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCategory(category.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subcategories List */}
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-3">Subcategories</h4>
            {isLoadingSubcategories ? (
              <p className="text-sm text-muted-foreground">Loading subcategories...</p>
            ) : subcategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subcategories yet. Create one to get started.</p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {subcategories.map((subcategory) => {
                  const parentCategory = categories.find((cat) => cat.id === subcategory.category_id)
                  return (
                    <div
                      key={subcategory.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-2">
                        {subcategory.icon && <span className="text-xl">{subcategory.icon}</span>}
                        <div className="flex flex-col">
                          <span className="font-medium">{subcategory.name}</span>
                          {parentCategory && (
                            <span className="text-xs text-muted-foreground">{parentCategory.name}</span>
                          )}
                        </div>
                      </div>
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
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Budget Setting Section */}
      <div className="space-y-4 border-t pt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Set Your Budget</h3>
          <Button
            onClick={addEntry}
            size="sm"
            variant="outline"
            disabled={remainingBudget <= 0}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Budget Entry
          </Button>
        </div>

        {budgetSettings && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Available Budget</p>
                  <p className="text-2xl font-bold">${availableBudget.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">
                    ${monthlyIncome.toFixed(2)} income - ${monthlySavingsGoal.toFixed(2)} savings
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Budgeted</p>
                  <p className="text-2xl font-bold">${totalBudget.toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Remaining Budget</p>
                  <p className={`text-2xl font-bold ${isBudgetExceeded ? "text-red-600" : remainingBudget === 0 ? "text-yellow-600" : "text-green-600"}`}>
                    ${remainingBudget.toFixed(2)}
                  </p>
                  {remainingBudget === 0 && (
                    <p className="text-xs text-yellow-600">Budget fully allocated</p>
                  )}
                  {isBudgetExceeded && (
                    <p className="text-xs text-red-600">Budget exceeded</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {entries.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <p>No budget entries yet. Click &quot;Add Budget Entry&quot; to get started.</p>
            </CardContent>
          </Card>
      ) : (
        <div className="space-y-4">
          {entries.map((entry, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor={`category-${index}`}>Category (optional)</Label>
                    <Select
                      value={entry.category_id !== null ? String(entry.category_id) : undefined}
                      onValueChange={(value) => updateEntry(index, "category_id", value ? Number.parseInt(value, 10) : null)}
                      disabled={entry.subcategory_id !== null}
                    >
                      <SelectTrigger id={`category-${index}`} className="w-full">
                        {entry.category_id !== null ? (
                          (() => {
                            const selectedCategory = categories.find((cat) => String(cat.id) === String(entry.category_id))
                            return selectedCategory ? (
                              <span className="flex items-center text-foreground">
                                {selectedCategory.icon && <span className="mr-2">{selectedCategory.icon}</span>}
                                <span>{selectedCategory.name}</span>
                              </span>
                            ) : (
                              <SelectValue placeholder={entry.subcategory_id !== null ? "Clear subcategory first" : "Select category"} />
                            )
                          })()
                        ) : (
                          <SelectValue placeholder={entry.subcategory_id !== null ? "Clear subcategory first" : "Select category"} />
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
                    {entry.category_id !== null && (
                      <p className="text-xs text-muted-foreground">
                        Note: Selecting a category will clear the subcategory selection
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`subcategory-${index}`}>Subcategory (optional)</Label>
                    <Select
                      value={entry.subcategory_id !== null ? String(entry.subcategory_id) : undefined}
                      onValueChange={(value) => updateEntry(index, "subcategory_id", value ? Number.parseInt(value, 10) : null)}
                    >
                      <SelectTrigger id={`subcategory-${index}`} className="w-full">
                        {entry.subcategory_id !== null ? (
                          (() => {
                            const selectedSubcategory = subcategories.find((sub) => String(sub.id) === String(entry.subcategory_id))
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
                          <SelectValue placeholder="Select subcategory" />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingSubcategories ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading...</div>
                        ) : subcategories.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">No subcategories available</div>
                        ) : (
                          subcategories.map((subcategory) => (
                            <SelectItem key={subcategory.id} value={String(subcategory.id)}>
                              {subcategory.icon && <span className="mr-2">{subcategory.icon}</span>}
                              {subcategory.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {entry.subcategory_id !== null && (
                      <p className="text-xs text-muted-foreground">
                        Note: Selecting a subcategory will clear the category selection
                      </p>
                    )}
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
                          value={entry.budgeted_amount || ""}
                          onChange={(e) => updateEntry(index, "budgeted_amount", Number.parseFloat(e.target.value) || 0)}
                          onWheel={(e) => {
                            // Prevent scroll from changing number input values
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
                      <p className="text-xs text-red-600">{entryErrors[index]}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || isBudgetExceeded || remainingBudget < 0}
            className="w-full"
          >
            {isSubmitting ? "Saving..." : "Save Budget"}
          </Button>
          {isBudgetExceeded && (
            <p className="text-sm text-red-600 text-center">
              Please adjust your budget entries. Total budgeted amount exceeds available budget.
            </p>
          )}
        </div>
      )}
      </div>

      {/* Create Category Dialog */}
      <Dialog
        open={isCreateCategoryOpen}
        onOpenChange={(open) => {
          setIsCreateCategoryOpen(open)
          if (!open) {
            setNewCategory({ name: "", description: "", color: "#3B82F6", icon: "" })
            setPendingEntryIndex(null)
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
            setPendingEntryIndex(null)
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
    </div>
  )
}
