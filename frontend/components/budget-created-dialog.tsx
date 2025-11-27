"use client"

import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface BudgetCreatedDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  year: number
  month: number
}

export function BudgetCreatedDialog({ open, onOpenChange, year, month }: BudgetCreatedDialogProps) {
  const router = useRouter()

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  const monthName = monthNames[month - 1] || "Unknown"

  const handleEditBudget = () => {
    onOpenChange(false)
    router.push(`/budget?year=${year}&month=${month}`)
  }

  const handleContinue = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">🎉</span>
            <span>New Budget Created!</span>
          </DialogTitle>
          <DialogDescription className="pt-4 space-y-3">
            <p>
              A new budget for <span className="font-semibold">{monthName} {year}</span> has been automatically 
              created from your default budget template.
            </p>
            <p>
              Would you like to edit this month&apos;s budget now, or continue with the default allocations?
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleContinue}
            className="w-full sm:w-auto"
          >
            Continue with Default
          </Button>
          <Button 
            type="button" 
            onClick={handleEditBudget}
            className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600"
          >
            Edit Budget Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
