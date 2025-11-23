"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useCurrency } from "@/contexts/currency-context"

const formSchema = z.object({
  budget: z.coerce.number().min(1, {
    message: "Budget must be at least 1.",
  }),
})

interface CategoryBudgetFormProps {
  category: string
  categoryId: string
  currentBudget: number
  onSave: (categoryId: string, budget: number) => void
  children: React.ReactNode
}

export function CategoryBudgetForm({ category, categoryId, currentBudget, onSave, children }: CategoryBudgetFormProps) {
  const { currency } = useCurrency()
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      budget: currentBudget,
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    onSave(categoryId, values.budget)
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit {category} Budget</DialogTitle>
          <DialogDescription>Set your monthly budget for {category.toLowerCase()} expenses.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="budget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5">{currency.symbol}</span>
                      <Input placeholder="0.00" className="pl-7" {...field} />
                    </div>
                  </FormControl>
                  <FormDescription>This is your monthly budget limit for {category.toLowerCase()}.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Save changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
