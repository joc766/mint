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
import { useCategories } from "@/contexts/categories-context"
import { useTransactions } from "@/contexts/transactions-context"
import { useToast } from "@/hooks/use-toast"
import { apiClient } from "@/lib/api-client"
import type { SubcategoryResponse } from "@/lib/types"

interface BulkCategorizeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transactionIds: number[]
  onSuccess: () => void
}

export function BulkCategorizeDialog({
  open,
  onOpenChange,
  transactionIds,
  onSuccess,
}: BulkCategorizeDialogProps) {
  const { categories } = useCategories()
  const { updateTransaction } = useTransactions()
  const { toast } = useToast()
  const [subcategories, setSubcategories] = useState<SubcategoryResponse[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedCategoryId(null)
      setSelectedSubcategoryId(null)
    }
  }, [open])

  const handleSubmit = async () => {
    if (transactionIds.length === 0) return

    // Determine category_id and subcategory_id based on selection
    let custom_category_id: number | null = null
    let custom_subcategory_id: number | null = null

    if (selectedSubcategoryId) {
      // If subcategory is selected, get its parent category_id and use both
      const subcategory = subcategories.find((s) => {
        const sId = typeof s.id === "string" ? Number.parseInt(s.id, 10) : s.id
        return String(sId) === selectedSubcategoryId
      })
      if (subcategory) {
        custom_subcategory_id = typeof subcategory.id === "string" 
          ? Number.parseInt(subcategory.id, 10) 
          : subcategory.id
        custom_category_id = typeof subcategory.category_id === "string" 
          ? Number.parseInt(subcategory.category_id, 10) 
          : subcategory.category_id
      }
    } else if (selectedCategoryId) {
      // If only category is selected (no subcategory), set category_id and null subcategory_id
      custom_category_id = Number.parseInt(selectedCategoryId, 10)
      custom_subcategory_id = null
    } else {
      // No category or subcategory selected - clear both
      custom_category_id = null
      custom_subcategory_id = null
    }

    setIsSubmitting(true)

    try {
      // Update all selected transactions
      const updatePromises = transactionIds.map((id) =>
        updateTransaction(id, {
          custom_category_id,
          custom_subcategory_id,
        })
      )

      const results = await Promise.all(updatePromises)
      const successCount = results.filter((r) => r !== null).length
      const failureCount = transactionIds.length - successCount

      if (successCount > 0) {
        toast({
          title: "Success",
          description: `Updated ${successCount} transaction${successCount !== 1 ? "s" : ""}${
            failureCount > 0 ? ` (${failureCount} failed)` : ""
          }`,
        })
        onSuccess()
        onOpenChange(false)
      } else {
        toast({
          title: "Error",
          description: "Failed to update transactions",
          variant: "destructive",
        })
      }
    } catch {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
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

  const handleSubcategoryChange = (value: string) => {
    if (value === "__clear__") {
      setSelectedSubcategoryId(null)
    } else {
      setSelectedSubcategoryId(value || null)
      // Auto-populate parent category when subcategory is selected
      if (value) {
        const selectedSubcategory = subcategories.find((s) => {
          const sId = typeof s.id === "string" ? Number.parseInt(s.id, 10) : s.id
          return String(sId) === value
        })
        if (selectedSubcategory) {
          setSelectedCategoryId(String(selectedSubcategory.category_id))
        }
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Bulk Categorize Transactions</DialogTitle>
          <DialogDescription>
            Apply category and subcategory to {transactionIds.length} selected transaction{transactionIds.length !== 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category (Optional)</Label>
              <Select value={selectedCategoryId || "__clear__"} onValueChange={handleCategoryChange}>
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
                        <span className="text-muted-foreground">Clear category</span>
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
                value={selectedSubcategoryId || "__clear__"}
                onValueChange={handleSubcategoryChange}
                disabled={!selectedCategoryId}
              >
                <SelectTrigger id="subcategory">
                  {selectedSubcategoryId ? (
                    (() => {
                      const selectedSubcategory = subcategories.find((sub) => {
                        const sId = typeof sub.id === "string" ? Number.parseInt(sub.id, 10) : sub.id
                        return String(sId) === selectedSubcategoryId
                      })
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
                    <SelectValue placeholder={selectedCategoryId ? "Select subcategory" : "Select category first"} />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {subcategories.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      {selectedCategoryId ? "No subcategories available" : "Select a category first"}
                    </div>
                  ) : (
                    <>
                      <SelectItem value="__clear__">
                        <span className="text-muted-foreground">Clear subcategory</span>
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
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting} className="bg-emerald-500 hover:bg-emerald-600">
            {isSubmitting ? `Updating ${transactionIds.length} transactions...` : `Apply to ${transactionIds.length} transaction${transactionIds.length !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
