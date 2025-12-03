"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AddExpenseDialog } from "@/components/add-expense-dialog"
import { Button } from "@/components/ui/button"
import { Plus, ChevronRight, ChevronDown, CheckSquare, Square, X, Search, Trash2, ArrowUp, ArrowDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useCurrency } from "@/contexts/currency-context"
import { useTransactions } from "@/contexts/transactions-context"
import { useCategories } from "@/contexts/categories-context"
import { CategorizeTransactionDialog } from "@/components/categorize-transaction-dialog"
import type { TransactionResponse, SubcategoryResponse } from "@/lib/types"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiClient } from "@/lib/api-client"
import { capitalize } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { BulkCategorizeDialog } from "@/components/bulk-categorize-dialog"

export function ExpenseList({ selectedMonth = new Date() }) {
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false)
  const [isCategorizeOpen, setIsCategorizeOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionResponse | null>(null)
  const [filteredExpenses, setFilteredExpenses] = useState<TransactionResponse[]>([])
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null)
  const [activeMerchantFilter, setActiveMerchantFilter] = useState<string | null>(null)
  const [activeTransactionTypeFilter, setActiveTransactionTypeFilter] = useState<string | null>(null)
  const [isBulkMode, setIsBulkMode] = useState(false)
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<Set<number>>(new Set())
  const [isBulkCategorizeOpen, setIsBulkCategorizeOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"date" | "amount">("date")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const { formatAmount } = useCurrency()
  const _router = useRouter()
  const { transactions, isLoading, fetchTransactions, updateTransaction, deleteTransaction } = useTransactions()
  const { categories } = useCategories()
  const [subcategories, setSubcategories] = useState<SubcategoryResponse[]>([])
  const [subcategoriesByCategory, setSubcategoriesByCategory] = useState<Record<number, SubcategoryResponse[]>>({})
  const { toast } = useToast()

  // Format date string without timezone conversion
  const formatDateLocal = (dateString: string | Date) => {
    const dateStr = dateString.toString().substring(0, 10) // "YYYY-MM-DD"
    const [year, month, day] = dateStr.split('-')
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString()
  }

  // Fetch all subcategories once
  useEffect(() => {
    const fetchSubcategories = async () => {
      try {
        const { data } = await apiClient.get<SubcategoryResponse[]>("/subcategories/")
        if (data) {
          setSubcategories(data)
          // Group subcategories by category_id
          const grouped: Record<number, SubcategoryResponse[]> = {}
          data.forEach((sub) => {
            const catId = typeof sub.category_id === "string" ? Number.parseInt(sub.category_id, 10) : sub.category_id
            if (!grouped[catId]) grouped[catId] = []
            grouped[catId].push(sub)
          })
          setSubcategoriesByCategory(grouped)
        }
      } catch (err) {
        console.error("Failed to fetch subcategories:", err)
      }
    }
    fetchSubcategories()
  }, [])

  useEffect(() => {
    // Fetch transactions for the selected month
    // Use local date formatting to avoid timezone issues
    const year = selectedMonth.getFullYear()
    const month = selectedMonth.getMonth() + 1 // JS months are 0-indexed
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate() // Get last day of month
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    fetchTransactions({
      start_date: startDate,
      end_date: endDate,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth])

  const getCategoryName = useCallback((categoryId: number | null | undefined, subcategoryId: number | null | undefined): string => {
    if (subcategoryId) {
      const subcategory = subcategories.find((s) => {
        const sId = typeof s.id === "string" ? Number.parseInt(s.id, 10) : s.id
        return sId === subcategoryId
      })
      if (subcategory) {
        const categoryIdFromSub = typeof subcategory.category_id === "string"
          ? Number.parseInt(subcategory.category_id, 10)
          : subcategory.category_id
        const category = categories.find((cat) => cat.id === categoryIdFromSub)
        return category ? `${category.name} - ${subcategory.name}` : subcategory.name
      }
      return `Subcategory ${subcategoryId}`
    }
    if (categoryId) {
      const category = categories.find((cat) => cat.id === categoryId)
      return category ? category.name : `Category ${categoryId}`
    }
    return "Uncategorized"
  }, [categories, subcategories])

  // Get transactions for the selected month using string-based date comparison
  const monthTransactions = useMemo(() => {
    return transactions.filter((expense) => {
      // Extract year-month from ISO date string to avoid timezone issues
      const dateStr = expense.date.toString().substring(0, 7) // "YYYY-MM"
      const selectedYearMonth = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`
      return dateStr === selectedYearMonth
    })
  }, [transactions, selectedMonth])

  useEffect(() => {
    // Sort based on selected sort option and direction
    const sortedExpenses = [...monthTransactions].sort((a, b) => {
      let comparison = 0

      if (sortBy === "date") {
        // Sort by date
        const dateA = new Date(a.date).getTime()
        const dateB = new Date(b.date).getTime()
        comparison = dateB - dateA // Default: newest first (desc)
      } else {
        // Sort by actual amount value (not absolute)
        // This will naturally group: positive values together, negative values together
        const amountA = Number(a.amount) || 0
        const amountB = Number(b.amount) || 0
        comparison = amountB - amountA // Default: largest positive first, then most negative (desc)
      }

      // Reverse if ascending
      return sortDirection === "asc" ? -comparison : comparison
    })

    // Apply all active filters with AND logic
    let filtered = sortedExpenses
    
    // Apply category filter
    if (activeCategoryFilter) {
      filtered = filtered.filter((expense) => {
        const categoryName = getCategoryName(expense.custom_category_id, expense.custom_subcategory_id)
        return categoryName === activeCategoryFilter
      })
    }
    
    // Apply merchant filter
    if (activeMerchantFilter) {
      filtered = filtered.filter((expense) => expense.merchant_name === activeMerchantFilter)
    }
    
    // Apply transaction type filter
    if (activeTransactionTypeFilter) {
      filtered = filtered.filter((expense) => {
        const transactionType = expense.transaction_type ? capitalize(expense.transaction_type) : "Unknown"
        return transactionType === activeTransactionTypeFilter
      })
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter((expense) => {
        const name = (expense.name || "").toLowerCase()
        const merchant = (expense.merchant_name || "").toLowerCase()
        const notes = (expense.notes || "").toLowerCase()
        return name.includes(query) || merchant.includes(query) || notes.includes(query)
      })
    }

    setFilteredExpenses(filtered)
  }, [monthTransactions, activeCategoryFilter, activeMerchantFilter, activeTransactionTypeFilter, getCategoryName, searchQuery, sortBy, sortDirection])

  // Get categories from transactions for the selected month (using string-based date comparison)
  const categoriesFromTransactions = useMemo(() => {
    return Array.from(
      new Set(
        monthTransactions.map((t) => getCategoryName(t.custom_category_id, t.custom_subcategory_id))
      )
    ).map((name) => ({ id: name.toLowerCase(), name }))
  }, [monthTransactions, getCategoryName])

  const transactionTypesFromTransactions = useMemo(() => {
    return Array.from(
      new Set(
        monthTransactions.map((t) => t.transaction_type ? capitalize(t.transaction_type) : "Unknown")
      )
    ).map((name) => ({ id: name.toLowerCase(), name }))
  }, [monthTransactions,])

  const merchantsFromTransactions = useMemo(() => {
    return Array.from(
      new Set(
        monthTransactions.map((t) => t.merchant_name).filter((merchant): merchant is string => !!merchant)
      )
    ).map((name) => ({ id: name.toLowerCase(), name }))
  }, [monthTransactions])

  const handleCategoryFilterChange = (value: string) => {
    setActiveCategoryFilter(value === "__clear__" ? null : value)
  }

  const handleMerchantFilterChange = (value: string) => {
    setActiveMerchantFilter(value === "__clear__" ? null : value)
  }

  const handleTransactionTypeFilterChange = (value: string) => {
    setActiveTransactionTypeFilter(value === "__clear__" ? null : value)
  }

  const toggleBulkMode = () => {
    setIsBulkMode(!isBulkMode)
    setSelectedTransactionIds(new Set())
  }

  const toggleTransactionSelection = (transactionId: number) => {
    setSelectedTransactionIds((prev) => {
      const next = new Set(prev)
      if (next.has(transactionId)) {
        next.delete(transactionId)
      } else {
        next.add(transactionId)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedTransactionIds.size === filteredExpenses.length) {
      setSelectedTransactionIds(new Set())
    } else {
      setSelectedTransactionIds(new Set(filteredExpenses.map((t) => t.id)))
    }
  }

  const handleTransactionTypeChange = async (transactionId: number, transactionType: string | null) => {
    let transaction_type: string | null = null
    if (transactionType !== "__clear__") {
      transaction_type = transactionType
    }

    const result = await updateTransaction(transactionId, {
      transaction_type
    })

    if (result) {
      toast({
        title: "Success",
        description: "Transaction updated"
      })
      await fetchTransactions()
    } else {
      toast({
        title: "Error",
        description: "Failed to update transaction",
        variant: "destructive",
      })
    }
  }

  // Handle inline category change
  const handleCategoryChange = async (transactionId: number, categoryId: string | null) => {
    let custom_category_id: number | null = null
    let custom_subcategory_id: number | null = null

    if (categoryId && categoryId !== "__clear__") {
      custom_category_id = Number.parseInt(categoryId, 10)
      // Clear subcategory when category changes
      custom_subcategory_id = null
    }

    const result = await updateTransaction(transactionId, {
      custom_category_id,
      custom_subcategory_id,
    })

    if (result) {
      toast({
        title: "Success",
        description: "Transaction updated",
      })
      await fetchTransactions()
    } else {
      toast({
        title: "Error",
        description: "Failed to update transaction",
        variant: "destructive",
      })
    }
  }

  // Handle inline subcategory change
  const handleSubcategoryChange = async (transactionId: number, subcategoryId: string | null, categoryId?: number) => {
    let custom_category_id: number | null = null
    let custom_subcategory_id: number | null = null

    if (subcategoryId && subcategoryId !== "__clear__") {
      const subcategory = subcategories.find((s) => {
        const sId = typeof s.id === "string" ? Number.parseInt(s.id, 10) : s.id
        return sId === Number.parseInt(subcategoryId, 10)
      })
      if (subcategory) {
        custom_subcategory_id = typeof subcategory.id === "string" ? Number.parseInt(subcategory.id, 10) : subcategory.id
        custom_category_id = typeof subcategory.category_id === "string"
          ? Number.parseInt(subcategory.category_id, 10)
          : subcategory.category_id
      }
    } else if (categoryId) {
      // If subcategory cleared but category exists, keep category
      custom_category_id = categoryId
      custom_subcategory_id = null
    }

    const result = await updateTransaction(transactionId, {
      custom_category_id,
      custom_subcategory_id,
    })

    if (result) {
      toast({
        title: "Success",
        description: "Transaction updated",
      })
      await fetchTransactions()
    } else {
      toast({
        title: "Error",
        description: "Failed to update transaction",
        variant: "destructive",
      })
    }
  }

  const handleTransactionClick = (expense: TransactionResponse) => {
    if (isBulkMode) {
      toggleTransactionSelection(expense.id)
    } else {
      setSelectedTransaction(expense)
      setIsCategorizeOpen(true)
    }
  }

  const handleBulkCategorize = () => {
    if (selectedTransactionIds.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one transaction",
        variant: "destructive",
      })
      return
    }
    setIsBulkCategorizeOpen(true)
  }

  const handleDeleteTransaction = async (transactionId: number, transactionName: string) => {
    if (!confirm(`Are you sure you want to delete this transaction?\n\n${transactionName}\n\nThis action cannot be undone.`)) {
      return
    }

    const success = await deleteTransaction(transactionId)
    if (success) {
      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      })
      await fetchTransactions()
    } else {
      toast({
        title: "Error",
        description: "Failed to delete transaction",
        variant: "destructive",
      })
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Transactions</CardTitle>
          <div className="flex gap-2">
            {isBulkMode ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAll}
                >
                  {selectedTransactionIds.size === filteredExpenses.length ? (
                    <>
                      <Square className="mr-1 h-4 w-4" /> Deselect All
                    </>
                  ) : (
                    <>
                      <CheckSquare className="mr-1 h-4 w-4" /> Select All
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkCategorize}
                  disabled={selectedTransactionIds.size === 0}
                >
                  Categorize {selectedTransactionIds.size > 0 ? `(${selectedTransactionIds.size})` : ""}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleBulkMode}
                >
                  <X className="mr-1 h-4 w-4" /> Cancel
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={toggleBulkMode}>
                  <CheckSquare className="mr-1 h-4 w-4" /> Select
                </Button>
                <Button size="sm" onClick={() => setIsAddExpenseOpen(true)}>
                  <Plus className="mr-1 h-4 w-4" /> Add Expense
                </Button>
              </>
            )}
          </div>
        </CardHeader>

        <div className="px-6">
          <div className="mb-4">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search transactions by name, merchant, or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2 items-center">
                <Select 
                  value={activeCategoryFilter || "__clear__"} 
                  onValueChange={handleCategoryFilterChange}
                >
                  <SelectTrigger className="w-[160px] bg-transparent">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__clear__">
                      <span className="text-muted-foreground">All Categories</span>
                    </SelectItem>
                    {categoriesFromTransactions.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select 
                  value={activeMerchantFilter || "__clear__"} 
                  onValueChange={handleMerchantFilterChange}
                >
                  <SelectTrigger className="w-[160px] bg-transparent">
                    <SelectValue placeholder="Merchant" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__clear__">
                      <span className="text-muted-foreground">All Merchants</span>
                    </SelectItem>
                    {merchantsFromTransactions.map((merchant) => (
                      <SelectItem key={merchant.id} value={merchant.name}>
                        {merchant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select 
                  value={activeTransactionTypeFilter || "__clear__"} 
                  onValueChange={handleTransactionTypeFilterChange}
                >
                  <SelectTrigger className="w-[160px] bg-transparent">
                    <SelectValue placeholder="Transaction Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__clear__">
                      <span className="text-muted-foreground">All Types</span>
                    </SelectItem>
                    {transactionTypesFromTransactions.map((transactionType) => (
                      <SelectItem key={transactionType.id} value={transactionType.name}>
                        {transactionType.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {(activeCategoryFilter || activeMerchantFilter || activeTransactionTypeFilter) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActiveCategoryFilter(null)
                      setActiveMerchantFilter(null)
                      setActiveTransactionTypeFilter(null)
                    }}
                    className="bg-transparent"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear Filters
                  </Button>
                )}
              </div>
              
              <div className="flex gap-2 flex-shrink-0">
                <Select value={sortBy} onValueChange={(value: "date" | "amount") => setSortBy(value)}>
                  <SelectTrigger className="w-[130px] bg-transparent">
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="amount">Amount</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
                  className="bg-transparent px-2"
                  title={sortDirection === "asc" ? "Ascending" : "Descending"}
                >
                  {sortDirection === "asc" ? (
                    <ArrowUp className="h-4 w-4" />
                  ) : (
                    <ArrowDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <CardContent className="pt-0">
          {isLoading ? (
            <div className="text-center py-6 text-muted-foreground">Loading transactions...</div>
          ) : filteredExpenses.length > 0 ? (
            <div className="space-y-4">
              {filteredExpenses.map((expense) => {
                const isSelected = selectedTransactionIds.has(expense.id)
                const currentCategoryId = expense.custom_category_id
                const currentTransactionType = expense.transaction_type
                const currentSubcategoryId = expense.custom_subcategory_id
                const availableSubcategories = currentCategoryId
                  ? subcategoriesByCategory[currentCategoryId] || []
                  : []

                return (
                  <div
                    key={expense.id}
                    className={`flex items-center justify-between border-b pb-4 p-2 rounded-lg -mx-2 transition-colors ${isBulkMode
                      ? `cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${isSelected ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500" : ""}`
                      : "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                    onClick={() => handleTransactionClick(expense)}
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      {isBulkMode && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleTransactionSelection(expense.id)
                          }}
                          className="cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <Square className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      )}
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xl bg-emerald-500">
                        {getCategoryName(expense.custom_category_id, expense.custom_subcategory_id).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium flex items-center">
                          <span>{expense.name}</span>
                          {!isBulkMode && <ChevronRight className="h-4 w-4 text-muted-foreground ml-1" />}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                          <span>{formatDateLocal(expense.date)}</span>
                          {expense.notes && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[200px]">{expense.notes}</span>
                            </>
                          )}
                        </div>
                        {!isBulkMode && (
                          <div className="flex items-center gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                            <Select
                              value={currentTransactionType ? currentTransactionType : "__clear__"}
                              onValueChange={(value) => handleTransactionTypeChange(expense.id, value)}
                            >
                              <SelectTrigger className="h-8 text-xs w-[140px]">
                                {currentTransactionType ? (() => {
                                  return currentTransactionType ? (
                                    <span className="flex items-center text-foreground">
                                      <span>{capitalize(currentTransactionType)}</span>
                                    </span>
                                  ) : (
                                    <SelectValue placeholder="Type" />
                                  )
                                })() : (
                                  <SelectValue placeholder="Type" />
                                )}
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__clear__">
                                  <span className="text-muted-foreground">Unknown</span>
                                </SelectItem>
                                <SelectItem value="expense">Expense</SelectItem>
                                <SelectItem value="income">Income</SelectItem>
                                <SelectItem value="transfer">Transfer</SelectItem>
                              </SelectContent>
                            </Select>
                            <Select
                              value={currentCategoryId ? String(currentCategoryId) : "__clear__"}
                              onValueChange={(value) => handleCategoryChange(expense.id, value)}
                            >
                              <SelectTrigger className="h-8 text-xs w-[140px]">
                                {currentCategoryId ? (() => {
                                  const cat = categories.find((c) => c.id === currentCategoryId)
                                  return cat ? (
                                    <span className="flex items-center text-foreground">
                                      {cat.icon && <span className="mr-1">{cat.icon}</span>}
                                      <span>{cat.name}</span>
                                    </span>
                                  ) : (
                                    <SelectValue placeholder="Category" />
                                  )
                                })() : (
                                  <SelectValue placeholder="Category" />
                                )}
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__clear__">
                                  <span className="text-muted-foreground">Uncategorized</span>
                                </SelectItem>
                                {categories.map((category) => (
                                  <SelectItem key={category.id} value={String(category.id)}>
                                    <span className="flex items-center">
                                      {category.icon && <span className="mr-2">{category.icon}</span>}
                                      <span>{category.name}</span>
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={currentSubcategoryId ? String(currentSubcategoryId) : "__clear__"}
                              onValueChange={(value) => handleSubcategoryChange(expense.id, value, currentCategoryId || undefined)}
                              disabled={!currentCategoryId}
                            >
                              <SelectTrigger className="h-8 text-xs w-[140px]">
                                {currentSubcategoryId ? (() => {
                                  const sub = availableSubcategories.find((s) => {
                                    const sId = typeof s.id === "string" ? Number.parseInt(s.id, 10) : s.id
                                    return sId === currentSubcategoryId
                                  })
                                  return sub ? (
                                    <span className="flex items-center text-foreground">
                                      {sub.icon && <span className="mr-1">{sub.icon}</span>}
                                      <span>{sub.name}</span>
                                    </span>
                                  ) : (
                                    <SelectValue placeholder="Subcategory" />
                                  )
                                })() : (
                                  <SelectValue placeholder="Subcategory" />
                                )}
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__clear__">
                                  <span className="text-muted-foreground">None</span>
                                </SelectItem>
                                {availableSubcategories.map((subcategory) => (
                                  <SelectItem key={subcategory.id} value={String(subcategory.id)}>
                                    <span className="flex items-center">
                                      {subcategory.icon && <span className="mr-2">{subcategory.icon}</span>}
                                      <span>{subcategory.name}</span>
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="font-medium">{formatAmount(Number(expense.amount))}</div>
                      {!isBulkMode && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteTransaction(expense.id, expense.merchant_name || expense.name || "Transaction")
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              {transactions.length > 0
                ? `No transactions found matching the selected filters`
                : `No transactions for ${selectedMonth.toLocaleString("default", { month: "long", year: "numeric" })}`}
            </div>
          )}
        </CardContent>
      </Card>
      <AddExpenseDialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen} defaultDate={selectedMonth} />
      <CategorizeTransactionDialog
        open={isCategorizeOpen}
        onOpenChange={setIsCategorizeOpen}
        transaction={selectedTransaction}
      />
      <BulkCategorizeDialog
        open={isBulkCategorizeOpen}
        onOpenChange={setIsBulkCategorizeOpen}
        transactionIds={Array.from(selectedTransactionIds)}
        onSuccess={() => {
          setSelectedTransactionIds(new Set())
          setIsBulkMode(false)
          fetchTransactions()
        }}
      />
    </>
  )
}
