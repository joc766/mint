"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AddExpenseDialog } from "@/components/add-expense-dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, ChevronRight, ChevronDown } from "lucide-react"
import { useCurrency } from "@/contexts/currency-context"
import { useTransactions } from "@/contexts/transactions-context"
import { useCategories } from "@/contexts/categories-context"
import { CategorizeTransactionDialog } from "@/components/categorize-transaction-dialog"
import type { TransactionResponse, SubcategoryResponse } from "@/lib/types"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { apiClient } from "@/lib/api-client"

export function ExpenseList({ selectedMonth = new Date() }) {
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false)
  const [isCategorizeOpen, setIsCategorizeOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionResponse | null>(null)
  const [filteredExpenses, setFilteredExpenses] = useState<TransactionResponse[]>([])
  const [activeFilter, setActiveFilter] = useState("all")
  const [filterType, setFilterType] = useState("category")
  const { formatAmount } = useCurrency()
  const router = useRouter()
  const { transactions, isLoading, fetchTransactions } = useTransactions()
  const { categories } = useCategories()
  const [subcategories, setSubcategories] = useState<SubcategoryResponse[]>([])

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

  useEffect(() => {
    // Fetch transactions for the selected month
    const startDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1).toISOString().split('T')[0]
    const endDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).toISOString().split('T')[0]
    
    fetchTransactions({
      start_date: startDate,
      end_date: endDate,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth])

  useEffect(() => {
    // Filter transactions for the selected month
    const monthTransactions = transactions.filter((expense) => {
      const expenseDate = new Date(expense.date)
      return (
        expenseDate.getMonth() === selectedMonth.getMonth() && expenseDate.getFullYear() === selectedMonth.getFullYear()
      )
    })

    // Sort by date (newest first)
    const sortedExpenses = [...monthTransactions].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })

    // Apply filter based on active filter and filter type
    if (activeFilter === "all") {
      setFilteredExpenses(sortedExpenses)
    } else {
      if (filterType === "category") {
        const categoryFiltered = sortedExpenses.filter((expense) => {
          const categoryName = getCategoryName(expense.custom_category_id, expense.custom_subcategory_id)
          return categoryName === activeFilter
        })
        setFilteredExpenses(categoryFiltered)
      } else {
        // Filter by merchant
        const merchantFiltered = sortedExpenses.filter((expense) => expense.merchant_name === activeFilter)
        setFilteredExpenses(merchantFiltered)
      }
    }
  }, [transactions, selectedMonth, activeFilter, filterType])

  const getCategoryName = (categoryId: number | null | undefined, subcategoryId: number | null | undefined): string => {
    if (subcategoryId) {
      const subcategory = subcategories.find((s) => Number.parseInt(s.id) === subcategoryId)
      if (subcategory) {
        const category = categories.find((cat) => cat.id === subcategory.category_id)
        return category ? `${category.name} - ${subcategory.name}` : subcategory.name
      }
      return `Subcategory ${subcategoryId}`
    }
    if (categoryId) {
      const category = categories.find((cat) => Number.parseInt(cat.id) === categoryId)
      return category ? category.name : `Category ${categoryId}`
    }
    return "Uncategorized"
  }

  const categoriesFromTransactions = Array.from(
    new Set(
      transactions
        .filter((t) => {
          const date = new Date(t.date)
          return date.getMonth() === selectedMonth.getMonth() && date.getFullYear() === selectedMonth.getFullYear()
        })
        .map((t) => getCategoryName(t.custom_category_id, t.custom_subcategory_id))
    )
  ).map((name) => ({ id: name.toLowerCase(), name }))

  const handleFilterChange = (value: string) => {
    setActiveFilter(value)
  }

  const handleFilterTypeChange = (type: string) => {
    setFilterType(type)
    setActiveFilter("all")
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Expenses</CardTitle>
        <Button size="sm" onClick={() => setIsAddExpenseOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Add Expense
        </Button>
      </CardHeader>

      <div className="px-6">
        <div className="flex justify-between items-center mb-4">
          <Tabs defaultValue="all" value={activeFilter} onValueChange={handleFilterChange} className="flex-1">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="all" className="px-4">
                All
              </TabsTrigger>
              {filterType === "category"
                ? categoriesFromTransactions.slice(0, 5).map((category) => (
                    <TabsTrigger key={category.id} value={category.name} className="px-4">
                      {category.name}
                    </TabsTrigger>
                  ))
                : Array.from(new Set(transactions.map((t) => t.merchant_name)))
                    .slice(0, 5)
                    .map((merchant) => (
                      <TabsTrigger key={merchant} value={merchant} className="px-4">
                        {merchant || "Unknown"}
                      </TabsTrigger>
                    ))}
            </TabsList>
          </Tabs>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="ml-2 bg-transparent">
                Filter by: {filterType === "category" ? "Category" : "Merchant"}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleFilterTypeChange("category")}>Category</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFilterTypeChange("merchant")}>Merchant</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <CardContent className="pt-0">
        {isLoading ? (
          <div className="text-center py-6 text-muted-foreground">Loading transactions...</div>
        ) : filteredExpenses.length > 0 ? (
          <div className="space-y-4">
            {filteredExpenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between border-b pb-4 cursor-pointer hover:bg-gray-50 p-2 rounded-lg -mx-2"
                onClick={() => {
                  setSelectedTransaction(expense)
                  setIsCategorizeOpen(true)
                }}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xl bg-emerald-500">
                    {getCategoryName(expense.custom_category_id, expense.custom_subcategory_id).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium flex items-center">
                      <span>{expense.merchant_name || expense.name || "Unknown Merchant"}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground ml-1" />
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center">
                      <span className="mr-2">{getCategoryName(expense.custom_category_id, expense.custom_subcategory_id)}</span>
                      <span>•</span>
                      <span className="ml-2">{new Date(expense.date).toLocaleDateString()}</span>
                    </div>
                    {expense.notes && (
                      <div className="text-xs text-muted-foreground mt-1">{expense.notes}</div>
                    )}
                  </div>
                </div>
                <div className="font-medium">{formatAmount(expense.amount)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            {transactions.length > 0
              ? `No expenses found for ${filterType === "category" ? "this category" : "this merchant"}`
              : `No transactions for ${selectedMonth.toLocaleString("default", { month: "long", year: "numeric" })}`}
          </div>
        )}
      </CardContent>
      <AddExpenseDialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen} />
      <CategorizeTransactionDialog
        open={isCategorizeOpen}
        onOpenChange={setIsCategorizeOpen}
        transaction={selectedTransaction}
      />
    </Card>
  )
}
