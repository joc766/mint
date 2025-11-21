"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

export function MonthSelector({ onMonthChange }) {
  const [date, setDate] = useState(new Date())

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  const currentMonthYear = `${monthNames[date.getMonth()]} ${date.getFullYear()}`

  const goToPreviousMonth = () => {
    const newDate = new Date(date)
    newDate.setMonth(newDate.getMonth() - 1)
    setDate(newDate)
    onMonthChange(newDate)
  }

  const goToNextMonth = () => {
    const newDate = new Date(date)
    newDate.setMonth(newDate.getMonth() + 1)
    setDate(newDate)
    onMonthChange(newDate)
  }

  const handleCalendarSelect = (newDate) => {
    // Set day to 1 to just select the month
    const selectedDate = new Date(newDate.getFullYear(), newDate.getMonth(), 1)
    setDate(selectedDate)
    onMonthChange(selectedDate)
  }

  return (
    <div className="flex items-center space-x-2">
      <Button variant="outline" size="icon" onClick={goToPreviousMonth} aria-label="Previous month">
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="min-w-[180px]">
            {currentMonthYear}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleCalendarSelect}
            initialFocus
            // Show only month and year view
            showOutsideDays={false}
            ISOWeek={false}
            captionLayout="dropdown-buttons"
            fromYear={2020}
            toYear={2030}
          />
        </PopoverContent>
      </Popover>

      <Button
        variant="outline"
        size="icon"
        onClick={goToNextMonth}
        aria-label="Next month"
        disabled={date.getMonth() === new Date().getMonth() && date.getFullYear() === new Date().getFullYear()}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
