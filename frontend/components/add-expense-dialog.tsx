"use client"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useTransactions } from "@/contexts/transactions-context"
import { useCategories } from "@/contexts/categories-context"
import { useToast } from "@/hooks/use-toast"
import { apiClient } from "@/lib/api-client"
import { BudgetCreatedDialog } from "@/components/budget-created-dialog"
import type { SubcategoryResponse } from "@/lib/types"

const formSchema = z.object({
  amount: z.coerce.number().positive("Amount must be positive"),
  name: z.string().min(1, "Please enter a name"),
  date: z.date(),
  merchant_name: z.string().optional(),
  category_id: z.string().optional(),
  subcategory_id: z.string().optional(),
  notes: z.string().optional(),
})

export function AddExpenseDialog({ 
  open, 
  onOpenChange,
  defaultDate
}: { 
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultDate?: Date
}) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: undefined,
      name: "",
      date: defaultDate || new Date(),
      merchant_name: "",
      category_id: "",
      subcategory_id: "",
      notes: "",
    },
  })

  const { createTransaction, fetchTransactions } = useTransactions()
  const { categories } = useCategories()
  const { toast } = useToast()
  const [subcategories, setSubcategories] = useState<SubcategoryResponse[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [budgetCreatedDialogOpen, setBudgetCreatedDialogOpen] = useState(false)
  const [budgetInfo, setBudgetInfo] = useState<{ year: number; month: number } | null>(null)

  // Fetch subcategories - filter by category if selected, otherwise show all
  useEffect(() => {
    const fetchSubcategories = async () => {
      try {
        const endpoint = selectedCategoryId 
          ? `/subcategories/?category_id=${selectedCategoryId}`
          : `/subcategories/`
        const { data } = await apiClient.get<SubcategoryResponse[]>(endpoint)
        if (data) setSubcategories(data)
      } catch (err) {
        console.error("Failed to fetch subcategories:", err)
        setSubcategories([])
      }
    }
    fetchSubcategories()
  }, [selectedCategoryId])

  // Reset subcategory when category changes
  const categoryId = form.watch("category_id")
  useEffect(() => {
    setSelectedCategoryId(categoryId || null)
    if (!categoryId) {
      form.setValue("subcategory_id", "")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId])

  // Update date when dialog opens with a new defaultDate
  useEffect(() => {
    if (open && defaultDate) {
      form.setValue("date", defaultDate)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultDate])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    // Determine category_id and subcategory_id based on selection
    let custom_category_id: number | null = null
    let custom_subcategory_id: number | null = null

    if (values.subcategory_id && values.subcategory_id !== "") {
      // If subcategory is selected, get its parent category_id
      const subcategory = subcategories.find((s) => {
        const sId = typeof s.id === "string" ? s.id : String(s.id)
        return sId === values.subcategory_id
      })
      if (subcategory) {
        custom_subcategory_id = typeof subcategory.id === "string" 
          ? Number.parseInt(subcategory.id, 10) 
          : subcategory.id
        custom_category_id = typeof subcategory.category_id === "string" 
          ? Number.parseInt(subcategory.category_id, 10) 
          : subcategory.category_id
      }
    } else if (values.category_id && values.category_id !== "") {
      // If only category is selected (no subcategory)
      custom_category_id = Number.parseInt(values.category_id)
      custom_subcategory_id = null
    }

    // Make amount negative for expenses
    const expenseAmount = -Math.abs(values.amount)

    const result = await createTransaction({
      account_id: null,
      amount: expenseAmount,
      name: values.name,
      date: values.date.toISOString().split("T")[0],
      merchant_name: values.merchant_name || null,
      custom_category_id,
      custom_subcategory_id,
      notes: values.notes || null,
    })

    if (result) {
      toast({
        title: "Success",
        description: "Expense added successfully",
      })
      onOpenChange(false)
      form.reset()
      setSelectedCategoryId(null)
      setSubcategories([])
      // Refresh transactions
      await fetchTransactions()
      
      // Show budget created dialog if a budget was created
      if (result.budget_created && result.budget_year && result.budget_month) {
        setBudgetInfo({ year: result.budget_year, month: result.budget_month })
        setBudgetCreatedDialogOpen(true)
      }
    } else {
      toast({
        title: "Error",
        description: "Failed to add expense",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen)
      if (!isOpen) {
        // Reset form and state when dialog closes
        form.reset()
        setSelectedCategoryId(null)
        setSubcategories([])
      }
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Expense</DialogTitle>
          <DialogDescription>Enter the details of your expense below.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5">$</span>
                      <Input placeholder="0.00" className="pl-7" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Grocery Shopping" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category (Optional)</FormLabel>
                    <Select
                      value={field.value || undefined}
                      onValueChange={(value) => {
                        if (value === "__clear__") {
                          field.onChange("")
                          form.setValue("subcategory_id", "") // Clear subcategory when category is cleared
                        } else {
                          field.onChange(value || "")
                          if (value) {
                            form.setValue("subcategory_id", "") // Clear subcategory when category changes
                          }
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          {field.value && field.value !== "" ? (
                            (() => {
                              const selectedCategory = categories.find((cat) => String(cat.id) === String(field.value))
                              return selectedCategory ? (
                                <span className="flex items-center text-foreground">
                                  {selectedCategory.icon && <span className="mr-2">{selectedCategory.icon}</span>}
                                  <span>{selectedCategory.name}</span>
                                </span>
                              ) : (
                                <SelectValue placeholder="Select category (optional)" />
                              )
                            })()
                          ) : (
                            <SelectValue placeholder="Select category (optional)" />
                          )}
                        </SelectTrigger>
                      </FormControl>
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subcategory_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subcategory (Optional)</FormLabel>
                    <Select
                      value={field.value || undefined}
                      onValueChange={(value) => {
                        if (value === "__clear__") {
                          field.onChange("")
                        } else {
                          field.onChange(value || "")
                          // Auto-populate parent category when subcategory is selected
                          if (value) {
                            const selectedSubcategory = subcategories.find((s) => s.id === value)
                            if (selectedSubcategory) {
                              form.setValue("category_id", String(selectedSubcategory.category_id))
                              setSelectedCategoryId(String(selectedSubcategory.category_id))
                            }
                          }
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          {field.value && field.value !== "" ? (
                            (() => {
                              const selectedSubcategory = subcategories.find((sub) => String(sub.id) === String(field.value))
                              return selectedSubcategory ? (
                                <span className="flex items-center text-foreground">
                                  {selectedSubcategory.icon && <span className="mr-2">{selectedSubcategory.icon}</span>}
                                  <span>{selectedSubcategory.name}</span>
                                </span>
                              ) : (
                                <SelectValue placeholder={selectedCategoryId ? "Select subcategory (optional)" : "Select category first"} />
                              )
                            })()
                          ) : (
                            <SelectValue placeholder="Select subcategory (optional)" />
                          )}
                        </SelectTrigger>
                      </FormControl>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant={"outline"} className="pl-3 text-left font-normal">
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Add notes about this expense" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600">
                Add Expense
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
      {budgetInfo && (
        <BudgetCreatedDialog
          open={budgetCreatedDialogOpen}
          onOpenChange={setBudgetCreatedDialogOpen}
          year={budgetInfo.year}
          month={budgetInfo.month}
        />
      )}
    </Dialog>
  )
}
