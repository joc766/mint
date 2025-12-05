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
import { useTransactions } from "@/contexts/transactions-context"
import { useToast } from "@/hooks/use-toast"

interface BulkTransactionTypeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transactionIds: number[]
  onSuccess: () => void
}

export function BulkTransactionTypeDialog({
  open,
  onOpenChange,
  transactionIds,
  onSuccess,
}: BulkTransactionTypeDialogProps) {
  const { updateTransaction } = useTransactions()
  const { toast } = useToast()
  const [selectedTransactionType, setSelectedTransactionType] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedTransactionType(null)
    }
  }, [open])

  const handleSubmit = async () => {
    if (transactionIds.length === 0) return

    setIsSubmitting(true)

    try {
      // Update all selected transactions
      const updatePromises = transactionIds.map((id) =>
        updateTransaction(id, {
          transaction_type: selectedTransactionType || null,
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

  const handleTransactionTypeChange = (value: string) => {
    if (value === "__clear__") {
      setSelectedTransactionType(null)
    } else {
      setSelectedTransactionType(value || null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Bulk Update Transaction Type</DialogTitle>
          <DialogDescription>
            Apply transaction type to {transactionIds.length} selected transaction{transactionIds.length !== 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="transaction-type">Transaction Type</Label>
            <Select value={selectedTransactionType || "__clear__"} onValueChange={handleTransactionTypeChange}>
              <SelectTrigger id="transaction-type">
                {selectedTransactionType ? (
                  <span className="flex items-center text-foreground capitalize">
                    {selectedTransactionType}
                  </span>
                ) : (
                  <SelectValue placeholder="Select transaction type" />
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__clear__">
                  <span className="text-muted-foreground">Clear transaction type</span>
                </SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>
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
