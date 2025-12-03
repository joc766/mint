"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useCategories } from "@/contexts/categories-context"
import { useTransactions } from "@/contexts/transactions-context"
import { useToast } from "@/hooks/use-toast"
import { apiClient } from "@/lib/api-client"
import type { TransactionResponse, SubcategoryResponse } from "@/lib/types"

interface CategorizeTransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: TransactionResponse | null
}

export function CategorizeTransactionDialog({
  open,
  onOpenChange,
  transaction,
}: CategorizeTransactionDialogProps) {
  const { categories } = useCategories()
  const { updateTransaction, fetchTransactions } = useTransactions()
  const { toast } = useToast()
  const [subcategories, setSubcategories] = useState<SubcategoryResponse[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null)
  const [transactionType, setTransactionType] = useState<string>("expense")
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize form with transaction data
  useEffect(() => {
    if (transaction) {
      // Set transaction type
      setTransactionType(transaction.transaction_type || "expense")
      
      // Check if transaction has a category or subcategory
      if (transaction.custom_subcategory_id) {
        // Fetch subcategories to find the parent category
        const fetchSubcategoryInfo = async () => {
          try {
            const { data: allSubcategories } = await apiClient.get<SubcategoryResponse[]>("/subcategories/")
            const subcategory = allSubcategories?.find((s) => {
              const sId = typeof s.id === "string" ? Number.parseInt(s.id, 10) : s.id
              return sId === transaction.custom_subcategory_id
            })
            if (subcategory) {
              setSelectedCategoryId(String(subcategory.category_id))
              setSelectedSubcategoryId(String(transaction.custom_subcategory_id))
            }
          } catch (err) {
            console.error("Failed to fetch subcategory info:", err)
          }
        }
        fetchSubcategoryInfo()
      } else if (transaction.custom_category_id) {
        // If only category is set (no subcategory)
        setSelectedCategoryId(String(transaction.custom_category_id))
        setSelectedSubcategoryId(null)
      } else {
        // No category or subcategory set
        setSelectedCategoryId(null)
        setSelectedSubcategoryId(null)
      }
      setNotes(transaction.notes || "")
    } else {
      // Reset form when no transaction
      setSelectedCategoryId(null)
      setSelectedSubcategoryId(null)
      setTransactionType("expense")
      setNotes("")
    }
  }, [transaction])

  // Fetch subcategories when category is selected
  useEffect(() => {
    const fetchSubcategories = async () => {
      if (selectedCategoryId) {
        try {
          const { data } = await apiClient.get<SubcategoryResponse[]>(`/subcategories/?category_id=${selectedCategoryId}`)
          if (data) setSubcategories(data)
        } catch (err) {
          console.error("Failed to fetch subcategories:", err)
          setSubcategories([])
        }
      } else {
        setSubcategories([])
        setSelectedSubcategoryId(null)
      }
    }
    fetchSubcategories()
  }, [selectedCategoryId])

  const handleSubmit = async () => {
    if (!transaction) return

    setIsSubmitting(true)

    // Determine category_id and subcategory_id based on selection
    // Only expenses can have categories
    let custom_category_id: number | null = null
    let custom_subcategory_id: number | null = null

    if (transactionType === "expense") {
      if (selectedSubcategoryId) {
        // If subcategory is selected, get its parent category_id and use both
        const subcategory = subcategories.find((s) => s.id === selectedSubcategoryId)
        if (subcategory) {
          custom_subcategory_id = Number.parseInt(selectedSubcategoryId)
          custom_category_id = typeof subcategory.category_id === "string" 
            ? Number.parseInt(subcategory.category_id, 10) 
            : subcategory.category_id
        }
      } else if (selectedCategoryId) {
        // If only category is selected (no subcategory), set category_id and null subcategory_id
        custom_category_id = Number.parseInt(selectedCategoryId)
        custom_subcategory_id = null
      }
    }
    // For income and transfers, categories are always null

    const result = await updateTransaction(transaction.id, {
      transaction_type: transactionType,
      custom_category_id,
      custom_subcategory_id,
      notes: notes || null,
    })

    if (result) {
      toast({
        title: "Success",
        description: "Transaction categorized successfully",
      })
      onOpenChange(false)
      await fetchTransactions()
    } else {
      toast({
        title: "Error",
        description: "Failed to categorize transaction",
        variant: "destructive",
      })
    }

    setIsSubmitting(false)
  }

  const handleCategoryChange = (value: string) => {
    if (value === "__clear__") {
      setSelectedCategoryId(null)
      setSelectedSubcategoryId(null)
    } else {
      setSelectedCategoryId(value || null)
      setSelectedSubcategoryId(null) // Clear subcategory when category changes
    }
  }

  if (!transaction) return null

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen)
        if (!isOpen) {
          // Reset form when dialog closes
          setSelectedCategoryId(null)
          setSelectedSubcategoryId(null)
          setNotes("")
        }
      }}
    >
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Categorize Transaction</DialogTitle>
          <DialogDescription>
            {transaction.merchant_name || transaction.name} - ${Math.abs(Number(transaction.amount)).toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="transaction_type">Transaction Type</Label>
            <Select
              value={transactionType}
              onValueChange={(value) => {
                setTransactionType(value)
                // Clear categories if changing from expense to non-expense
                if (value !== "expense") {
                  setSelectedCategoryId(null)
                  setSelectedSubcategoryId(null)
                }
              }}
            >
              <SelectTrigger id="transaction_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {transactionType === "expense" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category (Optional)</Label>
              <Select value={selectedCategoryId || undefined} onValueChange={handleCategoryChange}>
                <SelectTrigger id="category">
                  {selectedCategoryId ? (
                    (() => {
                      const selectedCategory = categories.find((cat) => String(cat.id) === String(selectedCategoryId))
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
                  {categories.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">No categories available</div>
                  ) : (
                    <>
                      <SelectItem value="__clear__">
                        <span className="text-muted-foreground">Clear selection</span>
                      </SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={String(category.id)}>
                          {category.icon && <span className="mr-2">{category.icon}</span>}
                          {category.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subcategory">Subcategory (Optional)</Label>
              <Select
                value={selectedSubcategoryId || undefined}
                onValueChange={(value) => {
                  if (value === "__clear__") {
                    setSelectedSubcategoryId(null)
                  } else {
                    setSelectedSubcategoryId(value || null)
                    // Auto-populate parent category when subcategory is selected
                    if (value) {
                      const selectedSubcategory = subcategories.find((s) => s.id === value)
                      if (selectedSubcategory) {
                        setSelectedCategoryId(String(selectedSubcategory.category_id))
                      }
                    }
                  }
                }}
              >
                <SelectTrigger id="subcategory">
                  {selectedSubcategoryId ? (
                    (() => {
                      const selectedSubcategory = subcategories.find((sub) => String(sub.id) === String(selectedSubcategoryId))
                      return selectedSubcategory ? (
                        <span className="flex items-center text-foreground">
                          {selectedSubcategory.icon && <span className="mr-2">{selectedSubcategory.icon}</span>}
                          <span>{selectedSubcategory.name}</span>
                        </span>
                      ) : (
                        <SelectValue placeholder={selectedCategoryId ? "Select subcategory" : "Select category first"} />
                      )
                    })()
                  ) : (
                    <SelectValue placeholder="Select subcategory" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {subcategories.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">No subcategories available</div>
                  ) : (
                    <>
                      <SelectItem value="__clear__">
                        <span className="text-muted-foreground">Clear selection</span>
                      </SelectItem>
                      {subcategories.map((subcategory) => (
                        <SelectItem key={subcategory.id} value={String(subcategory.id)}>
                          {subcategory.icon && <span className="mr-2">{subcategory.icon}</span>}
                          {subcategory.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Input
              id="notes"
              placeholder="Add notes about this transaction"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting} className="bg-emerald-500 hover:bg-emerald-600">
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}