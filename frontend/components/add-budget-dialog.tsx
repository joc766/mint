"use client"

import { useState } from "react"
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
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useCurrency } from "@/contexts/currency-context"

const formSchema = z.object({
  name: z.string().min(1, "Category name is required"),
  icon: z.string().min(1, "Icon is required"),
  budget: z.coerce.number().min(1, "Budget must be at least 1"),
  color: z.string().min(1, "Color is required"),
})

// Predefined icons and colors for selection
const icons = ["🍔", "✈️", "🎬", "🛍️", "🏠", "🛒", "⚡", "💊", "🎮", "📚", "🚗", "👕"]
const colors = [
  "#FF5F1F", // Orange
  "#4285F4", // Blue
  "#E50914", // Red
  "#FF9900", // Amber
  "#34A853", // Green
  "#84C225", // Light Green
  "#03A9F4", // Light Blue
  "#F44336", // Red
  "#9C27B0", // Purple
  "#3F51B5", // Indigo
  "#795548", // Brown
  "#607D8B", // Gray Blue
]

export function AddBudgetDialog({ open, onOpenChange, onAddBudget }) {
  const { currency } = useCurrency()
  const [selectedIcon, setSelectedIcon] = useState(icons[0])
  const [selectedColor, setSelectedColor] = useState(colors[0])

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      icon: icons[0],
      budget: undefined,
      color: colors[0],
    },
  })

  const onSubmit = (values) => {
    // Generate a unique ID (in a real app, this would come from the backend)
    const newId = `new-${Date.now()}`

    // Create the new budget category
    const newCategory = {
      id: newId,
      name: values.name,
      icon: values.icon,
      budget: values.budget,
      color: values.color,
      spent: 0,
      remaining: values.budget,
      percentUsed: 0,
      isOverspent: false,
    }

    onAddBudget(newCategory)
    onOpenChange(false)
    form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Budget Category</DialogTitle>
          <DialogDescription>Create a new budget category to track your expenses.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Dining Out, Fitness" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon</FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-6 gap-2">
                        {icons.map((icon) => (
                          <div
                            key={icon}
                            className={`w-8 h-8 flex items-center justify-center rounded-md cursor-pointer text-lg ${
                              field.value === icon ? "bg-primary text-primary-foreground" : "bg-muted"
                            }`}
                            onClick={() => {
                              field.onChange(icon)
                              setSelectedIcon(icon)
                            }}
                          >
                            {icon}
                          </div>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-6 gap-2">
                        {colors.map((color) => (
                          <div
                            key={color}
                            className={`w-8 h-8 rounded-md cursor-pointer ${
                              field.value === color ? "ring-2 ring-primary ring-offset-2" : ""
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => {
                              field.onChange(color)
                              setSelectedColor(color)
                            }}
                          />
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="budget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monthly Budget</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5">{currency.symbol}</span>
                      <Input placeholder="0.00" className="pl-7" {...field} />
                    </div>
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
                Add Budget
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
