"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Filter, X } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

export function ReportFilters({ onFilterChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const [filters, setFilters] = useState({
    timeRange: "6months", // 3months, 6months, 1year, custom
    compareWithPrevious: true,
    groupBy: "month", // month, category, merchant
    chartType: "bar", // bar, line, pie
  })
  const [activeFilters, setActiveFilters] = useState(0)

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)

    // Count active filters (excluding defaults)
    const defaultFilters = {
      timeRange: "6months",
      compareWithPrevious: true,
      groupBy: "month",
      chartType: "bar",
    }

    const activeCount = Object.entries(newFilters).filter(([key, value]) => {
      return value !== defaultFilters[key]
    }).length

    setActiveFilters(activeCount)
    onFilterChange(newFilters)
  }

  const clearFilters = () => {
    const resetFilters = {
      timeRange: "6months",
      compareWithPrevious: true,
      groupBy: "month",
      chartType: "bar",
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
            <span>Customize</span>
            {activeFilters > 0 && (
              <span className="ml-1 rounded-full bg-primary w-5 h-5 text-[10px] flex items-center justify-center text-primary-foreground">
                {activeFilters}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-4" align="start">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium">Customize Reports</h4>
            {activeFilters > 0 && (
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={clearFilters}>
                <X className="h-3.5 w-3.5 mr-1" />
                Reset to default
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {/* Time Range */}
            <div className="space-y-2">
              <Label htmlFor="time-range">Time Range</Label>
              <select
                id="time-range"
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={filters.timeRange}
                onChange={(e) => handleFilterChange("timeRange", e.target.value)}
              >
                <option value="3months">Last 3 Months</option>
                <option value="6months">Last 6 Months</option>
                <option value="1year">Last Year</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            <Separator />

            {/* Group By */}
            <div className="space-y-2">
              <Label htmlFor="group-by">Group By</Label>
              <select
                id="group-by"
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={filters.groupBy}
                onChange={(e) => handleFilterChange("groupBy", e.target.value)}
              >
                <option value="month">Month</option>
                <option value="category">Category</option>
                <option value="merchant">Merchant</option>
              </select>
            </div>

            {/* Chart Type */}
            <div className="space-y-2">
              <Label htmlFor="chart-type">Chart Type</Label>
              <select
                id="chart-type"
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={filters.chartType}
                onChange={(e) => handleFilterChange("chartType", e.target.value)}
              >
                <option value="bar">Bar Chart</option>
                <option value="line">Line Chart</option>
                <option value="pie">Pie Chart</option>
              </select>
            </div>

            <Separator />

            {/* Compare with previous period */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="compare"
                className="h-4 w-4 rounded border-gray-300"
                checked={filters.compareWithPrevious}
                onChange={(e) => handleFilterChange("compareWithPrevious", e.target.checked)}
              />
              <Label htmlFor="compare">Compare with previous period</Label>
            </div>

            <div className="pt-2">
              <Button className="w-full" onClick={() => setIsOpen(false)}>
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {activeFilters > 0 && (
        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={clearFilters}>
          <X className="h-3.5 w-3.5 mr-1" />
          Reset
        </Button>
      )}
    </div>
  )
}
