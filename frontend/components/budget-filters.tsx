"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Filter, X } from "lucide-react"

export interface FilterState {
  showOverspent: boolean
  showUnderBudget: boolean
  sortBy: string
}

export function BudgetFilters({ onFilterChange }: { onFilterChange: (filters: FilterState) => void }) {
  const [_isOpen, setIsOpen] = useState(false)
  const [filters, setFilters] = useState({
    showOverspent: false,
    showUnderBudget: false,
    sortBy: "name", // name, budget, spent, remaining
  })
  const [activeFilters, setActiveFilters] = useState(0)

  const handleFilterChange = (key: keyof FilterState, value: string | boolean) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)

    // Count active filters (excluding sortBy which is always active)
    const activeCount = Object.entries(newFilters).filter(([k, v]) => k !== "sortBy" && v === true).length

    setActiveFilters(activeCount)
    onFilterChange(newFilters)
  }

  const clearFilters = () => {
    const resetFilters = {
      showOverspent: false,
      showUnderBudget: false,
      sortBy: "name",
    }
    setFilters(resetFilters)
    setActiveFilters(0)
    onFilterChange(resetFilters)
  }

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1">
            <Filter className="h-3.5 w-3.5" />
            <span>Filter</span>
            {activeFilters > 0 && (
              <span className="ml-1 rounded-full bg-primary w-5 h-5 text-[10px] flex items-center justify-center text-primary-foreground">
                {activeFilters}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-4" align="start">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium">Filter Budgets</h4>
            {activeFilters > 0 && (
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={clearFilters}>
                <X className="h-3.5 w-3.5 mr-1" />
                Clear filters
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {/* Budget status filters */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Budget Status</label>
              <div className="flex flex-col gap-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="overspent"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={filters.showOverspent}
                    onChange={(e) => handleFilterChange("showOverspent", e.target.checked)}
                  />
                  <label htmlFor="overspent" className="text-sm">
                    Show overspent categories
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="underbudget"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={filters.showUnderBudget}
                    onChange={(e) => handleFilterChange("showUnderBudget", e.target.checked)}
                  />
                  <label htmlFor="underbudget" className="text-sm">
                    Show under budget categories
                  </label>
                </div>
              </div>
            </div>

            {/* Sort options */}
            <div className="space-y-2">
              <label htmlFor="sort-by" className="text-sm font-medium">
                Sort By
              </label>
              <select
                id="sort-by"
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={filters.sortBy}
                onChange={(e) => handleFilterChange("sortBy", e.target.value)}
              >
                <option value="name">Category Name</option>
                <option value="budget">Budget Amount (High to Low)</option>
                <option value="spent">Amount Spent (High to Low)</option>
                <option value="remaining">Remaining Amount (High to Low)</option>
                <option value="percentage">Percentage Used (High to Low)</option>
              </select>
            </div>

            <div className="pt-2">
              <Button className="w-full" onClick={() => setIsOpen(false)}>
                Apply Filters
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {activeFilters > 0 && (
        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={clearFilters}>
          <X className="h-3.5 w-3.5 mr-1" />
          Clear
        </Button>
      )}
    </div>
  )
}
